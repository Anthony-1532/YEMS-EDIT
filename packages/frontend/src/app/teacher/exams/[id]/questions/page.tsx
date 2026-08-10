'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Plus, Trash2, HelpCircle, Save,
  CheckCircle, List, ArrowLeft, Loader2, Sparkles, CheckSquare, Info,
  ChevronUp, ChevronDown, Upload, FileSpreadsheet, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { examsApi } from '@/lib/api/resources';
import type { Exam } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';

interface QuestionItem {
  id: string;
  text: string;
  type: 'mcq' | 'theory';
  options?: string[];
  points?: number;
  correctIndex?: number;
  suggestedWords?: number;
}

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Draft / Not Started' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active / Live' },
  { value: 'completed', label: 'Completed / Closed' },
];

export default function TeacherExamQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('not-started');
  const [showResults, setShowResults] = useState<boolean>(false);
  
  // Saving states
  const [saving, setSaving] = useState(false);

  // Form states for the selected question
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'mcq' | 'theory'>('mcq');
  const [qPoints, setQPoints] = useState(5);
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState(0);
  const [qWords, setQWords] = useState(200);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Load Exam
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await examsApi.getById(id);
        if (!active) return;
        setExam(data);
        setStatus(data.status || 'not-started');
        setShowResults(!!data.showResults);

        // Extract questionsList or fallback to questions
        const list = (data.questionsList || data.questions || []) as any[];
        const normalized: QuestionItem[] = list.map((q, idx) => ({
          id: q.id || String(idx + 1),
          text: q.text || q.question || '',
          type: q.type || (data.format === 'theory' ? 'theory' : 'mcq'),
          options: q.options || ['', '', '', ''],
          points: q.marks || q.points || 5,
          correctIndex: q.correctIndex !== undefined ? q.correctIndex : (q.correct !== undefined ? q.correct : 0),
          suggestedWords: q.suggestedWords || 200,
        }));
        
        setQuestions(normalized);
        if (normalized.length > 0) {
          setSelectedIdx(0);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load exam details');
        router.push('/teacher/exams');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, router]);

  // Sync the form fields when selected question changes
  useEffect(() => {
    if (selectedIdx === null || selectedIdx >= questions.length) {
      // Clear form
      setQText('');
      setQType('mcq');
      setQPoints(5);
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
      setQCorrect(0);
      setQWords(200);
      return;
    }

    const q = questions[selectedIdx];
    setQText(q.text);
    setQType(q.type || 'mcq');
    setQPoints(q.points || 5);
    if (q.options) {
      setQOptA(q.options[0] || '');
      setQOptB(q.options[1] || '');
      setQOptC(q.options[2] || '');
      setQOptD(q.options[3] || '');
    } else {
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
    }
    setQCorrect(q.correctIndex ?? 0);
    setQWords(q.suggestedWords || 200);
  }, [selectedIdx, questions]);

  const [isDirty, setIsDirty] = useState(false);

  // Sync inputs with list state immediately on change
  const handleTextChange = (val: string) => {
    setQText(val);
    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[selectedIdx] = { ...updated[selectedIdx], text: val };
        return updated;
      });
      setIsDirty(true);
    }
  };

  const handleTypeChange = (val: 'mcq' | 'theory') => {
    setQType(val);
    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[selectedIdx] = {
          ...updated[selectedIdx],
          type: val,
          options: val === 'mcq' ? [qOptA, qOptB, qOptC, qOptD] : undefined,
          correctIndex: val === 'mcq' ? qCorrect : undefined,
          suggestedWords: val === 'theory' ? qWords : undefined,
        };
        return updated;
      });
      setIsDirty(true);
    }
  };

  const handlePointsChange = (val: number) => {
    setQPoints(val);
    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[selectedIdx] = { ...updated[selectedIdx], points: val };
        return updated;
      });
      setIsDirty(true);
    }
  };

  const handleOptionChange = (optIdx: number, val: string) => {
    if (optIdx === 0) setQOptA(val);
    if (optIdx === 1) setQOptB(val);
    if (optIdx === 2) setQOptC(val);
    if (optIdx === 3) setQOptD(val);

    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        const q = { ...updated[selectedIdx] };
        const opts = [...(q.options || ['', '', '', ''])];
        opts[optIdx] = val;
        q.options = opts;
        updated[selectedIdx] = q;
        return updated;
      });
      setIsDirty(true);
    }
  };

  const handleSelectCorrectIndex = (val: number) => {
    setQCorrect(val);
    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[selectedIdx] = { ...updated[selectedIdx], correctIndex: val };
        return updated;
      });
      setIsDirty(true);
    }
  };

  const handleWordsChange = (val: number) => {
    setQWords(val);
    if (selectedIdx !== null) {
      setQuestions((prev) => {
        const updated = [...prev];
        updated[selectedIdx] = { ...updated[selectedIdx], suggestedWords: val };
        return updated;
      });
      setIsDirty(true);
    }
  };

  // Add new blank question
  const handleAddQuestion = () => {
    const newQ: QuestionItem = {
      id: `q-${Date.now()}`,
      text: 'New Question...',
      type: exam?.format === 'theory' ? 'theory' : 'mcq',
      points: 5,
      options: ['', '', '', ''],
      correctIndex: 0,
      suggestedWords: 200,
    };
    
    const newQuestions = [...questions, newQ];
    setQuestions(newQuestions);
    setSelectedIdx(newQuestions.length - 1);
    setIsDirty(true);
    toast.success('New question added to list');
  };

  // Delete question
  const handleDeleteQuestion = (idxToDelete: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    const filtered = questions.filter((_, idx) => idx !== idxToDelete);
    setQuestions(filtered);
    setIsDirty(true);
    
    if (filtered.length === 0) {
      setSelectedIdx(null);
    } else if (selectedIdx !== null && selectedIdx >= filtered.length) {
      setSelectedIdx(filtered.length - 1);
    }
    toast.success('Question removed');
  };

  // Move question up or down inside list (reordering)
  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    
    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[nextIdx];
    updated[nextIdx] = temp;
    
    setQuestions(updated);
    setIsDirty(true);
    if (selectedIdx === idx) {
      setSelectedIdx(nextIdx);
    } else if (selectedIdx === nextIdx) {
      setSelectedIdx(idx);
    }
    toast.success('Question reordered');
  };

  // Parsing pasted bulk lines
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      toast.error('Please paste your questions text');
      return;
    }
    
    try {
      const lines = bulkText.split('\n').filter(line => line.trim());
      const parsedList: QuestionItem[] = [];
      const isTheory = exam?.format === 'theory';
      
      lines.forEach((line, index) => {
        // Expected format: Question prompt? | Option A, Option B, Option C, Option D | Correct Index (0-3)
        const parts = line.split('|').map(p => p.trim());
        const qTextParsed = parts[0];
        
        if (!qTextParsed) return;
        
        if (parts.length >= 3 && !isTheory) {
          // MCQ
          const opts = parts[1].split(',').map(o => o.trim());
          const correctIdx = Number(parts[2]) || 0;
          parsedList.push({
            id: `q-bulk-${Date.now()}-${index}`,
            text: qTextParsed,
            type: 'mcq',
            points: 5,
            options: opts.length >= 4 ? opts : [...opts, '', '', '', ''].slice(0, 4),
            correctIndex: correctIdx,
          });
        } else {
          // Theory / generic fallback
          parsedList.push({
            id: `q-bulk-${Date.now()}-${index}`,
            text: qTextParsed,
            type: isTheory ? 'theory' : 'mcq',
            points: 5,
            options: isTheory ? undefined : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: isTheory ? undefined : 0,
            suggestedWords: 200,
          });
        }
      });
      
      if (parsedList.length === 0) {
        toast.error('No valid questions parsed. Check format.');
        return;
      }
      
      const updated = [...questions, ...parsedList];
      setQuestions(updated);
      setSelectedIdx(updated.length - parsedList.length);
      setIsBulkModalOpen(false);
      setBulkText('');
      setIsDirty(true);
      toast.success(`Bulk imported ${parsedList.length} questions successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Import failed. Please check your text formats.');
    }
  };

  // Save changes to database
  const handleSaveToDatabase = async (overrideStatus?: string) => {
    setSaving(true);
    try {
      const payloadStatus = overrideStatus || status;
      
      // Map our questions to match DB schema formats
      const dbQuestions = questions.map((q, idx) => ({
        id: q.id || String(idx + 1),
        text: q.text,
        type: q.type,
        options: q.type === 'mcq' ? (q.options || ['', '', '', '']) : undefined,
        points: q.points,
        correctIndex: q.type === 'mcq' ? q.correctIndex : undefined,
        suggestedWords: q.type === 'theory' ? q.suggestedWords : undefined,
        // duplicate attributes for alternate schemas
        marks: q.points,
        correct: q.correctIndex,
      }));

      await examsApi.update(id, {
        questions: dbQuestions as any,
        questionsList: dbQuestions as any,
        questionsCount: dbQuestions.length,
        status: payloadStatus as any,
        showResults,
      });

      if (overrideStatus) {
        setStatus(overrideStatus);
      }
      
      setIsDirty(false);
      toast.success('Exam questions saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof ApiError ? err.message : 'Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newVal: string) => {
    setStatus(newVal);
    await handleSaveToDatabase(newVal);
  };

  if (loading) {
    return (
      <DashboardShell title="Manage Questions" navItems={TEACHER_NAV} portalLabel="Teacher Portal" allowedRoles={['teacher']}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-maroon" />
        </div>
      </DashboardShell>
    );
  }

  if (!exam) return null;

  return (
    <DashboardShell
      title="Manage Questions"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        {/* Top bar with back and summary details */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/teacher/exams')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Exams
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{exam.title}</h2>
                {isDirty && (
                  <span className="animate-pulse bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap">
                    ● Unsaved changes
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Subject: <span className="font-semibold text-maroon">{(exam.subject as string) || 'N/A'}</span> · Class: <span className="font-semibold">{exam.class || 'N/A'}</span> · Format: <span className="uppercase font-bold">{exam.format || 'MCQ'}</span>
              </p>
            </div>
          </div>

          {/* Exam status manager and save button */}
          <div className="flex flex-wrap items-center gap-3">
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 animate-pulse text-xs font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Unsaved changes
              </span>
            )}
            <div className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-xl bg-card">
              <input
                type="checkbox"
                id="showResults"
                checked={showResults}
                onChange={(e) => setShowResults(e.target.checked)}
                className="w-4 h-4 rounded text-maroon focus:ring-maroon/20 accent-[#7b1d3c] cursor-pointer"
              />
              <label htmlFor="showResults" className="text-xs font-semibold text-text-secondary cursor-pointer select-none">
                Publish results to students
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Exam Status:</span>
              <Select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                options={STATUS_OPTIONS}
                className="w-48 text-sm"
              />
            </div>
            <Button
              onClick={() => handleSaveToDatabase()}
              loading={saving}
              className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save className="h-4 w-4" /> Save All
            </Button>
          </div>
        </div>

        {/* Main interactive grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Question List Sidebar */}
          <Card className="lg:col-span-4 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <List className="h-4 w-4 text-maroon" /> Questions ({questions.length})
              </span>
              <Button
                onClick={handleAddQuestion}
                size="sm"
                className="bg-maroon/10 text-maroon hover:bg-maroon/20 font-bold flex items-center gap-1 cursor-pointer border border-maroon/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add New
              </Button>
            </div>

            {/* UX Assist Actions Bar */}
            <div className="p-1 rounded-xl bg-card-2 border border-border">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-text-secondary hover:text-maroon hover:bg-card transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4 text-blue-500" /> Bulk Paste questions list
              </button>
            </div>

            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-text-muted space-y-2">
                  <HelpCircle className="h-8 w-8 mx-auto opacity-35" />
                  <p className="text-sm">No questions in this exam yet.</p>
                  <p className="text-xs">Use Bulk Paste to add questions quickly.</p>
                </div>
              ) : (
                questions.map((q, idx) => {
                  const isActive = idx === selectedIdx;
                  return (
                     <div
                      key={q.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`group flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-maroon/5 border-maroon shadow-sm'
                          : 'bg-card border-border hover:border-maroon hover:bg-card-2'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-maroon text-white' : 'bg-card-2 border border-border text-text-secondary'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className={`text-sm font-medium leading-normal truncate ${isActive ? 'text-maroon font-semibold' : 'text-foreground'}`}>
                            {q.text || <span className="italic text-text-muted">Empty question text...</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase font-bold text-text-muted bg-card-2 border border-border px-1.5 py-0.5 rounded">
                              {q.type}
                            </span>
                            <span className="text-[10px] text-text-secondary font-semibold">
                              {q.points || 5} Marks
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reordering and deleting buttons */}
                      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-all ml-1.5 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(idx, 'up');
                          }}
                          className="p-1 text-text-muted hover:text-maroon rounded hover:bg-card-hover disabled:opacity-25"
                          title="Move Up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={idx === questions.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestion(idx, 'down');
                          }}
                          className="p-1 text-text-muted hover:text-maroon rounded hover:bg-card-hover disabled:opacity-25"
                          title="Move Down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(idx);
                          }}
                          className="p-1 text-text-muted hover:text-rose-600 rounded hover:bg-rose-500/10"
                          title="Delete Question"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Question Editor Details Panel */}
          <div className="lg:col-span-8 space-y-4">
            {selectedIdx === null ? (
              <Card className="p-12 text-center text-text-muted flex flex-col items-center justify-center space-y-3">
                <Sparkles className="h-10 w-10 text-maroon/40" />
                <h3 className="font-bold text-foreground text-lg">Select a question to edit</h3>
                <p className="text-sm max-w-xs leading-relaxed">
                  Choose an existing question from the sidebar or use the AI Assist / Bulk Paste controls to quickly build your assessments.
                </p>
              </Card>
            ) : (
              <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-xl bg-maroon/10 text-maroon font-black flex items-center justify-center text-sm">
                      Q
                    </span>
                    <h3 className="font-bold text-lg text-foreground">
                      Edit Question {selectedIdx + 1}
                    </h3>
                  </div>
                  <span className="text-xs text-text-muted font-mono bg-card-2 px-2.5 py-1 rounded-full border border-border">
                    ID: {questions[selectedIdx].id}
                  </span>
                </div>

                {/* Question Properties Form */}
                <div className="space-y-4">
                  <Textarea
                    label="Question Text"
                    required
                    value={qText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={4}
                    placeholder="Enter the actual question prompt here..."
                  />
 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Question Format Type"
                      value={qType}
                      onChange={(e) => handleTypeChange(e.target.value as any)}
                      options={[
                        { value: 'mcq', label: 'Multiple Choice (MCQ)' },
                        { value: 'theory', label: 'Written Theory Response' },
                      ]}
                    />
                    <Input
                      label="Marks / Points Weight"
                      type="number"
                      min={1}
                      value={qPoints}
                      onChange={(e) => handlePointsChange(Number(e.target.value))}
                    />
                  </div>
 
                  {/* MCQ Answers Section */}
                  {qType === 'mcq' && (
                    <div className="p-4 rounded-2xl bg-card-2 border border-border space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs uppercase font-bold text-text-secondary tracking-wider">
                          Multiple Choice Options
                        </span>
                        <span className="text-xs text-text-muted italic flex items-center gap-1">
                          <Info className="h-3 w-3" /> Fill options and mark the correct one
                        </span>
                      </div>
 
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option A */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                              <span className={`h-5 w-5 ${qCorrect === 0 ? 'bg-emerald-600' : 'bg-text-muted'} text-white text-[10px] font-bold rounded flex items-center justify-center transition-all`}>
                                A
                              </span>
                              Option A
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSelectCorrectIndex(0)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                qCorrect === 0
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-card-2 text-text-muted border-border hover:bg-border/25'
                              }`}
                            >
                              {qCorrect === 0 ? '✓ Correct Option' : 'Mark as Correct'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qOptA}
                            onChange={(e) => handleOptionChange(0, e.target.value)}
                            placeholder="Option A answer text"
                            className={`w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all ${
                              qCorrect === 0 ? 'border-emerald-500/60 ring-2 ring-emerald-500/5' : 'border-border'
                            }`}
                          />
                        </div>
 
                        {/* Option B */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                              <span className={`h-5 w-5 ${qCorrect === 1 ? 'bg-emerald-600' : 'bg-text-muted'} text-white text-[10px] font-bold rounded flex items-center justify-center transition-all`}>
                                B
                              </span>
                              Option B
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSelectCorrectIndex(1)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                qCorrect === 1
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-card-2 text-text-muted border-border hover:bg-border/25'
                              }`}
                            >
                              {qCorrect === 1 ? '✓ Correct Option' : 'Mark as Correct'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qOptB}
                            onChange={(e) => handleOptionChange(1, e.target.value)}
                            placeholder="Option B answer text"
                            className={`w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all ${
                              qCorrect === 1 ? 'border-emerald-500/60 ring-2 ring-emerald-500/5' : 'border-border'
                            }`}
                          />
                        </div>
 
                        {/* Option C */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                              <span className={`h-5 w-5 ${qCorrect === 2 ? 'bg-emerald-600' : 'bg-text-muted'} text-white text-[10px] font-bold rounded flex items-center justify-center transition-all`}>
                                C
                              </span>
                              Option C
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSelectCorrectIndex(2)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                qCorrect === 2
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-card-2 text-text-muted border-border hover:bg-border/25'
                              }`}
                            >
                              {qCorrect === 2 ? '✓ Correct Option' : 'Mark as Correct'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qOptC}
                            onChange={(e) => handleOptionChange(2, e.target.value)}
                            placeholder="Option C answer text"
                            className={`w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all ${
                              qCorrect === 2 ? 'border-emerald-500/60 ring-2 ring-emerald-500/5' : 'border-border'
                            }`}
                          />
                        </div>
 
                        {/* Option D */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                              <span className={`h-5 w-5 ${qCorrect === 3 ? 'bg-emerald-600' : 'bg-text-muted'} text-white text-[10px] font-bold rounded flex items-center justify-center transition-all`}>
                                D
                              </span>
                              Option D
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSelectCorrectIndex(3)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                qCorrect === 3
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-card-2 text-text-muted border-border hover:bg-border/25'
                              }`}
                            >
                              {qCorrect === 3 ? '✓ Correct Option' : 'Mark as Correct'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qOptD}
                            onChange={(e) => handleOptionChange(3, e.target.value)}
                            placeholder="Option D answer text"
                            className={`w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all ${
                              qCorrect === 3 ? 'border-emerald-500/60 ring-2 ring-emerald-500/5' : 'border-border'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
 
                  {/* Theory Configuration Section */}
                  {qType === 'theory' && (
                    <div className="p-4 rounded-2xl bg-card-2 border border-border space-y-3">
                      <span className="text-xs uppercase font-bold text-text-secondary tracking-wider block border-b border-border pb-1.5">
                        Theory Response Configurations
                      </span>
                      <Input
                        label="Suggested Response Words Count"
                        type="number"
                        min={50}
                        value={qWords}
                        onChange={(e) => handleWordsChange(Number(e.target.value))}
                      />
                      <p className="text-xs text-text-muted leading-relaxed font-sans">
                        This prompts the student with a suggested writing length (e.g. 200 words) and provides a multi-line text editor workspace in their exam view. Theory responses are held for manual teacher grading inside class marks sheets.
                      </p>
                    </div>
                  )}
 
                  {/* Save/Update Action buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-border gap-4 flex-wrap">
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 shrink-0" /> Edits auto-applied to list
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (selectedIdx !== null) {
                            const q = questions[selectedIdx];
                            setQText(q.text);
                            setQType(q.type || 'mcq');
                            setQPoints(q.points || 5);
                            if (q.options) {
                              setQOptA(q.options[0] || '');
                              setQOptB(q.options[1] || '');
                              setQOptC(q.options[2] || '');
                              setQOptD(q.options[3] || '');
                            }
                            setQCorrect(q.correctIndex ?? 0);
                            setQWords(q.suggestedWords || 200);
                            toast('Form fields reset to current list state');
                          }
                        }}
                        className="cursor-pointer"
                      >
                        Reset Form
                      </Button>
                      <Button
                        onClick={() => handleSaveToDatabase()}
                        loading={saving}
                        className="bg-maroon hover:bg-maroon-dark text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="h-4 w-4" /> Save Exam to Server
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>



      {/* Bulk Paste Modal */}
      {isBulkModalOpen && (
        <Modal
          open={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Question Importer"
          description="Paste multiple questions, one per line, to import them into this assessment."
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Question strings list</span>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  exam?.format === 'theory'
                    ? "Explain photosynthesis.\nDescribe the water cycle."
                    : "Question text? | Option A, Option B, Option C, Option D | 0\nSecond question? | Opt A, Opt B, Opt C, Opt D | 1"
                }
                className="w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
              />
            </div>
            
            <div className="p-3 bg-card-2 border border-border rounded-xl text-xs space-y-1 text-text-secondary">
              <p className="font-semibold text-foreground">Import Format Guide:</p>
              {exam?.format === 'theory' ? (
                <p>Simply type one theory prompt per line.</p>
              ) : (
                <p>Use syntax: <code>Question | OptionA, OptionB, OptionC, OptionD | CorrectIndex</code> (0 for A, 1 for B, etc.)</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                className="bg-maroon hover:bg-maroon-dark text-white font-bold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-4 w-4" /> Import list
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
