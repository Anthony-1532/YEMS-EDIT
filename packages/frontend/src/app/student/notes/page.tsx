'use client';

import { useEffect, useState } from 'react';
import { NotebookPen, Search, Calendar, BookOpen, Download, FileText, Info } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { notesApi } from '@/lib/api/resources';
import type { Note } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function StudentNotesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    async function loadNotes() {
      try {
        const data = await notesApi.getAll();
        if (active) setNotes(data);
      } catch (err) {
        console.error('Failed to load notes:', err);
        toast.error('Failed to load study notes');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadNotes();
    return () => { active = false; };
  }, []);

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.subject && n.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: Column<Note>[] = [
    {
      header: 'Lesson Title',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.title}</span>
          <p className="text-xs text-text-muted mt-0.5">{row.content || 'Notes attachment study sheet'}</p>
        </div>
      )
    },
    {
      header: 'Subject',
      accessor: (row) => <span className="font-semibold text-maroon">{row.subject || 'Core Subject'}</span>
    },
    {
      header: 'Week',
      accessor: (row) => (
        <span className="font-semibold text-xs text-text-secondary">
          Week {row.week || 'N/A'}
        </span>
      )
    },
    {
      header: 'Shared Date',
      accessor: (row) => (
        <span className="text-xs text-text-secondary">
          {row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'File Attachment',
      accessor: (row) => {
        const name = row.fileName || 'study_notes.pdf';
        return (
          <button
            onClick={() => toast.success(`Downloading attachment: ${name}`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-maroon hover:text-maroon-dark transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        );
      }
    }
  ];

  return (
    <DashboardShell
      title="Study Notes"
      navItems={STUDENT_NAV}
      portalLabel="Student Portal"
      allowedRoles={['student', 'parent', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Study Materials</h2>
          <p className="text-sm text-text-secondary mt-0.5">Read study sheets, lesson summaries, and resource attachments uploaded by subject teachers</p>
        </div>

        {/* Search filter */}
        <Card className="flex items-center gap-4 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by topic or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>
        </Card>

        {/* Table list */}
        <Card className="p-0 overflow-hidden">
          <Table
            columns={columns}
            data={filteredNotes}
            keyFor={(row) => row.id}
            loading={loading}
            emptyMessage="No study notes shared with your class currently."
            emptyIcon={<NotebookPen className="h-10 w-10 text-text-muted" />}
          />
        </Card>
      </div>
    </DashboardShell>
  );
}
