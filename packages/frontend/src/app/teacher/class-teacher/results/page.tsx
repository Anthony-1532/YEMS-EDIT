'use client';

import { useEffect, useState, useMemo } from 'react';
import { FileBarChart, Users, Calculator, Check, AlertCircle, Save, Printer } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CLASS_TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth/AuthContext';
import { resultsApi, teacherApi } from '@/lib/api/resources';
import type { ResultRecord, User } from '@/lib/api/types';
import toast from 'react-hot-toast';
import { ApiError } from '@/lib/api/client';

interface SubjectRow {
  subject: string;
  ca1: string; // Out of 15
  ca2: string; // Out of 15 (Midterm)
  exam: string; // Out of 70
  total: number;
  grade: string;
  remarks: string;
  ca1RecordId?: string;
  ca2RecordId?: string;
  examRecordId?: string;
}

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

const COMMON_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Civic Education',
  'Biology',
  'Chemistry',
  'Physics',
  'Agricultural Science',
  'Economics',
  'Geography',
  'Government',
  'Literature-in-English',
  'Commerce'
];

export default function ClassTeacherResultsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Term / Session selection
  const [term, setTerm] = useState('1st Term');
  const [session, setSession] = useState('2025/2026');

  // Input states for subjects
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  
  // Overall remarks and positions
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [principalRemarks, setPrincipalRemarks] = useState('');
  const [overallReportId, setOverallReportId] = useState<string | undefined>(undefined);

  // Load roster and results
  async function loadData() {
    if (!user?.classTeacherOf) return;
    setLoading(true);
    try {
      const [studentsData, resultsData] = await Promise.all([
        teacherApi.getMyClass(user.classTeacherOf),
        resultsApi.getAll(),
      ]);
      setStudents(studentsData);
      setResults(resultsData);

      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].id);
      }
    } catch (err) {
      toast.error('Failed to load class list or results');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  // Load details for selected student
  useEffect(() => {
    if (!selectedStudentId) return;

    // Filter results for this student, term, and session
    const studentResults = results.filter(
      (r) => r.studentId === selectedStudentId && r.term === term && r.session === session
    );

    // Group existing records by subject
    const subjectMap = new Map<string, ResultRecord[]>();
    for (const r of studentResults) {
      const list = subjectMap.get(r.subject) || [];
      list.push(r);
      subjectMap.set(r.subject, list);
    }

    // Build subject rows matching COMMON_SUBJECTS + any other custom subjects
    const allSubjects = Array.from(
      new Set([...COMMON_SUBJECTS, ...studentResults.map((r) => r.subject).filter((s) => s !== 'Overall Term Report')])
    );

    const rows: SubjectRow[] = allSubjects.map((sub) => {
      const records = subjectMap.get(sub) || [];
      const ca1Rec = records.find((r) => r.examTitle?.includes('CA 1') || r.examTitle?.includes('1st CA') || (r.totalScore <= 20 && !r.examTitle?.includes('Midterm')));
      const ca2Rec = records.find((r) => r.examTitle?.includes('CA 2') || r.examTitle?.includes('Midterm') || r.examTitle?.includes('2nd CA'));
      const examRec = records.find((r) => r.examTitle?.includes('Exam') || r.totalScore >= 50);

      const ca1Score = ca1Rec ? String(ca1Rec.score) : '';
      const ca2Score = ca2Rec ? String(ca2Rec.score) : '';
      const examScore = examRec ? String(examRec.score) : '';

      const nCa1 = Number(ca1Score) || 0;
      const nCa2 = Number(ca2Score) || 0;
      const nExam = Number(examScore) || 0;
      const total = nCa1 + nCa2 + nExam;

      const { grade, remarks } = getNigerianGrade(total);

      return {
        subject: sub,
        ca1: ca1Score,
        ca2: ca2Score,
        exam: examScore,
        total,
        grade,
        remarks,
        ca1RecordId: ca1Rec?.id,
        ca2RecordId: ca2Rec?.id,
        examRecordId: examRec?.id,
      };
    });

    setSubjectRows(rows);

    // Look for overall summary record
    const summaryRec = studentResults.find((r) => r.subject === 'Overall Term Report');
    if (summaryRec) {
      setOverallReportId(summaryRec.id);
      // Remarks field stores JSON or a combined text
      if (summaryRec.remarks) {
        try {
          const parsed = JSON.parse(summaryRec.remarks);
          setTeacherRemarks(parsed.teacher || '');
          setPrincipalRemarks(parsed.principal || '');
        } catch {
          setTeacherRemarks(summaryRec.remarks);
          setPrincipalRemarks('');
        }
      } else {
        setTeacherRemarks('');
        setPrincipalRemarks('');
      }
    } else {
      setOverallReportId(undefined);
      setTeacherRemarks('');
      setPrincipalRemarks('');
    }
  }, [selectedStudentId, results, term, session]);

  // Calculate positions and rankings across the entire class
  const classRankings = useMemo(() => {
    if (students.length === 0) return new Map<string, { rank: number; totalStudents: number; average: number }>();

    // For each student in the class, sum their scores to get an average
    const studentAverages = students.map((s) => {
      const studentResults = results.filter(
        (r) => r.studentId === s.id && r.term === term && r.session === session
      );

      // Group by subject and find the total out of 100 for each subject
      const subjectScores = new Map<string, number>();
      for (const r of studentResults) {
        if (r.subject === 'Overall Term Report') continue;
        const current = subjectScores.get(r.subject) || 0;
        subjectScores.set(r.subject, current + r.score);
      }

      const totalScore = Array.from(subjectScores.values()).reduce((sum, score) => sum + score, 0);
      const subjectsCount = Math.max(subjectScores.size, 1);
      const average = totalScore / subjectsCount;

      return { studentId: s.id, average, totalScore };
    });

    // Sort descending by average
    const sorted = [...studentAverages].sort((a, b) => b.average - a.average);

    const rankings = new Map<string, { rank: number; totalStudents: number; average: number }>();
    sorted.forEach((item, index) => {
      rankings.set(item.studentId, {
        rank: index + 1,
        totalStudents: sorted.length,
        average: item.average,
      });
    });

    return rankings;
  }, [students, results, term, session]);

  // Selected student's rank details
  const studentRank = classRankings.get(selectedStudentId) || { rank: 1, totalStudents: students.length, average: 0 };

  // Calculate current inputs stats
  const activeRows = subjectRows.filter((r) => r.ca1 !== '' || r.ca2 !== '' || r.exam !== '');
  const totalSubjectMarks = activeRows.reduce((sum, r) => sum + r.total, 0);
  const subjectsCount = Math.max(activeRows.length, 1);
  const studentAverage = totalSubjectMarks / subjectsCount;

  const totalPoints = activeRows.reduce((sum, r) => sum + getGradePoints(r.grade), 0);
  const studentGpa = totalPoints / subjectsCount;

  let overallTermGrade = 'F9';
  if (studentAverage >= 80) overallTermGrade = 'A1';
  else if (studentAverage >= 70) overallTermGrade = 'B2';
  else if (studentAverage >= 65) overallTermGrade = 'B3';
  else if (studentAverage >= 60) overallTermGrade = 'C4';
  else if (studentAverage >= 55) overallTermGrade = 'C5';
  else if (studentAverage >= 50) overallTermGrade = 'C6';
  else if (studentAverage >= 45) overallTermGrade = 'D7';
  else if (studentAverage >= 40) overallTermGrade = 'E8';

  // Handle value inputs
  function handleScoreChange(index: number, field: 'ca1' | 'ca2' | 'exam', val: string) {
    const updated = [...subjectRows];
    updated[index][field] = val;

    const nCa1 = Number(updated[index].ca1) || 0;
    const nCa2 = Number(updated[index].ca2) || 0;
    const nExam = Number(updated[index].exam) || 0;
    const total = nCa1 + nCa2 + nExam;

    const { grade, remarks } = getNigerianGrade(total);
    updated[index].total = total;
    updated[index].grade = grade;
    updated[index].remarks = remarks;

    setSubjectRows(updated);
  }

  // Position suffix formatting
  function getRankSuffix(rank: number): string {
    const j = rank % 10, k = rank % 100;
    if (j === 1 && k !== 11) return rank + 'st';
    if (j === 2 && k !== 12) return rank + 'nd';
    if (j === 3 && k !== 13) return rank + 'rd';
    return rank + 'th';
  }

  // Bulk Save and Publish Term Results
  async function handleSaveResults() {
    if (!selectedStudentId) return;
    setSaving(true);
    try {
      const classTeacherOf = user?.classTeacherOf || '';
      
      // 1. Save or update the subject components
      for (const row of subjectRows) {
        // Only save if there is at least one score entered
        if (row.ca1 === '' && row.ca2 === '' && row.exam === '') continue;

        const basePayload = {
          studentId: selectedStudentId,
          subject: row.subject,
          class: classTeacherOf,
          term,
          session,
          date: new Date().toISOString().split('T')[0],
        };

        // CA 1 (out of 15)
        if (row.ca1 !== '') {
          const payload = {
            ...basePayload,
            score: Number(row.ca1) || 0,
            totalScore: 15,
            examTitle: 'Continuous Assessment 1 (CA 1)',
            grade: row.grade,
            remarks: 'Form assessment',
          };
          if (row.ca1RecordId) {
            await resultsApi.update(row.ca1RecordId, payload);
          } else {
            await resultsApi.create(payload);
          }
        }

        // CA 2 / Midterm (out of 15)
        if (row.ca2 !== '') {
          const payload = {
            ...basePayload,
            score: Number(row.ca2) || 0,
            totalScore: 15,
            examTitle: 'Midterm Test (CA 2)',
            grade: row.grade,
            remarks: 'Form assessment',
          };
          if (row.ca2RecordId) {
            await resultsApi.update(row.ca2RecordId, payload);
          } else {
            await resultsApi.create(payload);
          }
        }

        // Exam (out of 70)
        if (row.exam !== '') {
          const payload = {
            ...basePayload,
            score: Number(row.exam) || 0,
            totalScore: 70,
            examTitle: 'Final Term Examination',
            grade: row.grade,
            remarks: row.remarks,
          };
          if (row.examRecordId) {
            await resultsApi.update(row.examRecordId, payload);
          } else {
            await resultsApi.create(payload);
          }
        }
      }

      // 2. Save calculated overall summary record
      const summaryPayload = {
        studentId: selectedStudentId,
        subject: 'Overall Term Report',
        class: classTeacherOf,
        term,
        session,
        score: Math.round(studentAverage),
        totalScore: 100,
        grade: overallTermGrade,
        remarks: JSON.stringify({
          teacher: teacherRemarks,
          principal: principalRemarks,
          rank: studentRank.rank,
          totalRank: studentRank.totalStudents,
          gpa: studentGpa.toFixed(2),
        }),
        examTitle: 'Term Report Card Summary',
        date: new Date().toISOString().split('T')[0],
      };

      if (overallReportId) {
        await resultsApi.update(overallReportId, summaryPayload);
      } else {
        await resultsApi.create(summaryPayload);
      }

      toast.success('Term results calculated and published successfully!');
      // Reload updated results
      const resultsData = await resultsApi.getAll();
      setResults(resultsData);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to publish results');
    } finally {
      setSaving(false);
    }
  }

  // Pre-fill default remarks based on average score
  function triggerAutoRemarks() {
    let remark = 'Average performance. Work harder.';
    if (studentAverage >= 80) remark = 'An outstanding, excellent performance. Keep up the high standard.';
    else if (studentAverage >= 70) remark = 'A very good performance. You are capable of maintaining this.';
    else if (studentAverage >= 60) remark = 'Good result. With more effort, you can score higher.';
    else if (studentAverage >= 50) remark = 'Fair performance. Put more effort into your weak subjects.';
    else if (studentAverage < 40) remark = 'Weak result. You are advised to attend extra classes and study more.';

    setTeacherRemarks(remark);
    
    let prinRemark = 'Approved.';
    if (studentAverage >= 75) prinRemark = 'Excellent performance. Promoted with pride.';
    else if (studentAverage >= 50) prinRemark = 'Good trial. Promoted.';
    else if (studentAverage < 40) prinRemark = 'Weak result. advised to repeat.';
    setPrincipalRemarks(prinRemark);

    toast.success('Auto-remarks generated!');
  }

  return (
    <DashboardShell
      title="Class Term Results"
      navItems={CLASS_TEACHER_NAV}
      portalLabel="Class Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        {/* Selector Header */}
        <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Select Student"
            options={students.map((s) => ({ value: s.id, label: s.name }))}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          />
          <Select
            label="Term"
            options={[
              { value: '1st Term', label: '1st Term' },
              { value: '2nd Term', label: '2nd Term' },
              { value: '3rd Term', label: '3rd Term' }
            ]}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <Select
            label="Session"
            options={[
              { value: '2025/2026', label: '2025/2026' },
              { value: '2026/2027', label: '2026/2027' }
            ]}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-[#7b1d3c] hover:bg-[#9b2d54] text-white cursor-pointer border-none"
              onClick={handleSaveResults}
              loading={saving}
              icon={<Save className="h-4 w-4" />}
            >
              Save &amp; Publish
            </Button>
            <Button
              variant="secondary"
              onClick={triggerAutoRemarks}
              icon={<Calculator className="h-4 w-4" />}
            >
              Auto-Remarks
            </Button>
          </div>
        </Card>

        {/* Live Calculation Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-violet-50 border-violet-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-700">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-violet-700">Term Average</p>
              <p className="text-xl font-bold text-violet-955">{studentAverage.toFixed(1)}%</p>
            </div>
          </Card>

          <Card className="p-4 bg-emerald-50 border-emerald-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-emerald-700">GPA Equivalent</p>
              <p className="text-xl font-bold text-emerald-955">{studentGpa.toFixed(2)} / 5.00</p>
            </div>
          </Card>

          <Card className="p-4 bg-sky-50 border-sky-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-sky-700">Class Position</p>
              <p className="text-xl font-bold text-sky-955">{getRankSuffix(studentRank.rank)} of {studentRank.totalStudents}</p>
            </div>
          </Card>

          <Card className="p-4 bg-rose-50 border-rose-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700">
              <FileBarChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-rose-700">Overall Grade</p>
              <p className="text-xl font-bold text-rose-955">{overallTermGrade}</p>
            </div>
          </Card>
        </div>

        {/* Results Sheet Template (Nigerian Style) */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-card-2 flex justify-between items-center">
            <h3 className="font-semibold text-foreground text-sm">Nigerian Termly Report Sheet</h3>
            <span className="text-xs text-text-secondary font-mono">Class: {user?.classTeacherOf}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-card-2 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                  <th className="p-3">Subject</th>
                  <th className="p-3 w-20 text-center">CA 1 (15)</th>
                  <th className="p-3 w-20 text-center">CA 2 (15)</th>
                  <th className="p-3 w-20 text-center">Exam (70)</th>
                  <th className="p-3 w-20 text-center">Total (100)</th>
                  <th className="p-3 w-20 text-center">Grade</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subjectRows.map((row, index) => (
                  <tr key={row.subject} className="hover:bg-card-2/30">
                    <td className="p-3 font-semibold text-foreground">{row.subject}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        className="w-full text-center h-8 bg-card border border-border rounded focus:outline-none focus:border-maroon text-xs"
                        value={row.ca1}
                        onChange={(e) => handleScoreChange(index, 'ca1', e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={15}
                        className="w-full text-center h-8 bg-card border border-border rounded focus:outline-none focus:border-maroon text-xs"
                        value={row.ca2}
                        onChange={(e) => handleScoreChange(index, 'ca2', e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={70}
                        className="w-full text-center h-8 bg-card border border-border rounded focus:outline-none focus:border-maroon text-xs"
                        value={row.exam}
                        onChange={(e) => handleScoreChange(index, 'exam', e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-foreground">
                      {row.ca1 || row.ca2 || row.exam ? row.total : '-'}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {row.ca1 || row.ca2 || row.exam ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
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
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-xs italic text-text-secondary">
                      {row.ca1 || row.ca2 || row.exam ? row.remarks : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Overall Teacher/Principal Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 space-y-3">
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              Class Teacher&apos;s Signature Remarks
            </h4>
            <textarea
              className="w-full h-24 bg-card border border-border rounded-xl p-3 focus:outline-none focus:border-maroon text-sm text-foreground"
              value={teacherRemarks}
              onChange={(e) => setTeacherRemarks(e.target.value)}
              placeholder="e.g. A very outstanding performance. Keep it up."
            />
          </Card>

          <Card className="p-5 space-y-3">
            <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              Principal&apos;s Form Remarks &amp; Promotion Status
            </h4>
            <textarea
              className="w-full h-24 bg-card border border-border rounded-xl p-3 focus:outline-none focus:border-maroon text-sm text-foreground"
              value={principalRemarks}
              onChange={(e) => setPrincipalRemarks(e.target.value)}
              placeholder="e.g. Promoted to SSS 1. Excellent."
            />
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
