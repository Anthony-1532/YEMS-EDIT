'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Clock, History, Play, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { examsApi, resultsApi } from '@/lib/api/resources';
import type { Exam, ResultRecord } from '@/lib/api/types';

export default function StudentMidTermTestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([examsApi.getAll({ type: 'midterm' }), resultsApi.getAll()])
      .then(([examData, resultData]) => { if (active) { setExams(examData.filter((e) => e.type?.toLowerCase() === 'midterm')); setResults(resultData); } })
      .catch(() => toast.error('Failed to load mid-term tests'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const completed = useMemo(() => new Set(results.filter((r) => r.examId).map((r) => String(r.examId))), [results]);
  const available = exams.filter((e) => !completed.has(e.id) && `${e.title} ${e.subject || e.subjectId || ''}`.toLowerCase().includes(search.toLowerCase()));
  const history = results.filter((r) => r.examId && exams.some((e) => e.id === r.examId) && `${r.examTitle || ''} ${r.subject}`.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<Exam>[] = [
    { header: 'Test', accessor: (e) => <div><span className="font-semibold text-foreground">{e.title}</span><p className="text-xs text-text-muted">{e.description || 'Mid-term assessment'}</p></div> },
    { header: 'Subject', accessor: (e) => <span className="font-semibold text-maroon">{e.subject || e.subjectId || 'Core Subject'}</span> },
    { header: 'Duration', accessor: (e) => <span className="inline-flex items-center gap-1 text-xs"><Clock className="h-3.5 w-3.5" /> {e.duration || 60} mins</span> },
    { header: 'Action', accessor: (e) => <Button size="sm" onClick={() => router.push(`/student/exams/${e.id}`)} className="bg-maroon text-white"><Play className="h-3 w-3 mr-1" /> Start Test</Button> },
  ];
  const historyColumns: Column<ResultRecord>[] = [
    { header: 'Test', accessor: (r) => <div><span className="font-semibold">{r.examTitle || 'Mid-term test'}</span><p className="text-xs text-text-muted">{r.subject}</p></div> },
    { header: 'Score', accessor: (r) => <span>{r.grade === 'Hidden' ? '—' : `${r.score} / ${r.totalScore}`}</span> },
    { header: 'Grade', accessor: (r) => <Badge tone={r.grade === 'Hidden' ? 'neutral' : 'success'}>{r.grade || 'Pending'}</Badge> },
  ];

  return <DashboardShell title="Mid-Term Tests" navItems={STUDENT_NAV} portalLabel="Student Portal" allowedRoles={['student', 'parent', 'admin', 'superadmin']}>
    <div className="space-y-6 fade-in"><div><h2 className="text-xl font-bold">Mid-Term Tests</h2><p className="text-sm text-text-secondary">Complete mid-term examinations and review your previous attempts.</p></div>
      <Card className="flex items-center gap-3 p-4"><Search className="h-4 w-4 text-text-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mid-term tests..." className="w-full bg-transparent text-sm outline-none" /></Card>
      <Card className="p-0 overflow-hidden"><div className="border-b border-border px-5 py-4 font-bold flex gap-2 items-center"><ClipboardList className="h-5 w-5 text-maroon" /> Available Tests <span className="text-xs text-text-muted">({available.length})</span></div><Table columns={columns} data={available} keyFor={(e) => e.id} loading={loading} emptyMessage="No mid-term tests are currently available." /></Card>
      <Card className="p-0 overflow-hidden"><div className="border-b border-border px-5 py-4 font-bold flex gap-2 items-center"><History className="h-5 w-5 text-maroon" /> Completed Tests <span className="text-xs text-text-muted">({history.length})</span></div><Table columns={historyColumns} data={history} keyFor={(r) => r.id} loading={loading} emptyMessage="No completed mid-term tests yet." /></Card>
    </div>
  </DashboardShell>;
}
