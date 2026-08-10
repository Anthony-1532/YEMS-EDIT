'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  GraduationCap, ClipboardList, ListChecks, NotebookPen, FileBarChart,
  ArrowRight, Clock, Award, Calendar, ChevronRight, HelpCircle,
  BookOpen, Sparkles, TrendingUp, CheckCircle, ArrowUpRight, ArrowLeftRight
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/AuthContext';
import { examsApi, notesApi, assignmentsApi, resultsApi } from '@/lib/api/resources';
import type { Exam, Note, Assignment, ResultRecord } from '@/lib/api/types';

export default function StudentOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [examsData, notesData, assignmentsData, resultsData] = await Promise.all([
          examsApi.getAll(),
          notesApi.getAll(),
          assignmentsApi.getAll(),
          resultsApi.getAll()
        ]);

        if (!active) return;
        setExams(examsData);
        setNotes(notesData);
        setAssignments(assignmentsData);
        setResults(resultsData);
      } catch (err) {
        console.error('Failed to load student overview data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  const upcomingAssignments = assignments
    .filter((a) => a.dueDate && new Date(a.dueDate) > new Date())
    .slice(0, 4);

  const uncompletedExams = useMemo(() => {
    const completedExamIds = new Set(
      results.filter((r) => r.examId).map((r) => String(r.examId))
    );
    return exams.filter((e) => !completedExamIds.has(e.id));
  }, [exams, results]);

  const stats = [
    { 
      label: 'Pending Assignments', 
      value: assignments.length, 
      icon: ClipboardList, 
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
      description: 'Tasks to submit',
      href: '/student/assignments' 
    },
    { 
      label: 'Active Exams', 
      value: uncompletedExams.length, 
      icon: ListChecks, 
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
      description: 'Live tests available',
      href: '/student/exams' 
    },
    { 
      label: 'Study Notes Uploaded', 
      value: notes.length, 
      icon: NotebookPen, 
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
      description: 'Class study materials',
      href: '/student/notes' 
    },
    { 
      label: 'My Graded Results', 
      value: results.length, 
      icon: FileBarChart, 
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400',
      description: 'Graded performance',
      href: '/student/results' 
    },
  ];

  return (
    <DashboardShell
      title="Student Dashboard"
      navItems={STUDENT_NAV}
      portalLabel="Student Portal"
      allowedRoles={['student', 'parent', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        
        {/* Welcome Banner */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden mb-6 shadow-xl border border-white/10 group"
          style={{
            background: 'linear-gradient(135deg, #7b1d3c 0%, #5e1530 50%, #290614 100%)',
          }}
        >
          {/* Animated decorative blobs in background */}
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:bg-rose-500/20 transition-all duration-1000" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 rounded-full bg-purple-600/10 blur-2xl pointer-events-none -ml-10 -mb-10" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-rose-200 border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Academic Profile
                </span>
                {user?.admissionNo && (
                  <span className="bg-maroon-dark/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white/95 border border-white/5">
                    No: {user.admissionNo}
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {greeting}, {user?.name?.split(' ')[0]}!
                </h2>
                <p className="text-white/80 text-sm sm:text-base max-w-xl font-medium">
                  Welcome to your dashboard. You have <span className="text-rose-300 font-bold underline underline-offset-4">{uncompletedExams.length} active exams</span> and <span className="text-amber-300 font-bold">{assignments.length} pending assignments</span>.
                </p>
              </div>

              {/* Term progress widget removed: no backend source for term/week data.
                  Reintroduce once an academic-calendar endpoint exists. */}
            </div>

            <div className="flex shrink-0 items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md self-start md:self-auto">
              <div className="relative">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-xl font-black text-white shadow-md">
                    {user?.name?.slice(0, 1) || 'S'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#5e1530]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-snug">{user?.name}</p>
                <p className="text-xs text-rose-200 capitalize font-medium">{user?.role} Portal</p>
                <p className="text-[10px] text-white/60 mt-1 font-semibold bg-white/10 px-2 py-0.5 rounded-md inline-block">
                  Class: {user?.class || 'JSS1'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="block transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5">
                <Card className="flex items-center gap-4 py-5 px-6 border-border/60 shadow-sm bg-card hover:border-maroon/20 hover:shadow-md">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.color}`}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{stat.label}</p>
                    <p className="stat-value text-2xl font-black text-foreground mt-0.5">
                      {loading ? '—' : stat.value}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">{stat.description}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Active Assessments & Announcements */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Assessments Timeline */}
            <Card className="border-border/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-maroon" />
                  Current Term Assessments
                </h3>
                <Link href="/student/exams" className="text-xs font-bold text-maroon hover:underline flex items-center gap-1">
                  View All Exams <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="flex h-36 items-center justify-center">
                  <Clock className="h-6 w-6 animate-spin text-maroon" />
                </div>
              ) : uncompletedExams.length === 0 ? (
                <div className="text-center py-10 text-text-muted space-y-2">
                  <HelpCircle className="h-10 w-10 mx-auto text-text-muted opacity-30" />
                  <p className="text-sm font-semibold">No scheduled exams currently</p>
                  <p className="text-xs max-w-xs mx-auto">Sit back and relax. We&apos;ll notify you once a new test or examination is assigned to your class.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uncompletedExams.slice(0, 4).map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 rounded-2xl border border-border/50 hover:border-maroon/20 hover:bg-card-2/50 transition-all flex flex-col justify-between gap-3 bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            {exam.type || exam.format || 'MCQ'}
                          </span>
                          <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {exam.duration || 60}m
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{exam.title}</h4>
                        <p className="text-xs text-text-muted line-clamp-2">{exam.description || 'No instruction guidelines specified by HOD.'}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                        <span className="text-xs font-bold text-maroon">{exam.subject || 'Core Subject'}</span>
                        <Link
                          href={`/student/exams/${exam.id}`}
                          className="text-xs font-bold bg-maroon text-white hover:bg-maroon-dark px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                        >
                          Start <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Performance Summary / Grades */}
            <Card className="border-border/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Recent Grades &amp; Transcripts
                </h3>
                <Link href="/student/results" className="text-xs font-bold text-maroon hover:underline flex items-center gap-1">
                  Full Report Card <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 text-text-muted space-y-2">
                  <Award className="h-10 w-10 mx-auto text-text-muted opacity-30" />
                  <p className="text-sm font-semibold">No graded papers yet</p>
                  <p className="text-xs">Once HOD approves marks lists for classes, your grades will reflect instantly.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.slice(0, 3).map((res) => {
                    const pct = res.totalScore > 0 ? (res.score / res.totalScore) * 100 : 0;
                    let badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/20';
                    if (pct >= 75) badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
                    else if (pct >= 50) badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';

                    return (
                      <div
                        key={res.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:bg-card-2/30 transition-all gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 border border-emerald-500/15">
                            <Award className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground line-clamp-1">{res.examTitle || 'Term Exam / Assessment'}</p>
                            <p className="text-xs text-text-muted">Subject: <span className="font-semibold text-maroon">{res.subject}</span> · Term: {res.term || 'First Term'}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-2 sm:pt-0 border-border/40">
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-black text-foreground">{res.score} / {res.totalScore} Marks</p>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{res.remarks || 'Pass'}</p>
                          </div>
                          <span className={`h-8 w-12 rounded-lg text-xs font-black flex items-center justify-center border ${badgeColor}`}>
                            {res.grade || 'C'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

          </div>

          {/* Sidebar Area: Quick Actions & Deadlines */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card className="border-border/60 shadow-sm p-5">
              <h3 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-maroon" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    href: '/student/exams',
                    icon: ListChecks,
                    title: 'Take Exam',
                    desc: 'Start active assessments',
                    iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/15'
                  },
                  {
                    href: '/student/results',
                    icon: FileBarChart,
                    title: 'View Results',
                    desc: 'Check grades & transcripts',
                    iconColor: 'text-violet-500 bg-violet-500/10 border-violet-500/15'
                  },
                  {
                    href: '/student/notes',
                    icon: NotebookPen,
                    title: 'Study Notes',
                    desc: 'Read uploaded class sheets',
                    iconColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15'
                  },
                  {
                    href: '/student/assignments',
                    icon: ClipboardList,
                    title: 'Assignments',
                    desc: 'Manage tasks and deadlines',
                    iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/15'
                  }
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <Link
                      key={act.href}
                      href={act.href}
                      className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 hover:bg-card-2 border border-border/40 hover:border-maroon/20 transition-all group bg-card"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${act.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground group-hover:text-maroon transition-colors block leading-tight">{act.title}</span>
                        <p className="text-[11px] text-text-muted mt-0.5 leading-none">{act.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-maroon transition-all transform group-hover:translate-x-0.5 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="border-border/60 shadow-sm p-5">
              <h3 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-amber-500" />
                Deadlines Calendar
              </h3>
              
              {loading ? (
                <div className="flex h-28 items-center justify-center">
                  <Clock className="h-5 w-5 animate-spin text-maroon" />
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/50 rounded-2xl">
                  <CheckCircle className="h-7 w-7 text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-foreground">You are fully caught up!</p>
                  <p className="text-[10px] text-text-muted mt-0.5">No upcoming assignment deadlines.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingAssignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href="/student/assignments"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-card-2 border border-border/30 hover:border-border transition-all group bg-card"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{assignment.title}</p>
                        <p className="text-[10px] text-text-muted truncate mt-0.5">Subject: {assignment.subject || 'General'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 justify-end">
                          <Clock className="h-3 w-3" /> {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Soon'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

          </div>

        </div>
      </div>
    </DashboardShell>
  );
}
