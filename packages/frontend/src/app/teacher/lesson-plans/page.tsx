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
import { lessonPlansApi } from '@/lib/api/resources';
import type { LessonPlan } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface FormState {
  subject: string;
  class: string;
  term: string;
  week: string;
  topic: string;
  objectives: string;
  materials: string;
}

const EMPTY_FORM: FormState = {
  subject: '',
  class: '',
  term: '',
  week: '',
  topic: '',
  objectives: '',
  materials: '',
};

export default function TeacherLessonPlansPage() {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => assignedSubjects.map((s) => ({ value: s, label: s })), [assignedSubjects]);

  async function load() {
    setLoading(true);
    try {
      const data = await lessonPlansApi.getAll();
      setLessonPlans(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load lesson plans');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return lessonPlans;
    const q = search.toLowerCase();
    return lessonPlans.filter((plan) => {
      const haystack = [plan.subject, plan.topic, plan.class, plan.term].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [lessonPlans, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
    });
    setModalOpen(true);
  }

  function openEdit(plan: LessonPlan) {
    setEditing(plan);
    setForm({
      subject: plan.subject || '',
      class: plan.class || '',
      term: plan.term || '',
      week: plan.week ? String(plan.week) : '',
      topic: plan.topic || '',
      objectives: plan.objectives || '',
      materials: plan.materials || '',
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
        week: form.week ? String(form.week) : undefined,
        topic: form.topic || undefined,
        objectives: form.objectives || undefined,
        materials: form.materials || undefined,
      };
      if (editing) {
        await lessonPlansApi.update(editing.id, payload);
        toast.success('Lesson plan updated');
      } else {
        await lessonPlansApi.create(payload);
        toast.success('Lesson plan created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save lesson plan');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(plan: LessonPlan) {
    if (!confirm(`Delete lesson plan "${plan.topic}"?`)) return;
    try {
      await lessonPlansApi.delete(plan.id);
      toast.success('Lesson plan deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<LessonPlan>[] = [
    {
      header: 'Topic',
      accessor: (plan) => <span className="font-medium text-foreground">{plan.topic}</span>,
    },
    { header: 'Subject', accessor: (plan) => plan.subject || '—' },
    { header: 'Class', accessor: (plan) => plan.class || '—' },
    { header: 'Term', accessor: (plan) => plan.term || '—' },
    { header: 'Week', accessor: (plan) => plan.week ? `Week ${plan.week}` : '—' },
    { header: 'Date', accessor: (plan) => formatDate(plan.createdAt) },
    {
      header: 'Actions',
      accessor: (plan) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(plan)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(plan)}
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
      title="Lesson Plans"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search lesson plans…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="sm:max-w-xs"
          />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Lesson Plan
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(plan) => plan.id} loading={loading} emptyMessage="No lesson plans found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Lesson Plan' : 'Add Lesson Plan'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Subject"
            required
            options={subjectOptions}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder={assignedSubjects.length === 0 ? 'No assigned subjects' : 'Select subject'}
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
            placeholder="e.g. 1"
            value={form.week}
            onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))}
          />
          <Input
            label="Topic"
            required
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          />
          <Textarea
            label="Objectives"
            value={form.objectives}
            onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
          />
          <Textarea
            label="Materials"
            value={form.materials}
            onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Lesson Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
