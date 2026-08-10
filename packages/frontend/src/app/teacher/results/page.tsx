'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { resultsApi, examsApi } from '@/lib/api/resources';
import { teacherApi } from '@/lib/api/resources';
import { useAuth } from '@/lib/auth/AuthContext';
import type { ResultRecord, Exam, User } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

function getGrade(score: number, total: number): string {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function getGradeTone(grade: string): 'success' | 'info' | 'warning' | 'danger' {
  if (grade === 'A' || grade === 'B') return 'success';
  if (grade === 'C') return 'info';
  if (grade === 'D') return 'warning';
  return 'danger';
}

interface FormState {
  studentId: string;
  examId: string;
  subject: string;
  score: string;
  totalScore: string;
  remarks: string;
}

const EMPTY_FORM: FormState = { studentId: '', examId: '', subject: '', score: '', totalScore: '', remarks: '' };

export default function TeacherResultsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResultRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => {
    return assignedSubjects.map((s) => ({ value: s, label: s }));
  }, [assignedSubjects]);

  async function load() {
    setLoading(true);
    try {
      const [resultsData, examsData] = await Promise.all([
        resultsApi.getAll(),
        examsApi.getAll().catch(() => []),
      ]);
      setResults(resultsData);
      setExams(examsData);

      const teacherClasses = [...(user?.assignedClasses || [])];
      if (user?.isClassTeacher && user?.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const uniqueClasses = Array.from(new Set(teacherClasses));

      if (uniqueClasses.length > 0) {
        try {
          const studentsList = await Promise.all(
            uniqueClasses.map((cls) => teacherApi.getMyClass(cls).catch(() => []))
          );
          const allStudents = studentsList.flat();
          const seenIds = new Set();
          const uniqueStudents = allStudents.filter((student) => {
            if (seenIds.has(student.id)) return false;
            seenIds.add(student.id);
            return true;
          });
          setStudents(uniqueStudents);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  const subjects = useMemo(() => {
    const set = new Set(results.map((r) => r.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (subjectFilter && r.subject !== subjectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (r.studentName || '').toLowerCase();
        const subject = (r.subject || '').toLowerCase();
        return name.includes(q) || subject.includes(q);
      }
      return true;
    });
  }, [results, search, subjectFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
    });
    setModalOpen(true);
  }

  function openEdit(result: ResultRecord) {
    setEditing(result);
    setForm({
      studentId: result.studentId,
      examId: result.examId || '',
      subject: result.subject,
      score: String(result.score),
      totalScore: String(result.totalScore),
      remarks: result.remarks || '',
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const score = Number(form.score);
      const totalScore = Number(form.totalScore);
      const grade = getGrade(score, totalScore);
      const payload = {
        studentId: form.studentId,
        examId: form.examId || undefined,
        subject: form.subject,
        score,
        totalScore,
        grade,
        remarks: form.remarks || undefined,
      };
      if (editing) {
        await resultsApi.update(editing.id, payload);
        toast.success('Result updated');
      } else {
        await resultsApi.create(payload);
        toast.success('Result created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save result');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(result: ResultRecord) {
    if (!confirm('Delete this result?')) return;
    try {
      await resultsApi.delete(result.id);
      toast.success('Result deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const columns: Column<ResultRecord>[] = [
    {
      header: 'Student',
      accessor: (r) => <span className="font-medium text-foreground">{r.studentName || r.studentId}</span>,
    },
    { header: 'Subject', accessor: (r) => r.subject },
    {
      header: 'Score',
      accessor: (r) => (
        <span className="font-mono font-semibold">{r.score}/{r.totalScore}</span>
      ),
    },
    {
      header: 'Grade',
      accessor: (r) => {
        const grade = r.grade || getGrade(r.score, r.totalScore);
        return <Badge tone={getGradeTone(grade)}>{grade}</Badge>;
      },
    },
    { header: 'Exam', accessor: (r) => r.examTitle || '—' },
    { header: 'Date', accessor: (r) => formatDate(r.date) },
    {
      header: 'Actions',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(r)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(r)}
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
      title="Results"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by student or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="sm:max-w-xs"
            />
            <Select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              options={subjects.map((s) => ({ value: s, label: s }))}
              placeholder="All subjects"
              className="sm:max-w-[160px]"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Result
          </Button>
        </div>

        <Table columns={columns} data={filtered} keyFor={(r) => r.id} loading={loading} emptyMessage="No results found." />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Result' : 'Add Result'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Student"
            required
            options={students.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select student"
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
          />
          <Select
            label="Exam"
            options={exams.map((e) => ({ value: e.id, label: e.title }))}
            placeholder="Select exam"
            value={form.examId}
            onChange={(e) => setForm((f) => ({ ...f, examId: e.target.value }))}
          />
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
              label="Score"
              type="number"
              min={0}
              required
              value={form.score}
              onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
            />
            <Input
              label="Total Score"
              type="number"
              min={1}
              required
              value={form.totalScore}
              onChange={(e) => setForm((f) => ({ ...f, totalScore: e.target.value }))}
            />
          </div>
          <Input
            label="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Add Result'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
