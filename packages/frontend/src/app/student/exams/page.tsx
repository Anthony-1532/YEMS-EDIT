'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListChecks, Clock, Search, HelpCircle, Play, CheckCircle, History, ClipboardList, Percent } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { examsApi, resultsApi } from '@/lib/api/resources';
import type { Exam, ResultRecord } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function StudentExamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [search, setSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  useEffect(() => {
    let active = true;
    async function loadExamsAndResults() {
      try {
        const [examsData, resultsData] = await Promise.all([
          examsApi.getAll(),
          resultsApi.getAll(),
        ]);
        if (active) {
          setExams(examsData);
          setResults(resultsData);
        }
      } catch (err) {
        console.error('Failed to load student exams/results:', err);
        toast.error('Failed to load exams');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadExamsAndResults();
    return () => { active = false; };
  }, []);

  // Backend always returns all student results, masking scores when hidden.
  const completedExamIds = useMemo(
    () => new Set(results.filter((r) => r.examId).map((r) => String(r.examId))),
    [results],
  );

  // Assessment ledger — every graded assessment except the synthetic summary row.
  const historyRows = useMemo(
    () =>
      results
        .filter((r) => r.subject !== 'Overall Term Report')
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [results],
  );

  // Available = exams the student has NOT yet sat.
  const availableExams = useMemo(
    () => exams.filter((e) => !completedExamIds.has(e.id)),
    [exams, completedExamIds],
  );

  const averagePct = useMemo(() => {
    const scored = historyRows.filter((r) => r.grade !== 'Hidden' && r.totalScore > 0);
    if (scored.length === 0) return null;
    return scored.reduce((s, r) => s + (r.score / r.totalScore) * 100, 0) / scored.length;
  }, [historyRows]);

  const filteredAvailable = availableExams.filter((exam) =>
    exam.title.toLowerCase().includes(search.toLowerCase()) ||
    (exam.subjectId && exam.subjectId.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredHistory = historyRows.filter((r) =>
    (r.examTitle || '').toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase()),
  );

  function handleStartExam(exam: Exam) {
    if (completedExamIds.has(exam.id)) {
      toast.error('You have already completed this exam.');
      return;
    }
    setSelectedExam(exam);
  }

  const availableColumns: Column<Exam>[] = [
    {
      header: 'Exam Title',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.title}</span>
          <p className="text-xs text-text-muted mt-0.5">{row.description || 'No description'}</p>
        </div>
      ),
    },
    {
      header: 'Subject',
      accessor: (row) => <span className="font-semibold text-maroon">{row.subjectId || 'Core Subject'}</span>,
    },
    {
      header: 'Duration',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
          <Clock className="h-3.5 w-3.5" /> {row.duration || 60} mins
        </span>
      ),
    },
    {
      header: 'Format',
      accessor: (row) => (
        <span className="uppercase text-xs font-bold px-2 py-0.5 rounded-md bg-card-2 border border-border/60">
          {row.type || row.format || 'MCQ'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button
          onClick={() => handleStartExam(row)}
          size="sm"
          className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="h-3 w-3 fill-current" /> Start Exam
        </Button>
      ),
    },
  ];

  const historyColumns: Column<ResultRecord>[] = [
    {
      header: 'Assessment',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.examTitle || 'Continuous Assessment'}</span>
          <p className="text-xs text-text-muted mt-0.5">{row.subject}</p>
        </div>
      ),
    },
    {
      header: 'Score',
      accessor: (row) => (
        <span className="font-mono font-semibold text-foreground">
          {row.grade === 'Hidden' ? '—' : `${row.score} / ${row.totalScore}`}
        </span>
      ),
    },
    {
      header: 'Grade',
      accessor: (row) => {
        if (row.grade === 'Hidden') return <Badge tone="neutral">Pending</Badge>;
        const pass = row.totalScore > 0 && row.score / row.totalScore >= 0.5;
        return <Badge tone={pass ? 'success' : 'danger'}>{row.grade || '—'}</Badge>;
      },
    },
    {
      header: 'Date',
      accessor: (row) => (
        <span className="text-xs text-text-secondary">{row.date ? new Date(row.date).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      header: '',
      accessor: () => (
        <Link href="/student/results" className="text-xs font-semibold text-maroon hover:underline whitespace-nowrap">
          View report →
        </Link>
      ),
    },
  ];

  const stats = [
    { label: 'Available', value: availableExams.length, sub: 'Ready to sit', icon: ClipboardList, color: 'text-maroon bg-maroon/10' },
    { label: 'Completed', value: historyRows.length, sub: 'Assessments recorded', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Average Score', value: averagePct === null ? '—' : `${averagePct.toFixed(1)}%`, sub: 'Across graded work', icon: Percent, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <DashboardShell
      title="My Exams"
      navItems={STUDENT_NAV}
      portalLabel="Student Portal"
      allowedRoles={['student', 'parent', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">Exams &amp; Test History</h2>
          <p className="text-sm text-text-secondary mt-0.5">Sit your scheduled assessments and review every score you&apos;ve earned this term.</p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.color}`}><Icon className="h-4 w-4" /></div>
                </div>
                <h3 className="text-2xl font-black text-foreground">{loading ? '—' : stat.value}</h3>
                <p className="text-xs text-text-muted mt-1">{stat.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-px">
          {[
            { id: 'available', label: 'Available', icon: ListChecks },
            { id: 'history', label: 'Completed', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'available' | 'history')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all cursor-pointer ${
                  isSelected
                    ? 'border-maroon text-maroon bg-maroon/5 rounded-t-lg'
                    : 'border-transparent text-text-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className="ml-1 rounded-full bg-card-2 border border-border/60 px-1.5 text-[10px] font-bold text-text-secondary">
                  {tab.id === 'available' ? availableExams.length : historyRows.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <Card className="flex items-center gap-4 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder={activeTab === 'available' ? 'Search exams or subjects...' : 'Search your results...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>
        </Card>

        {/* Tab content */}
        {activeTab === 'available' ? (
          <Card className="p-0 overflow-hidden">
            <Table
              columns={availableColumns}
              data={filteredAvailable}
              keyFor={(row) => row.id}
              loading={loading}
              emptyMessage="No exams awaiting you — you're all caught up."
              emptyIcon={<ListChecks className="h-10 w-10 text-text-muted" />}
            />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <Table
              columns={historyColumns}
              data={filteredHistory}
              keyFor={(row) => row.id}
              loading={loading}
              emptyMessage="No results yet. Scores appear here once your teacher grades and releases them."
              emptyIcon={<History className="h-10 w-10 text-text-muted" />}
            />
          </Card>
        )}

        {/* Exam Detail Modal — only opens for non-completed exams */}
        {selectedExam && !completedExamIds.has(selectedExam.id) && (
          <Modal
            open={!!selectedExam}
            onClose={() => setSelectedExam(null)}
            title={selectedExam.title}
            description="Please read all rules and guidelines before starting the assessment."
            size="md"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-card-2 border border-border space-y-2.5 text-sm text-foreground">
                <p><strong>Subject:</strong> {selectedExam.subjectId || 'General'}</p>
                <p><strong>Format:</strong> {selectedExam.type || 'Multiple Choice Questions (MCQ)'}</p>
                <p><strong>Duration:</strong> {selectedExam.duration || 60} Minutes</p>
                <p><strong>Total Weight:</strong> {(selectedExam.totalMarks as number) || 100} Marks</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-start gap-2.5 text-xs">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-950 font-sans">Exam Guidelines</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 font-sans">
                    <li>Ensure you have a stable internet connection.</li>
                    <li>Do not refresh or close the browser tab during the exam.</li>
                    <li>The exam timer will run continuously once started.</li>
                    <li>Leaving the browser window will trigger security alert warnings.</li>
                    <li className="font-bold text-amber-900">This exam can only be taken once. You cannot retake it.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button variant="secondary" onClick={() => setSelectedExam(null)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    router.push(`/student/exams/${selectedExam.id}`);
                    setSelectedExam(null);
                  }}
                  className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Begin Assessment
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardShell>
  );
}
