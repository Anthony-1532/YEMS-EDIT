'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api/admin';
import type { Subject } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';

const CATEGORY_OPTIONS = [
  { value: 'junior', label: 'Junior' },
  { value: 'general-senior', label: 'General Senior' },
  { value: 'senior', label: 'Senior' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'science', label: 'Science' },
  { value: 'art', label: 'Art' },
  { value: 'commercial', label: 'Commercial' },
];

interface FormState {
  name: string;
  code: string;
  category: string;
  department: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', code: '', category: 'junior', department: '', description: '' };

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getSubjects();
      setSubjects(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q)
    );
  }, [subjects, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({
      name: subject.name,
      code: subject.code || '',
      category: subject.category,
      department: subject.department || '',
      description: subject.description || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code || undefined,
        category: form.category,
        department: form.department || undefined,
        description: form.description || undefined,
      };
      if (editing) {
        await adminApi.updateSubject(editing.id, payload);
        toast.success('Subject updated');
      } else {
        await adminApi.createSubject(payload);
        toast.success('Subject created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(subject: Subject) {
    if (!confirm(`Delete subject "${subject.name}"?`)) return;
    try {
      await adminApi.deleteSubject(subject.id);
      toast.success('Subject deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<Subject>[] = [
    { header: 'Name', accessor: (s) => <span className="font-medium text-foreground">{s.name}</span> },
    { header: 'Code', accessor: (s) => s.code || '—' },
    { header: 'Category', accessor: (s) => <Badge tone="info">{s.category}</Badge> },
    { header: 'Department', accessor: (s) => s.department || '—' },
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
      title="Subjects"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(s) => s.id} loading={loading} emptyMessage="No subjects found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => setForm((f) => {
              const category = e.target.value;
              return { ...f, category, department: category === 'senior' ? f.department : '' };
            })}
          />
          {form.category === 'senior' && (
            <Select
              label="Department"
              options={DEPARTMENT_OPTIONS}
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
          )}
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
