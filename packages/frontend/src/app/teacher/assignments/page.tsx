'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { assignmentsApi } from '@/lib/api/resources';
import type { Assignment } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  completed: 'info',
  overdue: 'danger',
};

interface FormState {
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  availableFrom: string;
  class: string;
}

const EMPTY_FORM: FormState = { title: '', description: '', subject: '', dueDate: '', availableFrom: '', class: '' };

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => {
    return assignedSubjects.map((s) => ({ value: s, label: s }));
  }, [assignedSubjects]);

  async function load() {
    setLoading(true);
    try {
      const data = await assignmentsApi.getAll();
      setAssignments(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subject || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q)
    );
  }, [assignments, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
    });
    setModalOpen(true);
  }

  function openEdit(assignment: Assignment) {
    setEditing(assignment);
    setForm({
      title: assignment.title,
      description: assignment.description || '',
      subject: assignment.subject || '',
      dueDate: assignment.dueDate ? assignment.dueDate.split('T')[0] : '',
      availableFrom: assignment.availableFrom ? String(assignment.availableFrom).slice(0, 16) : '',
      class: assignment.class || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        subject: form.subject || undefined,
        dueDate: form.dueDate || undefined,
        availableFrom: form.availableFrom || undefined,
        class: form.class || undefined,
      };
      if (editing) {
        await assignmentsApi.update(editing.id, payload);
        toast.success('Assignment updated');
      } else {
        await assignmentsApi.create(payload);
        toast.success('Assignment created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(assignment: Assignment) {
    if (!confirm(`Delete assignment "${assignment.title}"?`)) return;
    try {
      await assignmentsApi.delete(assignment.id);
      toast.success('Assignment deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<Assignment>[] = [
    { header: 'Title', accessor: (a) => <span className="font-medium text-foreground">{a.title}</span> },
    { header: 'Subject', accessor: (a) => a.subject || '—' },
    { header: 'Class', accessor: (a) => a.class || '—' },
    { header: 'Due Date', accessor: (a) => formatDate(a.dueDate) },
    { header: 'Available From', accessor: (a) => a.availableFrom ? formatDate(a.availableFrom) : <span className="text-text-muted text-xs">Immediate</span> },
    {
      header: 'Status',
      accessor: (a) => <Badge tone={STATUS_TONE[a.status || ''] || 'neutral'}>{a.status || 'active'}</Badge>,
    },
    {
      header: 'Actions',
      accessor: (a) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(a)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(a)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-red-600"
            aria-label="Delete"
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
      title="Assignments"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search assignments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Assignment
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(a) => a.id} loading={loading} emptyMessage="No assignments found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Assignment' : 'Add Assignment'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subject"
              options={subjectOptions}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={assignedSubjects.length === 0 ? "No assigned subjects" : "Select subject"}
            />
            <Input
              label="Class"
              placeholder="e.g. SS3"
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
            <Input
              label="Release Date/Time"
              type="datetime-local"
              value={form.availableFrom}
              onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))}
              hint="Students will only see this assignment after this time"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
