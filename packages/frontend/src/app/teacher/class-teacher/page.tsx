'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileBarChart, Users, ArrowRight, TrendingUp, Award, ClipboardList
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { CLASS_TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/AuthContext';
import { resultsApi, teacherApi } from '@/lib/api/resources';
import type { ResultRecord, User } from '@/lib/api/types';

export default function ClassTeacherOverviewPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.classTeacherOf) return;
      try {
        const [studentsData, resultsData] = await Promise.all([
          teacherApi.getMyClass(user.classTeacherOf),
          resultsApi.getAll(),
        ]);
        if (!active) return;
        setStudents(studentsData);
        setResults(resultsData.filter((r) => r.class === user.classTeacherOf));
      } catch (err) {
        console.error('Failed to load class teacher overview:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

  // Aggregate class statistics
  const classSize = students.length;
  const gradedCount = results.length;
  
  const classAverages = results.reduce((sum, r) => sum + r.score, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.totalScore, 0);
  const classPercentage = totalPossible > 0 ? (classAverages / totalPossible) * 100 : 0;

  const statCards = [
    { label: 'My Class', value: user?.classTeacherOf || 'N/A', sub: 'Assigned form class', icon: Users, color: 'text-[#7b1d3c] bg-maroon/10' },
    { label: 'Class Size', value: classSize, sub: 'Total students in class', icon: Users, color: 'text-[#7b1d3c] bg-maroon/10' },
    { label: 'Records Graded', value: gradedCount, sub: 'Total subject entries', icon: ClipboardList, color: 'text-sky-600 bg-sky-50' },
    { label: 'Class Average', value: `${classPercentage.toFixed(1)}%`, sub: 'Overall academic score', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <DashboardShell
      title="Class Teacher Dashboard"
      navItems={CLASS_TEACHER_NAV}
      portalLabel="Class Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        {/* Welcome Banner */}
        <div
          className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7b1d3c 0%, #9b2d54 60%, #b23b68 100%)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Class Teacher Dashboard
              </p>
              <h2 className="text-xl font-bold">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h2>
              <p className="text-white/70 text-sm mt-1">
                You are managing class <span className="font-bold underline">{user?.classTeacherOf}</span>. You can input grades, manage positions, and publish calculated term reports.
              </p>
            </div>
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <Award className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{card.label}</span>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-foreground">{loading ? '—' : card.value}</h3>
                <p className="text-xs text-text-muted mt-1">{card.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Main Panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-4">Class Management</h3>
            <div className="space-y-3">
              <Link
                href="/teacher/class-teacher/results"
                className="flex items-center gap-3 rounded-xl px-4 py-4 border border-border bg-card-2 hover:bg-border/20 transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-maroon/10 text-maroon">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Termly Result Sheets &amp; Positions</p>
                  <p className="text-xs text-text-secondary">Fully calculate final term scores, position rankings, and submit report cards.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/teacher/my-class"
                className="flex items-center gap-3 rounded-xl px-4 py-4 border border-border bg-card-2 hover:bg-border/20 transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Class Roster &amp; Student List</p>
                  <p className="text-xs text-text-secondary">Inspect student details, profile information, and login history in your class.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </Card>

          {/* Nigerian Grading Guide */}
          <Card className="p-6">
            <h3 className="font-semibold text-foreground mb-3">Nigerian Secondary School Grading Scheme</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border font-semibold text-text-secondary">
                    <th className="py-2">Range</th>
                    <th className="py-2">Grade</th>
                    <th className="py-2">Point</th>
                    <th className="py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-text-secondary">
                  {[
                    { range: '70 - 100', grade: 'A', point: '5', remark: 'Excellent' },
                    { range: '60 - 69', grade: 'B', point: '4', remark: 'Very Good' },
                    { range: '50 - 59', grade: 'C', point: '3', remark: 'Good / Credit' },
                    { range: '45 - 49', grade: 'D', point: '2', remark: 'Pass' },
                    { range: '40 - 44', grade: 'E', point: '1', remark: 'Fair / Pass' },
                    { range: '0 - 39', grade: 'F', point: '0', remark: 'Fail' },
                  ].map((row) => (
                    <tr key={row.grade}>
                      <td className="py-2 font-mono">{row.range}</td>
                      <td className="py-2 font-bold text-foreground">{row.grade}</td>
                      <td className="py-2 font-mono">{row.point}</td>
                      <td className="py-2">{row.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
