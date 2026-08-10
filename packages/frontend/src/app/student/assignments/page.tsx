'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Search, Clock, Calendar, CheckCircle, FileText, Upload, Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { STUDENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { assignmentsApi } from '@/lib/api/resources';
import type { Assignment } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function StudentAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Submission form state
  const [submissionText, setSubmissionText] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    let active = true;
    async function loadAssignments() {
      try {
        const data = await assignmentsApi.getAll();
        if (active) setAssignments(data);
      } catch (err) {
        console.error('Failed to load student assignments:', err);
        toast.error('Failed to load assignments');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAssignments();
    return () => { active = false; };
  }, []);

  async function handleSubmitAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!submissionText && !fileName) {
      toast.error('Please provide a text response or select a file to submit');
      return;
    }

    setSubmitting(true);
    // Simulate API Submission
    setTimeout(() => {
      toast.success('Assignment submitted successfully');
      setSelectedAssignment(null);
      setSubmissionText('');
      setFileName('');
      setSubmitting(false);
    }, 1200);
  }

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.subject && a.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: Column<Assignment>[] = [
    {
      header: 'Title',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.title}</span>
          <p className="text-xs text-text-muted mt-0.5">{row.description || 'No description'}</p>
        </div>
      )
    },
    {
      header: 'Subject',
      accessor: (row) => <span className="font-semibold text-maroon">{row.subject || 'General'}</span>
    },
    {
      header: 'Due Date',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <Calendar className="h-3.5 w-3.5" /> {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => {
        const isOverdue = row.dueDate && new Date(row.dueDate) < new Date();
        if (row.status === 'submitted' || row.status === 'graded') {
          return (
            <Badge tone="success" className="inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Submitted
            </Badge>
          );
        }
        return (
          <Badge tone={isOverdue ? 'danger' : 'warning'} className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {isOverdue ? 'Overdue' : 'Pending'}
          </Badge>
        );
      }
    },
    {
      header: 'Action',
      accessor: (row) => {
        const isSubmitted = row.status === 'submitted' || row.status === 'graded';
        return (
          <Button
            onClick={() => setSelectedAssignment(row)}
            size="sm"
            variant={isSubmitted ? 'secondary' : 'primary'}
            className={isSubmitted ? 'cursor-pointer' : 'bg-maroon hover:bg-maroon-dark text-white font-semibold cursor-pointer'}
          >
            {isSubmitted ? 'View Submission' : 'Submit Work'}
          </Button>
        );
      }
    }
  ];

  return (
    <DashboardShell
      title="My Assignments"
      navItems={STUDENT_NAV}
      portalLabel="Student Portal"
      allowedRoles={['student', 'parent', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">Coursework Assignments</h2>
          <p className="text-sm text-text-secondary mt-0.5">Submit homework, download work sheets, and view teacher feedback</p>
        </div>

        {/* Filter Controls */}
        <Card className="flex items-center gap-4 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search assignments or subjects..."
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
            data={filteredAssignments}
            keyFor={(row) => row.id}
            loading={loading}
            emptyMessage="No assignments issued for you currently."
            emptyIcon={<ClipboardList className="h-10 w-10 text-text-muted" />}
          />
        </Card>

        {/* Submit Modal */}
        {selectedAssignment && (
          <Modal
            open={!!selectedAssignment}
            onClose={() => setSelectedAssignment(null)}
            title={selectedAssignment.title}
            description="Submit your solution text or upload file homework."
            size="md"
          >
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div className="p-4 rounded-xl bg-card-2 border border-border text-sm text-foreground leading-relaxed">
                <p className="font-semibold text-maroon mb-1">Assignment details:</p>
                <p>{selectedAssignment.description || 'No instruction text provided. Refer to attachment if any.'}</p>
                {selectedAssignment.dueDate && (
                  <p className="text-xs text-text-muted mt-2">
                    <strong>Due Date:</strong> {new Date(selectedAssignment.dueDate).toLocaleString()}
                  </p>
                )}
              </div>

              {(selectedAssignment.status === 'submitted' || selectedAssignment.status === 'graded') ? (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs">
                  <p className="font-semibold">Homework Submitted</p>
                  <p className="mt-0.5">Your submission is complete. If graded, feedback will be displayed in your grades panel.</p>
                </div>
              ) : (
                <>
                  <Textarea
                    label="Write Text Submission (Optional)"
                    id="textSubmit"
                    placeholder="Type your homework response or paste text answers..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                  />

                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5 ml-1">Upload Homework File</label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setFileName('chemistry_hw_completed.pdf')}
                        className="flex items-center gap-2 border-dashed border-border/80 hover:border-border cursor-pointer w-full justify-center py-4"
                      >
                        <Upload className="h-4 w-4" /> {fileName || 'Click to upload PDF / DOCX'}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedAssignment(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
                {selectedAssignment.status !== 'submitted' && selectedAssignment.status !== 'graded' && (
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    {submitting && <Clock className="h-3.5 w-3.5 animate-spin" />}
                    Submit Homework
                  </Button>
                )}
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardShell>
  );
}
