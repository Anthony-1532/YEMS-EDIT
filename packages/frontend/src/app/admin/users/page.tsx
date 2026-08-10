'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2, ShieldOff, ShieldCheck, Users, Eye, EyeOff, LockOpen, Lock } from 'lucide-react';
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
import type { Role, User, SchoolClass, Subject } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'technician', label: 'Technician' },
  { value: 'principal', label: 'Principal' },
  { value: 'hod', label: 'HOD' },
  { value: 'parent', label: 'Parent' },
];

const ROLE_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  admin: 'danger',
  superadmin: 'danger',
  principal: 'danger',
  hod: 'info',
  teacher: 'info',
  accountant: 'warning',
  technician: 'warning',
  student: 'success',
  parent: 'neutral',
};

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
  class: string;
  sex: string;
  admissionNo: string;
  classTeacherOf: string;
  assignedSubjects: string[];
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  class: '',
  sex: '',
  admissionNo: '',
  classTeacherOf: '',
  assignedSubjects: [],
};

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Track which user IDs are locked (from Redis lockout)
  const [lockedUserIds, setLockedUserIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const [userData, classList, subjectList] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getClasses(),
        adminApi.getSubjects(),
      ]);
      setUsers(userData);
      setClasses(classList);
      setSubjects(subjectList);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Poll lockout status for all users every 30 s and when user list refreshes
  useEffect(() => {
    if (users.length === 0) return;
    let cancelled = false;
    async function pollLockouts() {
      const locked = new Set<string>();
      await Promise.all(
        users.map(async (u) => {
          try {
            const status = await adminApi.getLockoutStatus(u.id);
            if (status.locked) locked.add(u.id);
          } catch {
            // ignore individual failures
          }
        })
      );
      if (!cancelled) setLockedUserIds(locked);
    }
    pollLockouts();
    const interval = setInterval(pollLockouts, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [users]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.displayName, label: c.displayName })),
    [classes]
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, search, roleFilter]);

  function openCreate() {
    setEditing(null);
    setShowPassword(false);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setShowPassword(false);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      class: user.class || '',
      sex: user.sex || '',
      admissionNo: user.admissionNo || '',
      classTeacherOf: user.classTeacherOf || '',
      assignedSubjects: Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [],
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (form.role === 'student') {
        payload.class = form.class || null;
        payload.sex = form.sex || null;
        payload.admissionNo = form.admissionNo || null;
        payload.classTeacherOf = null;
        payload.isClassTeacher = false;
        payload.assignedSubjects = [];
      } else if (form.role === 'teacher') {
        payload.class = null;
        payload.sex = null;
        payload.admissionNo = null;
        payload.classTeacherOf = form.classTeacherOf || null;
        payload.isClassTeacher = !!form.classTeacherOf;
        payload.assignedSubjects = form.assignedSubjects;
      } else {
        payload.class = form.class || null;
        payload.sex = null;
        payload.admissionNo = null;
        payload.classTeacherOf = null;
        payload.isClassTeacher = false;
        payload.assignedSubjects = [];
      }

      if (editing) {
        await adminApi.updateUser(editing.id, payload);
        if (form.role !== editing.role) {
          await adminApi.updateUserRole(editing.id, form.role);
        }
        toast.success('User updated');
      } else {
        await adminApi.createUser({
          ...payload,
          password: form.password,
          role: form.role,
        });
        toast.success('User created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function onSuspend(user: User) {
    try {
      await (user.isSuspended ? adminApi.unsuspendUser(user.id) : adminApi.suspendUser(user.id));
      toast.success(user.isSuspended ? 'User reactivated' : 'User suspended');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function onUnlock(user: User) {
    try {
      await adminApi.unlockAccount(user.id);
      setLockedUserIds((prev) => { const next = new Set(prev); next.delete(user.id); return next; });
      toast.success(`Account for ${user.email} has been unlocked.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to unlock account');
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast.success('User deleted');
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
      header: 'User',
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 shrink-0">
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
      header: 'Role',
      accessor: (u) => <Badge tone={ROLE_TONE[u.role] || 'neutral'}>{u.role}</Badge>,
    },
    { header: 'Class', accessor: (u) => u.class || '—' },
    {
      header: 'Status',
      accessor: (u) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tone={u.isSuspended ? 'danger' : 'success'} dot>{u.isSuspended ? 'Suspended' : 'Active'}</Badge>
          {lockedUserIds.has(u.id) && (
            <Badge tone="danger">
              <Lock className="inline h-3 w-3 mr-0.5" />Locked
            </Badge>
          )}
        </div>
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
          {lockedUserIds.has(u.id) && (
            <button
              onClick={() => onUnlock(u)}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-emerald-600 transition-colors"
              title="Unlock Account"
            >
              <LockOpen className="h-4 w-4" />
            </button>
          )}
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
      title="User Management"
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
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={ROLE_OPTIONS}
              placeholder="All roles"
              className="sm:max-w-[160px]"
            />
          </div>
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            Add User
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(u) => u.id} loading={loading} emptyMessage="No users found." emptyIcon={<Users className="h-10 w-10" />} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'} description={editing ? 'Update user account details' : 'Create a new system user'}>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            />
            <Input
              label={editing ? 'New Password (Optional)' : 'Password'}
              type={showPassword ? 'text' : 'password'}
              required={!editing}
              minLength={form.password ? 8 : undefined}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              hint={editing ? 'Leave blank to keep current password' : 'Min 8 characters, with uppercase, lowercase, number, and special character'}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none hover:text-foreground p-0.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          {form.role === 'student' && (
            <>
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
            </>
          )}

          {form.role === 'teacher' && (
            <>
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
            </>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete User"
        message={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete User"
        danger
        loading={deleting}
      />
    </DashboardShell>
  );
}
