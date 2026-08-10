'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Search, Pencil, Trash2, ShieldOff, ShieldCheck, UserPlus, School } from 'lucide-react';
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
import type { SchoolClass, Subject, User } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

interface FormState {
  name: string;
  email: string;
  password: string;
  classTeacherOf: string;
  assignedSubjects: string[];
}
const EMPTY_FORM: FormState = { name: '', email: '', password: '', classTeacherOf: '', assignedSubjects: [] };

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [users, classList, subjectList] = await Promise.all([
        adminApi.getUsers({ role: 'teacher' }),
        adminApi.getClasses(),
        adminApi.getSubjects(),
      ]);
      setTeachers(users);
      setClasses(classList);
      setSubjects(subjectList);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load teachers');
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
    if (!search) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
  }, [teachers, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(teacher: User) {
    setEditing(teacher);
    setForm({
      name: teacher.name,
      email: teacher.email,
      password: '',
      classTeacherOf: teacher.classTeacherOf || '',
      assignedSubjects: Array.isArray(teacher.assignedSubjects) ? teacher.assignedSubjects : [],
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
          classTeacherOf: form.classTeacherOf || null,
          isClassTeacher: !!form.classTeacherOf,
          assignedSubjects: form.assignedSubjects,
        });
        toast.success('Teacher updated');
      } else {
        await adminApi.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'teacher',
          classTeacherOf: form.classTeacherOf || null,
          isClassTeacher: !!form.classTeacherOf,
          assignedSubjects: form.assignedSubjects,
        });
        toast.success('Teacher created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  }

  async function onSuspend(teacher: User) {
    try {
      await (teacher.isSuspended ? adminApi.unsuspendUser(teacher.id) : adminApi.suspendUser(teacher.id));
      toast.success(teacher.isSuspended ? 'Teacher reactivated' : 'Teacher suspended');
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
      toast.success('Teacher deleted');
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
      header: 'Teacher',
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 shrink-0">
            {u.initials || initialsOf(u.name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{u.name}</p>
            <p className="text-xs text-text-secondary">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Subjects',
      accessor: (u) =>
        u.assignedSubjects && u.assignedSubjects.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {u.assignedSubjects.slice(0, 3).map((s) => (
              <Badge key={s} tone="info">{s}</Badge>
            ))}
            {u.assignedSubjects.length > 3 && (
              <Badge tone="neutral">+{u.assignedSubjects.length - 3}</Badge>
            )}
          </div>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        ),
    },
    {
      header: 'Class Teacher Of',
      accessor: (u) =>
        u.isClassTeacher && u.classTeacherOf ? (
          <Badge tone="maroon">{u.classTeacherOf}</Badge>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        ),
    },
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
      title="Teachers"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="sm:max-w-xs"
            />
            {!loading && (
              <span className="flex items-center text-sm text-text-secondary">
                {filtered.length} teacher{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button onClick={openCreate} icon={<UserPlus className="h-4 w-4" />}>
            Add Teacher
          </Button>
        </div>

        <Table
          columns={columns}
          data={filtered}
          keyFor={(u) => u.id}
          loading={loading}
          emptyMessage="No teachers found."
          emptyIcon={<School className="h-10 w-10" />}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Teacher' : 'Add Teacher'}
        description={editing ? 'Update teacher information' : 'Create a new teacher account'}
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
          <Select
            label="Class Teacher Of"
            options={classOptions}
            value={form.classTeacherOf}
            onChange={(e) => setForm((f) => ({ ...f, classTeacherOf: e.target.value }))}
            placeholder="Not a class teacher"
            hint="Assign this teacher as the class teacher for a specific class"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Assigned Subjects
              <span className="ml-1 text-text-muted font-normal">({form.assignedSubjects.length}/10)</span>
            </label>
            <p className="text-xs text-text-muted">Select the subjects this teacher handles (max 10)</p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-card-2 p-3">
              {subjects.map((s) => {
                const checked = form.assignedSubjects.includes(s.name);
                const atLimit = !checked && form.assignedSubjects.length >= 10;
                return (
                  <label key={s.id} className={`flex items-center gap-2 text-sm cursor-pointer ${atLimit ? 'text-text-muted' : 'text-foreground'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atLimit}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          assignedSubjects: e.target.checked
                            ? [...f.assignedSubjects, s.name]
                            : f.assignedSubjects.filter((n) => n !== s.name),
                        }));
                      }}
                      className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon/20 disabled:opacity-50"
                    />
                    {s.name}
                  </label>
                );
              })}
              {subjects.length === 0 && (
                <p className="text-xs text-text-muted col-span-2">No subjects available</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Teacher"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Teacher"
        danger
        loading={deleting}
      />
    </DashboardShell>
  );
}
