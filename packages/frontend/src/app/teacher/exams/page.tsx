'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { examsApi } from '@/lib/api/resources';
import type { Exam } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

import { useAuth } from '@/lib/auth/AuthContext';

const TYPE_OPTIONS = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Mid-term' },
  { value: 'final', label: 'Final' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  'not-started': 'neutral',
  upcoming: 'info',
  active: 'success',
  completed: 'warning',
  draft: 'neutral',
  published: 'info',
  closed: 'warning',
};

interface FormState {
  title: string;
  description: string;
  type: string;
  duration: string;
  class: string;
  subject: string;
  availableFrom: string;
  showResults: boolean;
}

const EMPTY_FORM: FormState = { title: '', description: '', type: 'quiz', duration: '', class: '', subject: '', availableFrom: '', showResults: false };

export default function TeacherExamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => {
    return assignedSubjects.map((s) => ({ value: s, label: s }));
  }, [assignedSubjects]);

  const classOptions = useMemo(() => {
    const assigned = user?.assignedClasses || [];
    if (assigned.length > 0) {
      return assigned.map((c) => ({ value: c, label: c }));
    }
    return [
      { value: 'JSS1', label: 'JSS1' },
      { value: 'JSS2', label: 'JSS2' },
      { value: 'JSS3', label: 'JSS3' },
      { value: 'SS1', label: 'SS1' },
      { value: 'SS2', label: 'SS2' },
      { value: 'SS3', label: 'SS3' },
    ];
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const data = await examsApi.getAll();
      setExams(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      if (typeFilter && e.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.title.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [exams, search, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
      class: classOptions[0]?.value || '',
    });
    setModalOpen(true);
  }

  function openEdit(exam: Exam) {
    setEditing(exam);
    setForm({
      title: exam.title,
      description: exam.description || '',
      type: exam.type || 'quiz',
      duration: exam.duration ? String(exam.duration) : '',
      class: exam.class || '',
      subject: (exam.subject as string) || '',
      availableFrom: exam.availableFrom ? String(exam.availableFrom).slice(0, 16) : '',
      showResults: !!exam.showResults,
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
        type: form.type,
        duration: form.duration ? Number(form.duration) : undefined,
        class: form.class || undefined,
        subject: form.subject || undefined,
        availableFrom: form.availableFrom || undefined,
        showResults: form.showResults,
      };
      if (editing) {
        await examsApi.update(editing.id, payload);
        toast.success('Exam updated');
      } else {
        await examsApi.create(payload);
        toast.success('Exam created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(exam: Exam) {
    if (!confirm(`Delete exam "${exam.title}"?`)) return;
    try {
      await examsApi.delete(exam.id);
      toast.success('Exam deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<Exam>[] = [
    { header: 'Title', accessor: (e) => <span className="font-medium text-foreground">{e.title}</span> },
    {
      header: 'Type',
      accessor: (e) => <Badge tone="info">{e.type || '—'}</Badge>,
    },
    { header: 'Duration', accessor: (e) => e.duration ? `${e.duration} min` : '—' },
    { header: 'Class', accessor: (e) => e.class || '—' },
    {
      header: 'Status',
      accessor: (e) => <Badge tone={STATUS_TONE[e.status || ''] || 'neutral'}>{e.status || 'not-started'}</Badge>,
    },
    { header: 'Date', accessor: (e) => formatDate(e.startTime) },
    { header: 'Available From', accessor: (e) => e.availableFrom ? formatDate(e.availableFrom) : <span className="text-text-muted text-xs">Immediate</span> },
    {
      header: 'Actions',
      accessor: (e) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/teacher/exams/${e.id}/questions`)}
            className="flex items-center gap-1 font-semibold text-xs py-1 px-2 cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Questions
          </Button>
          <button
            onClick={() => openEdit(e)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(e)}
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
      title="Exams"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search exams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="sm:max-w-xs"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={TYPE_OPTIONS}
              placeholder="All types"
              className="sm:max-w-[160px]"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Exam
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(e) => e.id} loading={loading} emptyMessage="No exams found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Exam' : 'Create Exam'}>
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
              label="Type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Class"
              options={classOptions}
              value={form.class}
              onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
              placeholder="Select class"
              required
            />
            <Select
              label="Subject"
              options={subjectOptions}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={assignedSubjects.length === 0 ? "No assigned subjects" : "Select subject"}
            />
          </div>
          <Input
            label="Release Date/Time"
            type="datetime-local"
            value={form.availableFrom}
            onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))}
            hint="Students can only open the exam after this time"
          />
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card-2 border border-border">
            <input
              type="checkbox"
              id="showResults"
              checked={form.showResults}
              onChange={(e) => setForm((f) => ({ ...f, showResults: e.target.checked }))}
              className="w-4 h-4 rounded text-maroon focus:ring-maroon/20 accent-[#7b1d3c] cursor-pointer"
            />
            <label htmlFor="showResults" className="text-xs font-semibold text-text-secondary cursor-pointer select-none">
              Publish graded results to student portal (Students can see final score/remarks)
            </label>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
