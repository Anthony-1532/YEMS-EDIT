'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { ApiError } from '@/lib/api/client';
import { submissionsApi } from '@/lib/api/resources';
import type { Submission } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [opening, setOpening] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await submissionsApi.getAll();
      setSubmissions(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return submissions;
    const query = search.toLowerCase();
    return submissions.filter((submission) => {
      const label = `${submission.studentName || ''} ${submission.studentClass || ''} ${submission.examId || ''}`.toLowerCase();
      return label.includes(query);
    });
  }, [submissions, search]);

  async function openSubmission(id: string) {
    setOpening(true);
    try {
      const data = await submissionsApi.getById(id);
      setSelectedSubmission(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load submission details');
    } finally {
      setOpening(false);
    }
  }

  const columns: Column<Submission>[] = [
    {
      header: 'Student',
      accessor: (submission) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon font-semibold">
            {submission.studentName?.charAt(0) || 'S'}
          </div>
          <div>
            <p className="font-semibold text-foreground">{submission.studentName || 'Student'}</p>
            <p className="text-xs text-text-secondary">{submission.studentClass || 'Class not set'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Assessment',
      accessor: (submission) => <span className="font-semibold text-foreground">{submission.examId || 'Assessment'}</span>,
    },
    {
      header: 'Status',
      accessor: (submission) => (
        <Badge tone={submission.score != null ? 'success' : 'info'}>
          {submission.score != null ? 'Graded' : 'Submitted'}
        </Badge>
      ),
    },
    {
      header: 'Submitted',
      accessor: (submission) => formatDate(submission.submittedAt),
    },
    {
      header: 'Actions',
      accessor: (submission) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openSubmission(submission.id)}
          loading={opening && selectedSubmission?.id === submission.id}
          className="flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" /> View work
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Student Submissions"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">Student submitted work</h2>
          <p className="text-sm text-text-secondary mt-0.5">Review submitted answers and class work from your assigned students.</p>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by student or class"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Table
            columns={columns}
            data={filtered}
            keyFor={(submission) => submission.id}
            loading={loading}
            emptyMessage="No submissions found for your class."
            emptyIcon={<FileText className="h-10 w-10" />}
          />
        </Card>
      </div>

      <Modal open={!!selectedSubmission} onClose={() => setSelectedSubmission(null)} title="Submission Details" size="lg">
        {selectedSubmission && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">Student</p>
                <p className="mt-1 font-semibold text-foreground">{selectedSubmission.studentName || 'Student'}</p>
                <p className="text-sm text-text-secondary">{selectedSubmission.studentClass || 'Class not set'}</p>
              </div>
              <div className="rounded-xl border border-border bg-card-2 p-3">
                <p className="text-xs uppercase tracking-wide text-text-secondary">Assessment</p>
                <p className="mt-1 font-semibold text-foreground">{selectedSubmission.examId || 'Assessment'}</p>
                <p className="text-sm text-text-secondary">Submitted {formatDate(selectedSubmission.submittedAt)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card-2 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Score</p>
                <Badge tone={selectedSubmission.score != null ? 'success' : 'info'}>
                  {selectedSubmission.score != null ? `${selectedSubmission.score}/${selectedSubmission.totalScore || '—'}` : 'Pending'}
                </Badge>
              </div>
              {selectedSubmission.feedback ? <p className="mt-2 text-sm text-text-secondary">{selectedSubmission.feedback}</p> : null}
            </div>

            <div className="rounded-xl border border-border bg-card-2 p-3">
              <p className="text-sm font-semibold text-foreground">Submitted answers</p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-text-secondary">
                {JSON.stringify(selectedSubmission.answers || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
