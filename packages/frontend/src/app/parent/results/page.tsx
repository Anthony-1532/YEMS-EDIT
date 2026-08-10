'use client';

import { useEffect, useState } from 'react';
import { Award, FileBarChart, TrendingUp, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PARENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { resultsApi, usersApi } from '@/lib/api/resources';
import type { ResultRecord, User } from '@/lib/api/types';
import toast from 'react-hot-toast';

function GradeBar({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.min((score / total) * 100, 100) : 0;
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-full h-1.5 rounded-full bg-card-2 border border-border/40 overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function ParentResultsPage() {
  const { user } = useAuth();
  const [child, setChild] = useState<User | null>(null);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'subject' | 'score' | 'grade'>('subject');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const [childData, resultsData] = await Promise.all([
          usersApi.getById(user!.studentId!),
          resultsApi.getByStudent(user!.studentId!),
        ]);
        if (!active) return;
        setChild(childData);
        // Filter out results that are hidden (unpublished)
        const visibleResults = resultsData.filter((r) => r.grade !== 'Hidden');
        setResults(visibleResults);
      } catch {
        toast.error('Failed to load results');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = results
    .filter((r) =>
      !search ||
      r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.examTitle?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'subject') cmp = (a.subject || '').localeCompare(b.subject || '');
      else if (sortKey === 'score') cmp = (a.score / (a.totalScore || 1)) - (b.score / (b.totalScore || 1));
      else cmp = (a.grade || '').localeCompare(b.grade || '');
      return sortAsc ? cmp : -cmp;
    });

  const avg = results.length > 0
    ? results.reduce((sum, r) => sum + (r.totalScore > 0 ? (r.score / r.totalScore) * 100 : 0), 0) / results.length
    : 0;

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col
      ? (sortAsc ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />)
      : null;

  return (
    <DashboardShell
      title="Ward Results"
      navItems={PARENT_NAV}
      portalLabel="Parent Portal"
      allowedRoles={['parent']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-emerald-500" />
              Academic Results &amp; Transcripts
            </h2>
            {child && (
              <p className="text-sm text-text-secondary mt-0.5">
                Viewing results for <span className="font-bold text-foreground">{child.name}</span> · Class: <span className="font-bold text-maroon">{child.class}</span>
              </p>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search subject or exam…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon w-full sm:w-64"
            />
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Exams', value: results.length, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Average Score', value: `${avg.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'A Grades', value: results.filter((r) => r.grade === 'A').length, icon: Award, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Pending Review', value: results.filter((r) => r.grade === 'Pending').length, icon: FileBarChart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          ].map((s) => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold">{s.label}</p>
                <p className="text-xl font-black text-foreground leading-none mt-0.5">{loading ? '—' : s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Results Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card-2">
                  {[
                    { label: 'Exam / Assessment', key: null },
                    { label: 'Subject', key: 'subject' as const },
                    { label: 'Term', key: null },
                    { label: 'Score', key: 'score' as const },
                    { label: 'Grade', key: 'grade' as const },
                    { label: 'Remarks', key: null },
                  ].map(({ label, key }) => (
                    <th
                      key={label}
                      className={`text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider ${key ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                      onClick={key ? () => toggleSort(key) : undefined}
                    >
                      {label}{key && <SortIcon col={key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full max-w-[120px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-25" />
                      <p className="text-sm font-semibold">No results found</p>
                      <p className="text-xs mt-1">Results appear here once exams are graded and published.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((res) => {
                    const pct = res.totalScore > 0 ? (res.score / res.totalScore) * 100 : 0;
                    const gradeTone: 'success' | 'warning' | 'danger' = pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger';
                    return (
                      <tr key={res.id} className="hover:bg-card-2/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground text-sm">{res.examTitle || 'Term Assessment'}</p>
                          <p className="text-xs text-text-muted mt-0.5">Session: {res.session || '2025/2026'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-maroon">{res.subject}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary font-semibold">{res.term || '1st Term'}</td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm font-bold text-foreground">{res.score} / {res.totalScore}</span>
                            <GradeBar score={res.score} total={res.totalScore} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={res.grade === 'Pending' ? 'neutral' : gradeTone} className="font-black text-sm px-3">
                            {res.grade || 'C'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary max-w-[180px] truncate">
                          {res.remarks || 'Automatically graded'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
