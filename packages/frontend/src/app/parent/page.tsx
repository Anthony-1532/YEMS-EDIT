'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, ClipboardList, ListChecks, NotebookPen, FileBarChart,
  ArrowRight, Clock, Award, Calendar, ChevronRight, HelpCircle,
  BookOpen, Sparkles, TrendingUp, CheckCircle, ArrowUpRight,
  Wallet, Receipt, Info, LogOut
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PARENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth/AuthContext';
import { examsApi, notesApi, assignmentsApi, resultsApi, usersApi, accountantApi } from '@/lib/api/resources';
import type { Exam, Note, Assignment, ResultRecord, User, Bill } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function ParentOverviewPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<User | null>(null);
  
  // Linked Child Data
  const [exams, setExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  // UI states
  const [greeting, setGreeting] = useState('Welcome back');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedResult, setSelectedResult] = useState<ResultRecord | null>(null);

  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.studentId) {
      setLoading(false);
      return;
    }

    async function loadParentPortalData() {
      try {
        // 1. Fetch child profile
        const childData = await usersApi.getById(user!.studentId!);
        if (!active) return;
        setChild(childData);

        // 2. Fetch data parallelly using child's id
        const [examsData, notesData, assignmentsData, resultsData, billsData] = await Promise.all([
          examsApi.getAll(),
          notesApi.getAll(),
          assignmentsApi.getAll(),
          resultsApi.getByStudent(user!.studentId!),
          accountantApi.getBills({ studentId: user!.studentId! }).catch(() => [] as Bill[])
        ]);

        if (!active) return;

        // Filter classroom resources by child's class
        const childClass = childData.class || '';
        const filteredExams = examsData.filter((e) => !e.class || e.class === childClass);
        const filteredAssignments = assignmentsData.filter((a) => !a.class || a.class === childClass);
        const filteredNotes = notesData.filter((n) => !n.class || n.class === childClass);

        setExams(filteredExams);
        setNotes(filteredNotes);
        setAssignments(filteredAssignments);
        setResults(resultsData);
        setBills(billsData);
      } catch (err) {
        console.error('Failed to load parent dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadParentPortalData();
    return () => { active = false; };
  }, [user]);

  // Calculations
  const pendingAssignments = assignments.filter(a => a.status !== 'submitted' && a.status !== 'graded');
  const upcomingAssignments = assignments
    .filter((a) => a.dueDate && new Date(a.dueDate) > new Date())
    .slice(0, 4);

  const unpaidBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
  const totalOutstanding = unpaidBills.reduce((sum, b) => sum + Number(b.amount), 0);

  if (!user?.studentId) {
    return (
      <DashboardShell
        title="Parent Overview"
        navItems={PARENT_NAV}
        portalLabel="Parent Portal"
        allowedRoles={['parent']}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
            <HelpCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">No Linked Student Found</h3>
            <p className="text-sm text-text-secondary">
              Your parent account is currently not connected to any student record in our database.
            </p>
            <p className="text-xs text-text-muted">
              Please contact the school administrative office or technician queue to link your account to your ward.
            </p>
          </div>
          <Button onClick={() => logout()} className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Log Out
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Parent Portal"
      navItems={PARENT_NAV}
      portalLabel="Parent Portal"
      allowedRoles={['parent']}
    >
      <div className="space-y-6 fade-in">
        
        {/* Welcome Banner */}
        <div
          className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden mb-6 shadow-xl border border-white/10 group"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #0c1b40 100%)',
          }}
        >
          {/* Animated decorative blobs in background */}
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all duration-1000" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 rounded-full bg-indigo-600/10 blur-2xl pointer-events-none -ml-10 -mb-10" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-blue-200 border border-white/10 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Linked Ward Profile
                </span>
                {child?.admissionNo && (
                  <span className="bg-blue-950/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white/95 border border-white/5">
                    Admission No: {child.admissionNo}
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {greeting}, {user?.name?.split(' ')[0]}!
                </h2>
                <p className="text-white/80 text-sm sm:text-base max-w-xl font-medium">
                  Monitoring academic activities and school finances for your ward, <span className="text-blue-300 font-bold">{child?.name}</span>.
                </p>
              </div>

              {/* Child Academic Stats Summary */}
              <div className="flex items-center gap-4 text-xs text-white/70 pt-1">
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                  <span className="font-bold text-white">{exams.length}</span> Exams
                </div>
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                  <span className="font-bold text-white">{pendingAssignments.length}</span> Tasks Pending
                </div>
                <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                  <span className="font-bold text-white">{results.length}</span> Graded Tests
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md self-start md:self-auto">
              <div className="relative">
                {child?.profilePicture ? (
                  <img src={child.profilePicture} alt={child.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-white/20" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-xl font-black text-white shadow-md">
                    {child?.name?.slice(0, 1) || 'S'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#172554]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-snug">{child?.name}</p>
                <p className="text-xs text-blue-200 capitalize font-medium">Class: {child?.class || 'JSS1'}</p>
                <p className="text-[10px] text-white/60 mt-1 font-semibold bg-white/10 px-2 py-0.5 rounded-md inline-block">
                  Term: {child?.term || 'Second Term'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Financial & Academic Summary Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Billing & School Fees Card */}
          <Card className="p-6 flex flex-col justify-between border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  School Fees &amp; Invoices
                </h3>
                <Badge tone={totalOutstanding > 0 ? 'warning' : 'success'}>
                  {totalOutstanding > 0 ? 'Pending Balance' : 'Fully Paid'}
                </Badge>
              </div>
              
              <div className="p-4 rounded-2xl bg-blue-50/10 border border-blue-500/10 flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Total Outstanding Fees</p>
                  <p className="text-3xl font-black text-foreground mt-1">
                    ₦{loading ? '—' : totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-10 w-full" />
                </div>
              ) : bills.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No tuition or activity invoices generated for this ward.</p>
              ) : (
                <div className="space-y-2">
                  {bills.slice(0, 3).map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => setSelectedBill(bill)}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card-2 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{bill.description}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-foreground">₦{bill.amount.toLocaleString()}</span>
                        <Badge tone={bill.status === 'paid' ? 'success' : 'warning'} className="text-[10px]">
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-border/40 mt-4 flex justify-between items-center text-xs">
              <span className="text-text-muted font-semibold">Make transfers directly to school accounts.</span>
              {bills.length > 0 && unpaidBills.length > 0 && (
                <Button onClick={() => setSelectedBill(unpaidBills[0])} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer">
                  Pay Bill Now
                </Button>
              )}
            </div>
          </Card>

          {/* Ward Grades & Recent Results */}
          <Card className="p-6 border-border/60 shadow-sm bg-card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-500" />
                Ward Results &amp; Reports
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                Report Card
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-10 text-text-muted space-y-2">
                <Award className="h-10 w-10 mx-auto text-text-muted opacity-30" />
                <p className="text-sm font-semibold">No graded test transcripts</p>
                <p className="text-xs max-w-xs mx-auto">Ward results will reflect once the exams team releases final grades for the term.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.slice(0, 4).map((res) => {
                  const pct = res.totalScore > 0 ? (res.score / res.totalScore) * 100 : 0;
                  let gradeTone: 'success' | 'warning' | 'danger' = 'danger';
                  if (pct >= 75) gradeTone = 'success';
                  else if (pct >= 50) gradeTone = 'warning';

                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedResult(res)}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card-2 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{res.examTitle || 'Term Assessment'}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">Subject: <span className="text-maroon font-semibold">{res.subject}</span> · Term: {res.term || '1st'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground">{res.score} / {res.totalScore}</p>
                          <p className="text-[9px] text-text-muted leading-none mt-0.5">{res.remarks || 'Completed'}</p>
                        </div>
                        <Badge tone={gradeTone} className="h-7 w-8 font-black flex items-center justify-center px-0">
                          {res.grade || 'C'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Academic Calendar: Ward's Exams & Homework Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Homework Card */}
          <div className="lg:col-span-2">
            <Card className="p-6 border-border/60 shadow-sm bg-card">
              <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-indigo-500" />
                  Ward Assignments &amp; Tasks
                </h3>
                <span className="text-xs text-text-muted font-bold">
                  Class: {child?.class || 'JSS1'}
                </span>
              </div>

              {loading ? (
                <div className="flex h-36 items-center justify-center">
                  <Clock className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-10 text-text-muted space-y-2">
                  <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 opacity-40" />
                  <p className="text-sm font-semibold">No homework deadlines pending</p>
                  <p className="text-xs">Your ward is fully caught up with class submissions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.slice(0, 4).map((assignment) => {
                    const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
                    return (
                      <div
                        key={assignment.id}
                        className="p-4 rounded-2xl border border-border/50 bg-card hover:border-blue-500/10 hover:bg-card-2/50 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-maroon uppercase tracking-wide">
                              {assignment.subject || 'General'}
                            </span>
                            <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                              {isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{assignment.title}</h4>
                          <p className="text-xs text-text-muted line-clamp-2">{assignment.description || 'Consult subject materials.'}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-text-muted font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" /> Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Ward Assessment Exams Card */}
          <Card className="p-6 border-border/60 shadow-sm bg-card">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-rose-500" />
                Ward Term Exams
              </h3>
            </div>

            {loading ? (
              <div className="flex h-36 items-center justify-center">
                <Clock className="h-6 w-6 animate-spin text-rose-500" />
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-10 text-text-muted space-y-2">
                <HelpCircle className="h-8 w-8 mx-auto text-text-muted opacity-30" />
                <p className="text-xs font-bold">No exam sheets scheduled</p>
                <p className="text-[10px] max-w-xs mx-auto">No tests or exams are active for {child?.class || 'JSS1'} at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 3).map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3.5 rounded-xl border border-border bg-card-2 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/15">
                        {exam.type || 'MCQ'}
                      </span>
                      <span className="text-[10px] text-text-muted font-bold flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {exam.duration || 60}m
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground line-clamp-1">{exam.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Subject: <span className="font-semibold text-maroon">{exam.subjectId || 'Core'}</span></p>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

      </div>

      {/* Bill Payment Invoice Modal */}
      {selectedBill && (
        <Modal
          open={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title="Tuition / Fee Payment Invoice"
          description="Direct bank transfer instructions and bill details"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/15 border border-blue-500/15 text-sm text-foreground space-y-3">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Ward Name:</span>
                <span className="font-bold">{child?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Bill Description:</span>
                <span className="font-bold">{selectedBill.description}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Due Date:</span>
                <span className="font-bold">{selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-base border-t border-border pt-2">
                <span className="font-black text-foreground">Amount Due:</span>
                <span className="font-black text-blue-600">₦{selectedBill.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-3.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-500" /> Direct Bank Transfer Details
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Please transfer the amount shown above to the school bank account. Use the student admission number (<strong className="font-mono">{child?.admissionNo || 'Admission No'}</strong>) as the transfer reference / description.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 text-xs bg-card-2 p-3 rounded-lg border border-border/50">
                <div className="flex justify-between">
                  <span className="text-text-muted">Bank Name:</span>
                  <span className="font-bold text-foreground">Yeshua Schools Trust Bank</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Account Name:</span>
                  <span className="font-bold text-foreground">Yeshua Educational Management System</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Account Number:</span>
                  <span className="font-mono font-bold text-foreground">1234567890</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedBill(null)}
                className="cursor-pointer"
              >
                Close
              </Button>
              {selectedBill.status !== 'paid' && (
                <Button
                  type="button"
                  onClick={async () => {
                    // NOTE: bank details are currently hardcoded and should be
                    // sourced from the accountant settings API once available.
                    const instructions = [
                      'YEMS School Fee Payment',
                      'Bank Name: Yeshua Schools Trust Bank',
                      'Account Name: Yeshua Educational Management System',
                      'Account Number: 1234567890',
                      `Transfer Reference: ${child?.admissionNo || 'Admission No'}`,
                    ].join('\n');
                    try {
                      await navigator.clipboard.writeText(instructions);
                      toast.success('Payment instructions copied. Once the transfer is completed, the Accountant will verify and mark it as Paid.');
                    } catch {
                      toast.error('Could not copy to clipboard — please copy the details manually.');
                    }
                    setSelectedBill(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Copy Payment Instructions
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Result Breakdown Modal */}
      {selectedResult && (
        <Modal
          open={!!selectedResult}
          onClose={() => setSelectedResult(null)}
          title="Graded Exam Assessment Detail"
          description="Detailed score sheet analysis for ward"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50/15 border border-emerald-500/15 text-sm text-foreground space-y-3">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Ward Name:</span>
                <span className="font-bold">{child?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Subject:</span>
                <span className="font-bold text-maroon">{selectedResult.subject}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Test Name:</span>
                <span className="font-bold">{selectedResult.examTitle || 'Continuous Assessment'}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-text-muted font-semibold">Academic Term:</span>
                <span className="font-bold">{selectedResult.term || 'Second Term'} ({selectedResult.session || '2025/2026'})</span>
              </div>
              <div className="flex justify-between text-base border-t border-border pt-2">
                <span className="font-black text-foreground">Grade Achieved:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{selectedResult.score} / {selectedResult.totalScore} Marks</span>
                  <Badge tone={selectedResult.grade === 'A' || selectedResult.grade === 'B' ? 'success' : 'warning'} className="font-black">
                    {selectedResult.grade || 'C'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Teacher Remarks</h4>
              <p className="text-xs text-text-secondary leading-relaxed bg-card-2 p-3 rounded-lg border border-border/50">
                &quot;{selectedResult.remarks || 'No specific notes logged. The ward shows active participation in classroom workshops.'}&quot;
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedResult(null)}
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </DashboardShell>
  );
}
