'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList, ListChecks, FileBarChart, NotebookPen, ScrollText, Users, BookOpen,
  ArrowRight, Plus, TrendingUp,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card, StatCard } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/AuthContext';
import { examsApi, notesApi, assignmentsApi, resultsApi, schemesApi, lessonPlansApi, teacherApi } from '@/lib/api/resources';

interface Stats {
  exams: number;
  notes: number;
  assignments: number;
  results: number;
  schemes: number;
  lessonPlans: number;
  classStudents: number;
}

export default function TeacherOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    exams: 0, notes: 0, assignments: 0, results: 0, schemes: 0, lessonPlans: 0, classStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [exams, notes, assignments, results, schemes, lessonPlans] = await Promise.allSettled([
          examsApi.getAll(),
          notesApi.getAll(),
          assignmentsApi.getAll(),
          resultsApi.getAll(),
          schemesApi.getAll(),
          lessonPlansApi.getAll(),
        ]);

        let classStudents = 0;
        if (user?.classTeacherOf) {
          try {
            const students = await teacherApi.getMyClass(user.classTeacherOf);
            classStudents = students.length;
          } catch { /* ignore */ }
        }

        if (!active) return;
        setStats({
          exams: exams.status === 'fulfilled' ? exams.value.length : 0,
          notes: notes.status === 'fulfilled' ? notes.value.length : 0,
          assignments: assignments.status === 'fulfilled' ? assignments.value.length : 0,
          results: results.status === 'fulfilled' ? results.value.length : 0,
          schemes: schemes.status === 'fulfilled' ? schemes.value.length : 0,
          lessonPlans: lessonPlans.status === 'fulfilled' ? lessonPlans.value.length : 0,
          classStudents,
        });
      } catch { /* ignore */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

  const statCards = [
    { label: 'Exams', value: stats.exams, icon: ListChecks, href: '/teacher/exams', color: 'bg-sky-50 text-sky-600' },
    { label: 'Notes', value: stats.notes, icon: NotebookPen, href: '/teacher/notes', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Assignments', value: stats.assignments, icon: ClipboardList, href: '/teacher/assignments', color: 'bg-amber-50 text-amber-600' },
    { label: 'Results Entered', value: stats.results, icon: FileBarChart, href: '/teacher/results', color: 'bg-violet-50 text-violet-600' },
    { label: 'Schemes of Work', value: stats.schemes, icon: ScrollText, href: '/teacher/schemes', color: 'bg-rose-50 text-rose-600' },
    { label: 'Lesson Plans', value: stats.lessonPlans, icon: BookOpen, href: '/teacher/lesson-plans', color: 'bg-cyan-50 text-cyan-600' },
    { label: 'My Class Size', value: stats.classStudents, icon: Users, href: '/teacher/my-class', color: 'bg-maroon/10 text-maroon' },
  ];

  const quickActions = [
    { label: 'Add Note', href: '/teacher/notes', icon: NotebookPen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'New Assignment', href: '/teacher/assignments', icon: ClipboardList, color: 'bg-amber-50 text-amber-600' },
    { label: 'Create Exam', href: '/teacher/exams', icon: ListChecks, color: 'bg-sky-50 text-sky-600' },
    { label: 'Enter Results', href: '/teacher/results', icon: FileBarChart, color: 'bg-violet-50 text-violet-600' },
    { label: 'Add Scheme', href: '/teacher/schemes', icon: ScrollText, color: 'bg-rose-50 text-rose-600' },
    { label: 'Create Lesson Plan', href: '/teacher/lesson-plans', icon: BookOpen, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'My Class', href: '/teacher/my-class', icon: Users, color: 'bg-maroon/10 text-maroon' },
  ];

  return (
    <DashboardShell
      title="Teacher Dashboard"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        {/* Welcome Banner */}
        <div
          className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Teacher Portal
              </p>
              <h2 className="text-xl font-bold">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h2>
              <p className="text-white/70 text-sm mt-1">
                {user?.classTeacherOf
                  ? `Class teacher of ${user.classTeacherOf} · Here's your overview`
                  : "Here's your teaching overview"}
              </p>
            </div>
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card, i) => (
            <Link key={card.label} href={card.href} style={{ animationDelay: `${i * 50}ms` }} className="fade-in">
              <Card hover className="flex flex-col items-center gap-2 py-5 text-center">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="stat-value text-2xl font-extrabold">{loading ? '—' : card.value}</p>
                <p className="text-xs text-text-secondary leading-tight">{card.label}</p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
              <Plus className="h-4 w-4 text-text-muted" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 hover:bg-card-2 group border border-transparent hover:border-border"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Class Info */}
          {user?.classTeacherOf ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">My Class</h3>
                <Link href="/teacher/my-class" className="text-xs text-maroon hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-maroon/10 mb-3">
                  <Users className="h-8 w-8 text-maroon" />
                </div>
                <p className="text-3xl font-bold text-foreground">{loading ? '—' : stats.classStudents}</p>
                <p className="text-sm text-text-secondary mt-1">
                  Students in <span className="font-semibold text-maroon">{user.classTeacherOf}</span>
                </p>
                <Link
                  href="/teacher/my-class"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-dark transition-colors"
                >
                  Manage Class <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <h3 className="font-semibold text-foreground mb-4">Tips</h3>
              <div className="space-y-3">
                {[
                  { label: 'Create an exam', desc: 'Set up assessments for your class', href: '/teacher/exams' },
                  { label: 'Upload notes', desc: 'Share lesson notes with students', href: '/teacher/notes' },
                  { label: 'Grade assignments', desc: 'Record scores and feedback', href: '/teacher/results' },
                ].map((tip) => (
                  <Link
                    key={tip.href}
                    href={tip.href}
                    className="flex items-start gap-3 rounded-xl p-3 hover:bg-card-2 transition-colors group"
                  >
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-maroon shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-maroon transition-colors">{tip.label}</p>
                      <p className="text-xs text-text-muted">{tip.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
