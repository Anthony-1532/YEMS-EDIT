'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight,
  Trash2, Save, LogOut, Info, HelpCircle, AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth/AuthContext';
import { examsApi, resultsApi } from '@/lib/api/resources';
import { api } from '@/lib/api/client';
import type { Exam } from '@/lib/api/types';
import toast from 'react-hot-toast';

interface Question {
  id: number;
  text: string;
  points: number;
  type: 'mcq' | 'theory';
  options?: string[];
  suggestedWords?: number;
}

export default function ExamSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Exam state
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(-1);
  const [isAutoSaved, setIsAutoSaved] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warningsCount, setWarningsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Active saving enabled.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network disconnected! Answers are being cached locally, but you must reconnect to submit.', {
        duration: 8000
      });
    };
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const answersRef = useRef<Record<number, string>>({});
  const examRef = useRef<Exam | null>(null);
  const questionsRef = useRef<Question[]>([]);
  const submittingRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const endTimeRef = useRef<number | null>(null);
  const lastWarningTimeRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Auto-save debounce ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Core submission logic – reads from refs to avoid stale closures
  // ---------------------------------------------------------------------------
  const triggerSubmission = useCallback(async (force = false) => {
    if (hasSubmittedRef.current || submittingRef.current) return;
    submittingRef.current = true;
    hasSubmittedRef.current = true;
    setSubmitting(true);

    const currentExam = examRef.current;
    const currentAnswers = answersRef.current;

    try {
      if (!currentExam) return;
      if (!user?.id) {
        toast.error('You must be logged in to submit this exam.');
        hasSubmittedRef.current = false;
        submittingRef.current = false;
        return;
      }

      await examsApi.submit(currentExam.id, user.id, currentAnswers);
      
      // Clear session from localStorage on successful submit
      localStorage.removeItem(`exam_session_${currentExam.id}`);
      
      toast.success('Assessment submitted successfully!');
      router.replace('/student/exams');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit exam sheet');
      if (!force) {
        hasSubmittedRef.current = false;
        submittingRef.current = false;
      }
    } finally {
      setSubmitting(false);
      setIsSubmitModalOpen(false);
    }
  }, [user, router]);

  // Keyboard shortcuts for MCQ exam interface
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (submitting || isSubmitModalOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      const current = questions[currentQIndex];

      if (key === 'n' && currentQIndex < questions.length - 1) {
        e.preventDefault();
        setCurrentQIndex((prev) => prev + 1);
      } else if (key === 'p' && currentQIndex > 0) {
        e.preventDefault();
        setCurrentQIndex((prev) => prev - 1);
      } else if (current.type === 'mcq' && current.options) {
        const optionIndex = { a: 0, b: 1, c: 2, d: 3 }[key];
        if (optionIndex !== undefined && optionIndex < current.options.length) {
          e.preventDefault();
          handleAnswerChange(current.options[optionIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQIndex, questions, submitting, isSubmitModalOpen]);

  // Load exam data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [data, results] = await Promise.all([
          examsApi.getById(id),
          resultsApi.getAll()
        ]);
        if (!active) return;

        // Check if there is already a result for this exam
        const alreadyTaken = results.some((r) => String(r.examId) === id);
        if (alreadyTaken) {
          toast.error('You have already completed this assessment!');
          router.replace('/student/exams');
          return;
        }

        setExam(data);
        examRef.current = data;

        // Select questions based on format
        const format = data.type || data.format || '';
        const isTheory = format.toLowerCase().includes('theory') || format.toLowerCase().includes('written');
        
        const qListFromDb = (data.questionsList || data.questions) as any[];
        if (!qListFromDb || qListFromDb.length === 0) {
          toast.error('This exam has no questions configured.');
          router.replace('/student/exams');
          return;
        }

        const resolvedQuestions: Question[] = qListFromDb.map((q, idx) => ({
          id: idx + 1,
          type: q.type || (isTheory ? 'theory' : 'mcq'),
          points: q.marks || q.points || 5,
          text: q.text || q.question || '',
          options: q.options || [],
          suggestedWords: q.suggestedWords || 200,
        }));
        setQuestions(resolvedQuestions);
        questionsRef.current = resolvedQuestions;

        // Load or initialize local storage state
        const storageKey = `exam_session_${id}`;
        const cached = localStorage.getItem(storageKey);
        let resolvedAnswers: Record<number, string> = {};
        let resolvedEndTime = 0;
        let resolvedWarnings = 0;

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            resolvedAnswers = parsed.answers || {};
            resolvedEndTime = parsed.endTime || 0;
            resolvedWarnings = parsed.warnings || 0;
          } catch (e) {
            console.error('Failed to parse cached exam session:', e);
          }
        }

        if (!resolvedEndTime || resolvedEndTime < Date.now()) {
          const durationMins = data.duration || 60;
          resolvedEndTime = Date.now() + durationMins * 60 * 1000;
        }

        endTimeRef.current = resolvedEndTime;
        setAnswers(resolvedAnswers);
        answersRef.current = resolvedAnswers;
        setWarningsCount(resolvedWarnings);
        
        const secondsRemaining = Math.max(0, Math.floor((resolvedEndTime - Date.now()) / 1000));
        setTimeLeft(secondsRemaining);

        localStorage.setItem(
          storageKey,
          JSON.stringify({
            answers: resolvedAnswers,
            endTime: resolvedEndTime,
            warnings: resolvedWarnings,
          })
        );
      } catch (err) {
        console.error('Failed to load exam details:', err);
        toast.error('Failed to initialize exam session');
        router.replace('/student/exams');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, router]);

  // ---------------------------------------------------------------------------
  // Back-navigation guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading || !exam) return;

    window.history.pushState({ examGuard: true }, '');

    const handlePopState = () => {
      window.history.pushState({ examGuard: true }, '');
      toast.error('You cannot go back during an active exam session.');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [loading, exam]);

  // ---------------------------------------------------------------------------
  // Page-exit / tab-close warnings
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading || !exam) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasSubmittedRef.current) return;
      e.preventDefault();
      e.returnValue = 'Your exam is still in progress. Leaving will submit your current answers.';
      return e.returnValue;
    };

    const handleTabLeave = () => {
      if (hasSubmittedRef.current) return;
      const now = Date.now();
      if (now - lastWarningTimeRef.current < 2000) return; // rate limit warnings
      lastWarningTimeRef.current = now;
      
      setWarningsCount((prev) => {
        const next = prev + 1;
        
        const storageKey = `exam_session_${id}`;
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            parsed.warnings = next;
            localStorage.setItem(storageKey, JSON.stringify(parsed));
          } catch (e) {
            console.error(e);
          }
        }
        
        toast.error(`Warning: You left the exam screen! This activity is logged (${next} warnings).`, {
          duration: 5000,
        });

        // Publish to technician telemetry channel
        api.post('/technician/telemetry/event', {
          type: 'tab-leave',
          details: {
            examId: id,
            examTitle: examRef.current?.title || 'Exam',
            warningCount: next,
            timestamp: Date.now()
          }
        }).catch(() => {});
        
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleTabLeave();
      }
    };

    const handleBlur = () => {
      handleTabLeave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [loading, exam, id]);

  // ---------------------------------------------------------------------------
  // Countdown timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (timeLeft < 0 || loading || !exam) return;

    if (timeLeft === 0) {
      if (!hasSubmittedRef.current) {
        toast.error('Time limit reached! Auto-submitting your work.');
        triggerSubmission(true);
      }
      return;
    }

    const timer = setInterval(() => {
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(timer);
        }
      } else {
        setTimeLeft((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, exam, timeLeft, triggerSubmission]);

  // ---------------------------------------------------------------------------
  // Format time (HH:MM:SS or MM:SS)
  // ---------------------------------------------------------------------------
  const formatTime = () => {
    const t = Math.max(0, timeLeft);
    const hours = Math.floor(t / 3600);
    const mins = Math.floor((t % 3600) / 60);
    const secs = t % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hours > 0 ? `${pad(hours)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  // ---------------------------------------------------------------------------
  // Answer change with debounced auto-save – FIX #7
  // ---------------------------------------------------------------------------
  const handleAnswerChange = (answer: string) => {
    setIsAutoSaved(false);
    const qId = questions[currentQIndex].id;
    
    const nextAnswers = { ...answersRef.current, [qId]: answer };
    setAnswers(nextAnswers);
    answersRef.current = nextAnswers;

    const storageKey = `exam_session_${id}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        parsed.answers = nextAnswers;
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      } catch (e) {
        console.error(e);
      }
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setIsAutoSaved(true);
    }, 800);
  };

  // ---------------------------------------------------------------------------
  // Sidebar exit – confirm then submit (don't just navigate away) – FIX #6
  // ---------------------------------------------------------------------------
  const handleExitRequest = () => {
    if (confirm('Exit exam? Your current answers will be submitted immediately.')) {
      triggerSubmission(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#070305] text-white">
        <div className="flex flex-col items-center gap-3">
          <Clock className="h-8 w-8 animate-spin text-maroon" />
          <p className="text-sm font-semibold">Initializing secure exam room...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) return null;

  const currentQ = questions[currentQIndex];
  const totalQuestions = questions.length;
  const currentAnswer = answers[currentQ.id] || '';
  const isTheory = currentQ.type === 'theory';

  return (
    <div className="flex h-screen w-full flex-col bg-[#070305] text-white overflow-hidden">
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse select-none z-30 shrink-0">
          <AlertTriangle className="h-4 w-4" />
          You are currently offline. Answers are saved locally, but you must reconnect to submit.
        </div>
      )}
      {/* Exam Header */}
      <header className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 z-20 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#7b1d3c] flex items-center justify-center text-white font-black">Y</div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight leading-tight truncate max-w-[200px] sm:max-w-xs">{exam.title}</h1>
            <span className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold block mt-0.5">
              {exam.subjectId || 'Core Subject'} · {isTheory ? 'Section B: Written Theory' : 'Section A: Objectives'}
            </span>
          </div>
        </div>

        {/* Center Logo */}
        <div className="hidden md:flex items-center gap-2">
          <img src="/assets/logo.jpg" alt="School Logo" className="h-[32px] rounded-md object-contain opacity-85" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">Yeshua Platform</span>
        </div>

        {/* Right Info & Timer */}
        <div className="flex items-center gap-4">
          {warningsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Warnings: {warningsCount}</span>
            </div>
          )}

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${
            timeLeft >= 0 && timeLeft < 300
              ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse'
              : 'text-[#9b2d54] bg-[#9b2d54]/10 border-[#9b2d54]/20'
          }`}>
            <Clock className="h-4 w-4 shrink-0" />
            <span className="font-mono">{timeLeft < 0 ? '--:--' : formatTime()}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-text-secondary">ID: {user?.admissionNo || '—'}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/10">
              {user?.name?.split(' ').map((n) => n[0]).join('') || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar question navigator */}
        <aside className="w-64 border-r border-white/5 bg-black/20 flex flex-col justify-between shrink-0 hidden lg:flex">
          <div className="p-6 space-y-6">
            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Sections</span>
              <div className={`p-3 rounded-xl border mb-2 transition-all ${
                !isTheory
                  ? 'bg-white/[0.04] border-white/10 text-white font-semibold'
                  : 'bg-transparent border-transparent text-text-secondary'
              }`}>
                <p className="text-xs">Section A: Objectives</p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {!isTheory
                    ? `${totalQuestions} Question${totalQuestions === 1 ? '' : 's'} · Active`
                    : '— · Done'}
                </p>
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                isTheory
                  ? 'bg-white/[0.04] border-white/10 text-white font-semibold'
                  : 'bg-transparent border-transparent text-text-secondary'
              }`}>
                <p className="text-xs">Section B: Theory</p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {isTheory
                    ? `${totalQuestions} Question${totalQuestions === 1 ? '' : 's'} · Active`
                    : '— · Locked'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Question Navigator</span>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isActive = idx === currentQIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-9 w-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-maroon border border-maroon text-white shadow-lg'
                          : isAnswered
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                            : 'bg-white/5 border border-white/5 text-text-secondary hover:border-white/10'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FIX #6: Exit submits rather than silently navigating away */}
          <div className="p-6 border-t border-white/5 space-y-2">
            <button
              onClick={handleExitRequest}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Submit & Exit
            </button>
          </div>
        </aside>

        {/* Question Area */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto bg-black/10">
          <div className="p-6 md:p-8 space-y-6 max-w-3xl w-full mx-auto">
            {/* Breadcrumb info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs uppercase tracking-widest text-[#9b2d54] font-bold">
                {isTheory ? 'Section B Theory' : 'Section A Objective'} › Question {currentQIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/15">
                {currentQ.points} Points
              </span>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 leading-relaxed text-base md:text-lg font-medium text-white shadow-md">
                {currentQ.text}
              </div>
              {isTheory && currentQ.suggestedWords && (
                <p className="text-xs text-text-muted italic flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Suggested response length: {currentQ.suggestedWords} words.
                </p>
              )}
            </div>

            {/* Answer Editor / Selection */}
            <div>
              {currentQ.type === 'mcq' && currentQ.options ? (
                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const isSelected = currentAnswer === opt;
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3.5 p-4 rounded-xl border cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'bg-maroon/10 border-maroon text-white font-semibold shadow-inner'
                            : 'bg-white/[0.01] border-white/5 text-white/85 hover:border-white/10 hover:bg-white/[0.03]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQ.id}`}
                          value={opt}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(opt)}
                          className="w-4 h-4 rounded border-gray-300 text-maroon focus:ring-maroon/20 accent-[#7b1d3c] cursor-pointer"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted px-1.5">
                    <span>Write theory response below</span>
                    <span className={`flex items-center gap-1 font-bold ${isAutoSaved ? 'text-emerald-500' : 'text-sky-400'}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {isAutoSaved ? 'AUTO-SAVED' : 'SAVING...'}
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    placeholder="Type your answer response here..."
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Navigation Bar */}
          <footer className="h-16 border-t border-white/5 bg-black/40 px-6 flex items-center justify-between shrink-0 select-none">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAnswerChange('')}
                className="text-xs text-rose-400 border-rose-500/10 hover:border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Response
              </Button>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.success('Draft saved successfully!')}
                className="text-xs border-white/20 hover:border-white/30 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" /> Save Draft
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => prev - 1)}
                className="text-xs flex items-center gap-1 border-white/20 hover:border-white/30 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>

              {currentQIndex < totalQuestions - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentQIndex((prev) => prev + 1)}
                  className="bg-maroon hover:bg-maroon-dark text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Submit Exam
                </Button>
              )}
            </div>
          </footer>
        </main>
      </div>

      {/* Confirmation Submit Modal – FIX #8: use boolean false, not null cast */}
      <Modal
        open={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Assessment?"
        description="Are you absolutely sure you want to finalize your exam?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-100 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-950 font-sans">Final Action</p>
              <p className="mt-0.5 leading-relaxed font-sans">Once submitted, you cannot modify or rewrite your answers. Your sheet will be locked and sent directly to grading.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="secondary"
              onClick={() => setIsSubmitModalOpen(false)}
              className="cursor-pointer"
            >
              Review Answers
            </Button>
            <Button
              onClick={() => triggerSubmission(false)}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Clock className="h-4 w-4 animate-spin" />}
              Yes, Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
