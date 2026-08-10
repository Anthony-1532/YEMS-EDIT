'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Search, Pencil, Trash2, ShieldOff, ShieldCheck, UserPlus, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api/admin';
import type { SchoolClass, User } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

interface FormState {
  name: string;
  email: string;
  password: string;
  class: string;
  sex: string;
  admissionNo: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', class: '', sex: '', admissionNo: '' };

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [users, classList] = await Promise.all([
        adminApi.getUsers({ role: 'student' }),
        adminApi.getClasses(),
      ]);
      setStudents(users);
      setClasses(classList);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.displayName, label: c.displayName })),
    [classes]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter && s.class !== classFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.admissionNo || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, search, classFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(student: User) {
    setEditing(student);
    setForm({
      name: student.name,
      email: student.email,
      password: '',
      class: student.class || '',
      sex: student.sex || '',
      admissionNo: student.admissionNo || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateUser(editing.id, {
          name: form.name,
          email: form.email,
          class: form.class || null,
          sex: form.sex || null,
          admissionNo: form.admissionNo || null,
        });
        toast.success('Student updated');
      } else {
        await adminApi.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'student',
          class: form.class || null,
          sex: form.sex || null,
          admissionNo: form.admissionNo || null,
        });
        toast.success('Student created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save student');
    } finally {
      setSaving(false);
    }
  }

  async function onSuspend(student: User) {
    try {
      await (student.isSuspended ? adminApi.unsuspendUser(student.id) : adminApi.suspendUser(student.id));
      toast.success(student.isSuspended ? 'Student reactivated' : 'Student suspended');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast.success('Student deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<User>[] = [
    {
      header: 'Student',
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 shrink-0">
            {u.initials || initialsOf(u.name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{u.name}</p>
            <p className="text-xs text-text-secondary">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Admission No.', accessor: (u) => u.admissionNo || '—' },
    { header: 'Class', accessor: (u) => u.class ? <Badge tone="info">{u.class}</Badge> : '—' },
    { header: 'Sex', accessor: (u) => u.sex ? <span className="capitalize">{u.sex}</span> : '—' },
    {
      header: 'Status',
      accessor: (u) => (
        <Badge tone={u.isSuspended ? 'danger' : 'success'} dot>
          {u.isSuspended ? 'Suspended' : 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(u)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-maroon transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSuspend(u)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-amber-600 transition-colors"
            title={u.isSuspended ? 'Reactivate' : 'Suspend'}
          >
            {u.isSuspended ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDeleteTarget(u)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Students"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by name, email or admission no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="sm:max-w-xs"
            />
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              options={classOptions}
              placeholder="All classes"
              className="sm:max-w-[180px]"
            />
            {!loading && (
              <span className="flex items-center text-sm text-text-secondary">
                {filtered.length} student{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button onClick={openCreate} icon={<UserPlus className="h-4 w-4" />}>
            Add Student
          </Button>
        </div>

        <Table
          columns={columns}
          data={filtered}
          keyFor={(u) => u.id}
          loading={loading}
          emptyMessage="No students found."
          emptyIcon={<GraduationCap className="h-10 w-10" />}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Student' : 'Add Student'}
        description={editing ? 'Update student information' : 'Create a new student account'}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          {!editing && (
            <Input
              label="Password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              hint="Min 8 characters, with uppercase, lowercase, number, and special character"
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
              placeholder="Select class"
            />
            <Select
              label="Sex"
              options={SEX_OPTIONS}
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
              placeholder="Select sex"
            />
          </div>
          <Input
            label="Admission No."
            placeholder="e.g. YES/2024/001"
            value={form.admissionNo}
            onChange={(e) => setForm((f) => ({ ...f, admissionNo: e.target.value }))}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Student"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Student"
        danger
        loading={deleting}
      />
    </DashboardShell>
  );
}
