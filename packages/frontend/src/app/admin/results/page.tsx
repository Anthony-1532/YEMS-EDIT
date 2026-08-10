'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Download, Award, ChevronLeft, Printer, Users, Percent, TrendingUp, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { resultsApi } from '@/lib/api/resources';
import { adminApi } from '@/lib/api/admin';
import type { ResultRecord, User } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

// Nigerian WAEC standard grading
function getNigerianGrade(total: number): { grade: string; remarks: string } {
  if (total >= 80) return { grade: 'A1', remarks: 'Excellent' };
  if (total >= 70) return { grade: 'B2', remarks: 'Very Good' };
  if (total >= 65) return { grade: 'B3', remarks: 'Good' };
  if (total >= 60) return { grade: 'C4', remarks: 'Credit' };
  if (total >= 55) return { grade: 'C5', remarks: 'Credit' };
  if (total >= 50) return { grade: 'C6', remarks: 'Credit' };
  if (total >= 45) return { grade: 'D7', remarks: 'Pass' };
  if (total >= 40) return { grade: 'E8', remarks: 'Pass' };
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

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Selected student to view comprehensive report card
  const [selectedStudentCardId, setSelectedStudentCardId] = useState<string | null>(null);
  
  // Custom comments edit
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [principalRemarks, setPrincipalRemarks] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [resultsData, studentsData] = await Promise.all([
        resultsApi.getAll(),
        adminApi.getUsers({ role: 'student' }).catch(() => []),
      ]);
      setResults(resultsData);
      setStudents(studentsData);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set(results.map((r) => r.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [results]);

  const classes = useMemo(() => {
    const set = new Set(results.map((r) => r.class).filter(Boolean));
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (r.subject === 'Overall Term Report') return false; // Filter from default list
      if (subjectFilter && r.subject !== subjectFilter) return false;
      if (classFilter && r.class !== classFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (r.studentName || '').toLowerCase();
        const subject = (r.subject || '').toLowerCase();
        return name.includes(q) || subject.includes(q);
      }
      return true;
    });
  }, [results, search, subjectFilter, classFilter]);

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

  // --- Student Term Card calculations ---
  const selectedStudentResults = useMemo(() => {
    if (!selectedStudentCardId) return [];
    return results.filter((r) => r.studentId === selectedStudentCardId);
  }, [selectedStudentCardId, results]);

  const studentSubjectRows = useMemo(() => {
    const map = new Map<string, ResultRecord[]>();
    for (const r of selectedStudentResults) {
      if (r.subject === 'Overall Term Report') continue;
      const list = map.get(r.subject) || [];
      list.push(r);
      map.set(r.subject, list);
    }

    const list: Array<{
      subject: string;
      ca1: number | null;
      ca2: number | null;
      exam: number | null;
      total: number;
      grade: string;
      remarks: string;
    }> = [];

    map.forEach((records, sub) => {
      const ca1 = records.find((r) => r.examTitle?.includes('CA 1') || r.examTitle?.includes('1st CA') || (r.totalScore <= 20 && !r.examTitle?.includes('Midterm')))?.score ?? null;
      const ca2 = records.find((r) => r.examTitle?.includes('CA 2') || r.examTitle?.includes('Midterm') || r.examTitle?.includes('2nd CA'))?.score ?? null;
      const exam = records.find((r) => r.examTitle?.includes('Exam') || r.totalScore >= 50)?.score ?? null;

      const nCa1 = ca1 ?? 0;
      const nCa2 = ca2 ?? 0;
      const nExam = exam ?? 0;
      const total = nCa1 + nCa2 + nExam;

      const { grade, remarks } = getNigerianGrade(total);

      list.push({
        subject: sub,
        ca1,
        ca2,
        exam,
        total,
        grade,
        remarks,
      });
    });

    return list;
  }, [selectedStudentResults]);

  const studentSummaryRecord = useMemo(() => {
    return selectedStudentResults.find((r) => r.subject === 'Overall Term Report');
  }, [selectedStudentResults]);

  const parsedStudentSummary = useMemo(() => {
    if (!studentSummaryRecord || !studentSummaryRecord.remarks) return null;
    try {
      return JSON.parse(studentSummaryRecord.remarks);
    } catch {
      return {
        teacher: studentSummaryRecord.remarks,
        principal: 'Approved.',
        rank: null,
        totalRank: null,
        gpa: null,
      };
    }
  }, [studentSummaryRecord]);

  // Sync edit remarks state
  useEffect(() => {
    if (parsedStudentSummary) {
      setTeacherRemarks(parsedStudentSummary.teacher || '');
      setPrincipalRemarks(parsedStudentSummary.principal || '');
    } else {
      setTeacherRemarks('');
      setPrincipalRemarks('');
    }
  }, [parsedStudentSummary]);

  const studentAveragePercentage = studentSubjectRows.length > 0
    ? (studentSubjectRows.reduce((sum, r) => sum + r.total, 0) / studentSubjectRows.length)
    : 0;

  const studentGpa = parsedStudentSummary?.gpa 
    ? Number(parsedStudentSummary.gpa)
    : (studentSubjectRows.length > 0 ? (studentSubjectRows.reduce((sum, r) => sum + getGradePoints(r.grade), 0) / studentSubjectRows.length) : 0);

  const studentClassPosition = parsedStudentSummary?.rank 
    ? `${parsedStudentSummary.rank} of ${parsedStudentSummary.totalRank || '—'}` 
    : '—';

  let studentTermGrade = 'F9';
  if (studentAveragePercentage >= 80) studentTermGrade = 'A1';
  else if (studentAveragePercentage >= 70) studentTermGrade = 'B2';
  else if (studentAveragePercentage >= 65) studentTermGrade = 'B3';
  else if (studentAveragePercentage >= 60) studentTermGrade = 'C4';
  else if (studentAveragePercentage >= 55) studentTermGrade = 'C5';
  else if (studentAveragePercentage >= 50) studentTermGrade = 'C6';
  else if (studentAveragePercentage >= 45) studentTermGrade = 'D7';
  else if (studentAveragePercentage >= 40) studentTermGrade = 'E8';

  const reportStats = [
    { label: 'Term Average', value: `${studentAveragePercentage.toFixed(1)}%`, sub: 'Calculated average score', icon: Percent, color: 'text-[#7b1d3c] bg-maroon/10' },
    { label: 'GPA Equivalent', value: `${studentGpa.toFixed(2)} / 5.00`, sub: '5.0 grade point average', icon: Award, color: 'text-violet-600 bg-violet-50' },
    { label: 'Class Position', value: studentClassPosition, sub: 'Rank in term', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  async function handleSaveAdminRemarks() {
    if (!selectedStudentCardId || !studentSummaryRecord) return;
    setSavingRemarks(true);
    try {
      const remarksPayload = {
        teacher: teacherRemarks,
        principal: principalRemarks,
        rank: parsedStudentSummary?.rank,
        totalRank: parsedStudentSummary?.totalRank,
        gpa: studentGpa.toFixed(2),
      };

      await resultsApi.update(studentSummaryRecord.id, {
        remarks: JSON.stringify(remarksPayload),
      });

      toast.success('Report card comments updated successfully!');
      load();
    } catch (err) {
      toast.error('Failed to update comments');
    } finally {
      setSavingRemarks(false);
    }
  }

  const columns: Column<ResultRecord>[] = [
    {
      header: 'Student',
      accessor: (r) => (
        <div>
          <button
            onClick={() => setSelectedStudentCardId(r.studentId)}
            className="font-bold text-[#7b1d3c] hover:underline block text-left"
          >
            {r.studentName || r.studentId}
          </button>
          <p className="text-[10px] text-text-secondary font-mono">{r.studentId}</p>
        </div>
      ),
    },
    { header: 'Subject', accessor: (r) => r.subject },
    {
      header: 'Score',
      accessor: (r) => (
        <span className="font-mono font-semibold">
          {r.score}/{r.totalScore}
        </span>
      ),
    },
    {
      header: 'Grade',
      accessor: (r) => {
        const grade = r.grade || getGrade(r.score, r.totalScore);
        return <Badge tone={getGradeTone(grade)}>{grade}</Badge>;
      },
    },
    { header: 'Class', accessor: (r) => r.class || '—' },
    { header: 'Exam', accessor: (r) => r.examTitle || '—' },
    {
      header: 'Date',
      accessor: (r) => formatDate(r.date),
    },
    {
      header: 'Report Sheet',
      accessor: (r) => (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setSelectedStudentCardId(r.studentId)}
        >
          View Card
        </Button>
      ),
      className: 'text-right',
    }
  ];

  return (
    <DashboardShell
      title="Results Portal"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <div className="space-y-6 fade-in">
        {selectedStudentCardId ? (
          /* Student Term report Card view */
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={() => setSelectedStudentCardId(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#7b1d3c] hover:underline"
              >
                <ChevronLeft className="h-4 w-4" /> Back to All Results
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-card border border-border hover:bg-card-2 text-text-secondary rounded-xl transition-all cursor-pointer shadow-sm print:hidden"
                >
                  <Printer className="h-4 w-4" /> Print Sheet
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {reportStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-6">
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

            {/* Visual Report Card Template */}
            <Card className="p-0 overflow-hidden shadow-md print:shadow-none print:border">
              {/* Report Header */}
              <div className="p-6 bg-card-2 border-b border-border text-center space-y-2">
                <h3 className="text-lg font-extrabold text-foreground uppercase tracking-wider">Yeshua Educational System</h3>
                <p className="text-xs font-bold text-[#7b1d3c] tracking-widest uppercase font-mono">Termly Report Card &amp; Academic Summary</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left pt-4 text-xs text-text-secondary font-medium">
                  <div>Name: <span className="font-bold text-foreground">{students.find((s) => s.id === selectedStudentCardId)?.name || 'Student'}</span></div>
                  <div>Class: <span className="font-bold text-foreground">{selectedStudentResults[0]?.class || '—'}</span></div>
                  <div>Term: <span className="font-bold text-[#7b1d3c]">{selectedStudentResults[0]?.term || '1st Term'}</span></div>
                  <div>Session: <span className="font-bold text-foreground">{selectedStudentResults[0]?.session || '—'}</span></div>
                </div>
              </div>

              {/* Subject Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-card-2 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                      <th className="p-3">Subject / Course</th>
                      <th className="p-3 text-center">CA 1 (15)</th>
                      <th className="p-3 text-center">CA 2 (15)</th>
                      <th className="p-3 text-center">Exam (70)</th>
                      <th className="p-3 text-center">Total (100)</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {studentSubjectRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-text-muted italic">
                          No graded subject sheets compiled yet for this student.
                        </td>
                      </tr>
                    ) : (
                      studentSubjectRows.map((row) => (
                        <tr key={row.subject} className="hover:bg-card-2/30">
                          <td className="p-3 font-semibold text-foreground">{row.subject}</td>
                          <td className="p-3 text-center font-mono">{row.ca1 !== null ? row.ca1 : '—'}</td>
                          <td className="p-3 text-center font-mono">{row.ca2 !== null ? row.ca2 : '—'}</td>
                          <td className="p-3 text-center font-mono">{row.exam !== null ? row.exam : '—'}</td>
                          <td className="p-3 text-center font-mono font-bold text-foreground">{row.total}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              row.grade === 'A1' || row.grade.startsWith('B')
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : row.grade.startsWith('C')
                                ? 'bg-sky-500/10 text-sky-600'
                                : row.grade === 'F9'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {row.grade}
                            </span>
                          </td>
                          <td className="p-3 text-xs italic text-text-secondary">{row.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Remarks Manager */}
            {studentSubjectRows.length > 0 && studentSummaryRecord && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 space-y-3">
                  <h4 className="font-semibold text-foreground text-sm">Class Teacher&apos;s Signature Remarks</h4>
                  <textarea
                    className="w-full h-24 bg-card border border-border rounded-xl p-3 focus:outline-none focus:border-maroon text-sm text-foreground"
                    value={teacherRemarks}
                    onChange={(e) => setTeacherRemarks(e.target.value)}
                    placeholder="Class teacher remarks..."
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#7b1d3c] hover:bg-[#9b2d54] text-white border-none cursor-pointer"
                      onClick={handleSaveAdminRemarks}
                      loading={savingRemarks}
                      icon={<Save className="h-3.5 w-3.5" />}
                    >
                      Update Comments
                    </Button>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <h4 className="font-semibold text-foreground text-sm">Principal&apos;s Approval Remarks</h4>
                  <textarea
                    className="w-full h-24 bg-card border border-border rounded-xl p-3 focus:outline-none focus:border-maroon text-sm text-foreground"
                    value={principalRemarks}
                    onChange={(e) => setPrincipalRemarks(e.target.value)}
                    placeholder="Principal remarks..."
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#7b1d3c] hover:bg-[#9b2d54] text-white border-none cursor-pointer"
                      onClick={handleSaveAdminRemarks}
                      loading={savingRemarks}
                      icon={<Save className="h-3.5 w-3.5" />}
                    >
                      Update Comments
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : (
          /* Standard listing view */
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
                  options={subjects.map((s) => ({ value: s ?? '', label: s ?? '' }))}
                  placeholder="All subjects"
                  className="sm:max-w-[160px]"
                />
                <Select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  options={classes.map((c) => ({ value: c ?? '', label: c ?? '' }))}
                  placeholder="All classes"
                  className="sm:max-w-[160px]"
                />
                <Select
                  value={selectedStudentCardId || ''}
                  onChange={(e) => setSelectedStudentCardId(e.target.value || null)}
                  options={students.map((s) => ({ value: s.id, label: `Report Card: ${s.name}` }))}
                  placeholder="Select Student Report Card"
                  className="sm:max-w-[260px] text-maroon font-bold"
                />
              </div>
              <span className="text-sm text-text-secondary">{filtered.length} result(s)</span>
            </div>

            <Table columns={columns} data={filtered} keyFor={(r) => r.id} loading={loading} emptyMessage="No results found." />
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
