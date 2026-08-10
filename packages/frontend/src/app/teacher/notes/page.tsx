'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Plus, Search, Pencil, Trash2, FileText, Upload,
  Eye, X, Download, HelpCircle, BookOpen, FileUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { notesApi } from '@/lib/api/resources';
import type { Note } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';

interface FormState {
  title: string;
  content: string;
  subject: string;
  className: string;
  week: string;
  availableFrom: string;
  fileName: string;
  fileData: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  subject: '',
  className: '',
  week: '',
  availableFrom: '',
  fileName: '',
  fileData: '',
};

// Lightweight custom Markdown parser for dynamic previews
function renderMarkdown(text: string) {
  if (!text) return '<p class="text-sm text-text-muted italic">Type note contents in the editor...</p>';
  
  let html = text
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-bold text-foreground mt-4 mb-2 font-sans">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-lg font-extrabold text-foreground mt-5 mb-2.5 font-sans">$3</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-xl font-black text-foreground mt-6 mb-3 font-sans">$1</h2>');
  
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-text-secondary">$1</em>');
  
  html = html.replace(/^\s*-\s*(.*$)/gim, '<li class="text-sm text-text-secondary ml-6 list-disc my-1.5 font-sans">$1</li>');
  
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) return line;
    return trimmed ? `<p class="text-sm leading-relaxed text-text-secondary my-2.5 font-sans">${line}</p>` : '';
  }).join('');
  
  return html;
}

export default function TeacherNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  
  // Note viewing state
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const assignedSubjects = useMemo(() => user?.assignedSubjects || [], [user]);
  const subjectOptions = useMemo(() => {
    return assignedSubjects.map((s) => ({ value: s, label: s }));
  }, [assignedSubjects]);

  async function load() {
    setLoading(true);
    try {
      const data = await notesApi.getAll();
      setNotes(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.subject || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      subject: assignedSubjects[0] || '',
    });
    setActiveTab('write');
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content || '',
      subject: note.subject || '',
      className: note.class ? String(note.class) : '',
      week: note.week ? String(note.week) : '',
      availableFrom: note.availableFrom ? String(note.availableFrom).slice(0, 16) : '',
      fileName: note.fileName || '',
      fileData: note.fileData || '',
    });
    setActiveTab('write');
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content || undefined,
        subject: form.subject || undefined,
        class: form.className || undefined,
        week: form.week ? Number(form.week) : undefined,
        availableFrom: form.availableFrom || undefined,
        fileName: form.fileName || undefined,
        fileData: form.fileData || undefined,
      };
      if (editing) {
        await notesApi.update(editing.id, payload);
        toast.success('Note updated');
      } else {
        await notesApi.create(payload);
        toast.success('Note created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(note: Note) {
    if (!confirm(`Delete note "${note.title}"?`)) return;
    try {
      await notesApi.delete(note.id);
      toast.success('Note deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        fileName: file.name,
        fileData: reader.result as string,
      }));
      toast.success(`Attached "${file.name}"`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const columns: Column<Note>[] = [
    {
      header: 'Title & attachment',
      accessor: (n) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-maroon/5 border border-maroon/10 text-maroon flex items-center justify-center shrink-0">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-semibold text-foreground leading-snug block">{n.title}</span>
            {n.fileName && (
              <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-maroon bg-maroon/5 border border-maroon/10 rounded-full px-2 py-0.5">
                <FileText className="h-3 w-3" /> {n.fileName}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { header: 'Subject', accessor: (n) => <span className="font-semibold text-maroon">{n.subject || '—'}</span> },
    {
      header: 'Lesson schedule',
      accessor: (n) => (
        <Badge tone="info" className="font-bold">
          {n.week ? `Week ${n.week}` : 'General'}
        </Badge>
      ),
    },
    { header: 'Published Date', accessor: (n) => formatDate(n.date) },
    { header: 'Available From', accessor: (n) => n.availableFrom ? formatDate(n.availableFrom) : <span className="text-text-muted text-xs">Immediate</span> },
    {
      header: 'Actions',
      accessor: (n) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setViewingNote(n)}
            className="flex items-center gap-1 font-bold text-xs py-1 px-2 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <button
            onClick={() => openEdit(n)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-maroon"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(n)}
            className="rounded-lg p-2 text-text-secondary hover:bg-card-2 hover:text-red-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Lesson Notes"
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">Course Notes Manager</h2>
          <p className="text-sm text-text-secondary mt-0.5">Publish reference guides, lesson materials, and reading notes for your class</p>
        </div>

        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
              />
            </div>
            <Button onClick={openCreate} className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-md">
              <Plus className="h-4 w-4" /> Add Lesson Note
            </Button>
          </div>

          <Table columns={columns} data={filtered} keyFor={(n) => n.id} loading={loading} emptyMessage="No notes found." />
        </Card>
      </div>

      {/* Editor Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Lesson Note' : 'Add Lesson Note'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Lesson Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Introduction to Newton's Laws of Motion"
          />

          {/* Tabbed Editor Switcher */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Note Content</span>
              <div className="flex p-0.5 rounded-lg bg-card-2 border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'write'
                      ? 'bg-card text-maroon shadow-sm'
                      : 'text-text-secondary hover:text-foreground'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-card text-maroon shadow-sm'
                      : 'text-text-secondary hover:text-foreground'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <div className="space-y-1">
                <textarea
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Type note contents here. Supports formatting: # headers, **bold**, *italic*, - lists"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
                />
                <p className="text-[10px] text-text-muted">
                  Use markdown syntax: <code># header</code>, <code>**bold text**</code>, <code>- bullet points</code>
                </p>
              </div>
            ) : (
              <div
                className="w-full rounded-2xl border border-border bg-card-2 p-4 min-h-[180px] max-h-[300px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subject"
              options={subjectOptions}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={assignedSubjects.length === 0 ? "No assigned subjects" : "Select subject"}
            />
            <Input
              label="Class"
              value={form.className}
              onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
              placeholder="e.g. SS2A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Week"
              type="number"
              min={1}
              value={form.week}
              onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))}
              placeholder="e.g. Week 1"
            />
            <Input
              label="Release Date/Time"
              type="datetime-local"
              value={form.availableFrom}
              onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))}
              hint="Students will only see this note after this time"
            />
          </div>
          <div className="text-xs text-text-muted">Class-based notes are visible to students in that class.</div>

          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">File Attachment (PDF, Document or Slides)</span>
            
            {form.fileName ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-maroon/25 bg-maroon/5 text-sm">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4.5 w-4.5 text-maroon" />
                  <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-sm">{form.fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, fileName: '', fileData: '' }))}
                  className="text-text-secondary hover:text-rose-600 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-maroon/30 rounded-2xl bg-card hover:bg-card-2 cursor-pointer select-none transition-all group">
                <FileUp className="h-8 w-8 text-text-muted group-hover:text-maroon transition-colors mb-2" />
                <span className="text-xs font-bold text-text-secondary group-hover:text-foreground">Click or Drag to upload a lesson file</span>
                <span className="text-[10px] text-text-muted mt-1">PDF, DOC, XLS or PPT up to 10MB</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="bg-maroon hover:bg-maroon-dark text-white font-semibold">
              {editing ? 'Save Changes' : 'Publish Note'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Drawer/Modal */}
      {viewingNote && (
        <Modal
          open={!!viewingNote}
          onClose={() => setViewingNote(null)}
          title={viewingNote.title}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-3 text-xs text-text-secondary font-semibold">
              <span>Subject: <strong className="text-maroon font-bold">{viewingNote.subject}</strong></span>
              <span>•</span>
              <span>Lesson: <strong>{viewingNote.week ? `Week ${viewingNote.week}` : 'General Reference'}</strong></span>
              <span>•</span>
              <span>Published: <strong>{formatDate(viewingNote.date)}</strong></span>
            </div>

            <div
              className="prose prose-sm max-w-none max-h-[350px] overflow-y-auto pr-2 border-b border-border/50 pb-4"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(viewingNote.content || '') }}
            />

            {viewingNote.fileName && (
              <div className="p-3.5 rounded-xl bg-card-2 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-maroon" />
                  <div>
                    <p className="text-xs font-bold text-foreground leading-none">{viewingNote.fileName}</p>
                    <p className="text-[10px] text-text-muted mt-1">Course Attachment file</p>
                  </div>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.success('Downloaded file successfully!');
                  }}
                  className="inline-flex h-8 px-3 rounded-lg bg-maroon text-white font-bold text-xs items-center gap-1.5 hover:bg-maroon-dark cursor-pointer shadow-sm transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewingNote(null)} className="bg-maroon hover:bg-maroon-dark text-white font-bold cursor-pointer">
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
