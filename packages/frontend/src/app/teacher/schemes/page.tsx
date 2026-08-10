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
import { schemesApi } from '@/lib/api/resources';
import type { SchemeOfWork } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface FormState {
  subject: string;
  class: string;
  term: string;
  week: string;
  topic: string;
  content: string;
}

const EMPTY_FORM: FormState = { subject: '', class: '', term: '', week: '', topic: '', content: '' };

export default function TeacherSchemesPage() {
  const { user } = useAuth();
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchemeOfWork | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => {
    return assignedSubjects.map((s) => ({ value: s, label: s }));
  }, [assignedSubjects]);

  async function load() {
    setLoading(true);
    try {
      const data = await schemesApi.getAll();
      setSchemes(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return schemes;
    const q = search.toLowerCase();
    return schemes.filter(
      (s) =>
        (s.subject || '').toLowerCase().includes(q) ||
        (s.topic || '').toLowerCase().includes(q) ||
        (s.class || '').toLowerCase().includes(q)
    );
  }, [schemes, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
    });
    setModalOpen(true);
  }

  function openEdit(scheme: SchemeOfWork) {
    setEditing(scheme);
    setForm({
      subject: scheme.subject || '',
      class: scheme.class || '',
      term: scheme.term || '',
      week: scheme.week ? String(scheme.week) : '',
      topic: scheme.topic || '',
      content: scheme.content || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        subject: form.subject,
        class: form.class || undefined,
        term: form.term || undefined,
        week: form.week ? Number(form.week) : undefined,
        topic: form.topic || undefined,
        content: form.content || undefined,
      };
      if (editing) {
        await schemesApi.update(editing.id, payload);
        toast.success('Scheme updated');
      } else {
        await schemesApi.create(payload);
        toast.success('Scheme created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save scheme');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(scheme: SchemeOfWork) {
    if (!confirm('Delete this scheme?')) return;
    try {
      await schemesApi.delete(scheme.id);
      toast.success('Scheme deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<SchemeOfWork>[] = [
    { header: 'Subject', accessor: (s) => <span className="font-medium text-foreground">{s.subject}</span> },
    { header: 'Topic', accessor: (s) => s.topic || '—' },
    { header: 'Class', accessor: (s) => s.class || '—' },
    { header: 'Term', accessor: (s) => s.term || '—' },
    { header: 'Week', accessor: (s) => s.week ? `Week ${s.week}` : '—' },
    { header: 'Date', accessor: (s) => formatDate((s as Record<string, unknown>).createdAt as string) },
    {
      header: 'Actions',
      accessor: (s) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(s)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(s)}
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
      title="Schemes of Work"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search schemes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Scheme
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(s) => s.id} loading={loading} emptyMessage="No schemes found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Scheme' : 'Add Scheme'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Subject"
            required
            options={subjectOptions}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder={assignedSubjects.length === 0 ? "No assigned subjects" : "Select subject"}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Class"
              placeholder="e.g. SS3"
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
            />
            <Input
              label="Term"
              placeholder="e.g. First Term"
              value={form.term}
              onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            />
          </div>
          <Input
            label="Week"
            type="number"
            min={1}
            value={form.week}
            onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))}
          />
          <Input
            label="Topic"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          />
          <Textarea
            label="Content"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Scheme'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
