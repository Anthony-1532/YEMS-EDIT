'use client';

import { useEffect, useState, useMemo } from 'react';
import { Award, Percent, TrendingUp, TrendingDown, Printer, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { resultsApi } from '@/lib/api/resources';
import type { ResultRecord } from '@/lib/api/types';
import toast from 'react-hot-toast';

function getNigerianGrade(pct: number): { grade: string; remarks: string } {
  if (pct >= 80) return { grade: 'A1', remarks: 'Excellent' };
  if (pct >= 70) return { grade: 'B2', remarks: 'Very Good' };
  if (pct >= 65) return { grade: 'B3', remarks: 'Good' };
  if (pct >= 60) return { grade: 'C4', remarks: 'Credit' };
  if (pct >= 55) return { grade: 'C5', remarks: 'Credit' };
  if (pct >= 50) return { grade: 'C6', remarks: 'Credit' };
  if (pct >= 45) return { grade: 'D7', remarks: 'Pass' };
  if (pct >= 40) return { grade: 'E8', remarks: 'Pass' };
  return { grade: 'F9', remarks: 'Fail' };
}

function getGradePoints(grade: string): number {
  if (grade === 'A1') return 5;
  if (grade.startsWith('B')) return 4;
  if (grade.startsWith('C')) return 3;
  if (grade === 'D7') return 2;
  if (grade === 'E8') return 1;
  return 0;
}

// Robust classification of an assessment into a report-card column.
// Title match wins; weight (totalScore) is only a fallback hint. Anything that
// matches nothing lands in 'other' — it is still counted in the total, never
// silently dropped or forced to zero.
type Bucket = 'ca1' | 'ca2' | 'exam' | 'other';
function classifyBucket(r: ResultRecord): Bucket {
  const t = (r.examTitle || '').toLowerCase();
  if (/(^|\W)(ca\s*1|1st\s*ca|first\s*ca|c\.a\.?\s*1)(\W|$)/.test(t)) return 'ca1';
  if (/(midterm|mid-?term|ca\s*2|2nd\s*ca|second\s*ca|c\.a\.?\s*2)/.test(t)) return 'ca2';
  if (/(exam|examination|final|end[-\s]?of[-\s]?term)/.test(t)) return 'exam';
  const max = r.totalScore || 0;
  if (max > 0 && max <= 20) return 'ca1';
  if (max >= 50) return 'exam';
  return 'other';
}

type SubjectRow = {
  subject: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  earned: number;
  max: number;
  pct: number | null;
  grade: string;
  remarks: string;
  pending: boolean;      // nothing graded/published yet
  awaitingExam: boolean; // CAs in, but final exam not taken/graded
};

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultRecord[]>([]);

  useEffect(() => {
    let active = true;
    async function loadResults() {
      try {
        const data = await resultsApi.getAll();
        if (active) setResults(data);
      } catch (err) {
        console.error('Failed to load student results:', err);
        toast.error('Failed to load results');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadResults();
    return () => { active = false; };
  }, []);

  // Group records by subject (excluding the synthetic 'Overall Term Report')
  const subjectGroups = useMemo(() => {
    const map = new Map<string, ResultRecord[]>();
    for (const r of results) {
      if (r.subject === 'Overall Term Report') continue;
      const list = map.get(r.subject) || [];
      list.push(r);
      map.set(r.subject, list);
    }
    return map;
  }, [results]);

  const subjectRows = useMemo<SubjectRow[]>(() => {
    const list: SubjectRow[] = [];

    subjectGroups.forEach((records, sub) => {
      const isGraded = (r: ResultRecord) => r.grade !== 'Hidden';
      const cell = (b: Bucket) => {
        const r = records.find((x) => classifyBucket(x) === b);
        return r && isGraded(r) ? r.score : null;
      };

      const graded = records.filter(isGraded);
      const earned = graded.reduce((s, r) => s + (r.score || 0), 0);
      const max = graded.reduce((s, r) => s + (r.totalScore || 0), 0);
      const pct = max > 0 ? (earned / max) * 100 : null;

      const pending = graded.length === 0; // all hidden / nothing published
      const awaitingExam = !pending && !records.some((r) => classifyBucket(r) === 'exam' && isGraded(r));

      const { grade, remarks } =
        pct === null ? { grade: '—', remarks: 'Awaiting results' } : getNigerianGrade(pct);

      list.push({
        subject: sub,
        ca1: cell('ca1'),
        ca2: cell('ca2'),
        exam: cell('exam'),
        earned,
        max,
        pct,
        grade,
        remarks: awaitingExam ? 'Exam pending' : remarks,
        pending,
        awaitingExam,
      });
    });

    return list.sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subjectGroups]);

  // Overall Term Report summary record (teacher/principal remarks, rank, gpa)
  const summaryRecord = useMemo(
    () => results.find((r) => r.subject === 'Overall Term Report'),
    [results],
  );

  const parsedSummary = useMemo(() => {
    if (!summaryRecord || !summaryRecord.remarks) return null;
    try {
      return JSON.parse(summaryRecord.remarks);
    } catch {
      return { teacher: summaryRecord.remarks, principal: 'Approved.', rank: null, totalRank: null, gpa: null };
    }
  }, [summaryRecord]);

  // Term-level stats computed over graded subjects only, so pending subjects
  // don't deflate the average or force an F9.
  const gradedRows = useMemo(() => subjectRows.filter((r) => !r.pending && r.pct !== null), [subjectRows]);
  const totalSubjects = gradedRows.length;
  const averagePercentage = totalSubjects > 0 ? gradedRows.reduce((s, r) => s + (r.pct || 0), 0) / totalSubjects : 0;

  const gpa = parsedSummary?.gpa
    ? Number(parsedSummary.gpa)
    : (totalSubjects > 0 ? gradedRows.reduce((s, r) => s + getGradePoints(r.grade), 0) / totalSubjects : 0);

  const classPosition = parsedSummary?.rank ? `${parsedSummary.rank} of ${parsedSummary.totalRank || '—'}` : '—';

  const termGrade = totalSubjects > 0 ? getNigerianGrade(averagePercentage) : { grade: '—', remarks: 'No results yet' };

  const best = totalSubjects > 0 ? gradedRows.reduce((a, b) => ((b.pct || 0) > (a.pct || 0) ? b : a)) : null;
  const weakest = totalSubjects > 1 ? gradedRows.reduce((a, b) => ((b.pct || 0) < (a.pct || 0) ? b : a)) : null;

  const reportStats = [
    { label: 'Term Average', value: `${averagePercentage.toFixed(1)}%`, sub: `${totalSubjects} subject${totalSubjects === 1 ? '' : 's'} graded`, icon: Percent, color: 'text-[#7b1d3c] bg-maroon/10' },
    { label: 'Term Grade', value: termGrade.grade, sub: termGrade.remarks, icon: GraduationCap, color: 'text-amber-600 bg-amber-50' },
    { label: 'GPA Equivalent', value: `${gpa.toFixed(2)} / 5.00`, sub: '5.0 grade point average', icon: Award, color: 'text-violet-600 bg-violet-50' },
    { label: 'Class Position', value: classPosition, sub: 'Rank in current term', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <DashboardShell
      title="My Results"
      navItems={STUDENT_NAV}
      portalLabel="Student Portal"
      allowedRoles={['student', 'parent', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Termly Report Card</h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Your official academic standing for the term. Individual test &amp; exam scores live under{' '}
              <Link href="/student/exams" className="text-maroon font-semibold hover:underline">My Exams › Completed</Link>.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-card border border-border hover:bg-card-2 text-text-secondary rounded-xl transition-all cursor-pointer shadow-sm print:hidden"
          >
            <Printer className="h-4 w-4" /> Print Report Sheet
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
          {reportStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-foreground">{loading ? '—' : stat.value}</h3>
                <p className="text-xs text-text-muted mt-1">{stat.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Best / needs-attention highlight */}
        {best && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Strongest Subject</p>
                <p className="text-sm font-semibold text-foreground">{best.subject} <span className="text-text-muted font-normal">· {best.grade} ({best.pct?.toFixed(0)}%)</span></p>
              </div>
            </div>
            {weakest && weakest.subject !== best.subject && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><TrendingDown className="h-4 w-4" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Needs Attention</p>
                  <p className="text-sm font-semibold text-foreground">{weakest.subject} <span className="text-text-muted font-normal">· {weakest.grade} ({weakest.pct?.toFixed(0)}%)</span></p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comprehensive Report Sheet (WAEC Nigerian Format) */}
        <Card className="p-0 overflow-hidden shadow-md print:shadow-none print:border">
          <div className="p-6 bg-card-2 border-b border-border text-center space-y-2">
            <h3 className="text-lg font-extrabold text-foreground uppercase tracking-wider">Yeshua Educational System</h3>
            <p className="text-xs font-bold text-[#7b1d3c] tracking-widest uppercase">Termly Report Card &amp; Academic Summary</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left pt-4 text-xs text-text-secondary font-medium">
              <div>Name: <span className="font-bold text-foreground">{results[0]?.studentName || 'Student'}</span></div>
              <div>Class: <span className="font-bold text-foreground">{results[0]?.class || '—'}</span></div>
              <div>Term: <span className="font-bold text-[#7b1d3c]">{results[0]?.term || '1st Term'}</span></div>
              <div>Session: <span className="font-bold text-foreground">{results[0]?.session || '—'}</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-card-2 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                  <th className="p-3">Subject / Course</th>
                  <th className="p-3 text-center">CA 1 (15)</th>
                  <th className="p-3 text-center">CA 2 (15)</th>
                  <th className="p-3 text-center">Exam (70)</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subjectRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-muted italic">
                      {loading ? 'Compiling report sheet...' : 'No graded report sheets compiled yet.'}
                    </td>
                  </tr>
                ) : (
                  subjectRows.map((row) => (
                    <tr key={row.subject} className="hover:bg-card-2/30">
                      <td className="p-3 font-semibold text-foreground">{row.subject}</td>
                      <td className="p-3 text-center font-mono">{row.ca1 !== null ? row.ca1 : '—'}</td>
                      <td className="p-3 text-center font-mono">{row.ca2 !== null ? row.ca2 : '—'}</td>
                      <td className="p-3 text-center font-mono">{row.exam !== null ? row.exam : '—'}</td>
                      <td className="p-3 text-center font-mono font-bold text-foreground">
                        {row.pending ? '—' : `${row.earned}/${row.max}`}
                      </td>
                      <td className="p-3 text-center">
                        {row.pending ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-card-2 text-text-muted border border-border/60">Pending</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            row.awaitingExam
                              ? 'bg-amber-500/10 text-amber-600'
                              : row.grade === 'A1' || row.grade.startsWith('B')
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : row.grade.startsWith('C')
                              ? 'bg-sky-500/10 text-sky-600'
                              : row.grade === 'F9'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {row.grade}{row.awaitingExam ? '*' : ''}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs italic text-text-secondary">{row.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {subjectRows.some((r) => r.awaitingExam) && (
            <div className="px-6 py-2 text-[11px] text-amber-700 bg-amber-500/5 border-t border-border/60">
              * Provisional grade — final exam not yet recorded for this subject.
            </div>
          )}

          {subjectRows.length > 0 && (
            <div className="p-6 border-t border-border bg-card-2 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary">
              <div className="space-y-1 bg-card rounded-xl p-4 border border-border/50">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-[#7b1d3c]">Class Teacher&apos;s Remarks</p>
                <p className="italic text-foreground mt-1">{parsedSummary?.teacher || 'A very good result. Keep studying hard.'}</p>
              </div>
              <div className="space-y-1 bg-card rounded-xl p-4 border border-border/50">
                <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-violet-600">Principal&apos;s Remarks</p>
                <p className="italic text-foreground mt-1">{parsedSummary?.principal || 'Satisfactory. Promoted.'}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
