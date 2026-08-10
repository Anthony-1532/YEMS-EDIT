'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Award, FileBarChart, ArrowUpDown, Check, X, Send, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  principalApi, reportCardsApi,
  type AcademicRow, type ReportCardRow,
} from '@/lib/api/principal';
import { ApiError } from '@/lib/api/client';

type Tab = 'performance' | 'reportCards';
type SortKey = 'class' | 'subject' | 'avgPercent' | 'count';

const STATUS_TONE: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'neutral',
  submitted: 'warning',
  principal_approved: 'info',
  returned: 'danger',
  sent: 'success',
};

const gradeTone = (p: number) => (p >= 70 ? 'success' : p >= 50 ? 'warning' : 'danger');

export default function PrincipalAcademicPage() {
  const [tab, setTab] = useState<Tab>('performance');

  // Performance
  const [rows, setRows] = useState<AcademicRow[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('avgPercent');
  const [sortAsc, setSortAsc] = useState(true);
  const [classFilter, setClassFilter] = useState('');

  // Report cards
  const [cards, setCards] = useState<ReportCardRow[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<ReportCardRow | null>(null);
  const [returnComment, setReturnComment] = useState('');
  const [approveTarget, setApproveTarget] = useState<ReportCardRow | null>(null);
  const [approveComment, setApproveComment] = useState('');

  const loadPerf = useCallback(async () => {
    setLoadingPerf(true);
    try {
      setRows(await principalApi.getAcademicPerformance());
    } catch {
      setRows([]);
    } finally {
      setLoadingPerf(false);
    }
  }, []);

  const loadCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const data = statusFilter
        ? await reportCardsApi.getAll({ status: statusFilter })
        : await reportCardsApi.getAll();
      setCards(data);
    } catch {
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadPerf(); }, [loadPerf]);
  useEffect(() => { loadCards(); }, [loadCards]);

  const classes = useMemo(() => Array.from(new Set(rows.map((r) => r.class))).sort(), [rows]);

  const sortedRows = useMemo(() => {
    const filtered = classFilter ? rows.filter((r) => r.class === classFilter) : rows;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'class') cmp = a.class.localeCompare(b.class);
      else if (sortKey === 'subject') cmp = a.subject.localeCompare(b.subject);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [rows, classFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === 'class' || key === 'subject'); }
  };

  const sortHeader = (label: string, key: SortKey) => (
    <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-maroon transition-colors">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? 'text-maroon' : 'text-text-muted'}`} />
    </button>
  );

  const perfColumns: Column<AcademicRow>[] = [
    { header: 'Class', accessor: (r) => <span className="font-medium text-foreground">{r.class}</span> },
    { header: 'Subject', accessor: (r) => r.subject },
    {
      header: 'Average',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-card-2 overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full ${r.avgPercent >= 70 ? 'bg-emerald-500' : r.avgPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, r.avgPercent)}%` }}
            />
          </div>
          <Badge tone={gradeTone(r.avgPercent)}>{r.avgPercent}%</Badge>
        </div>
      ),
    },
    { header: 'Results', accessor: (r) => <span className="text-text-secondary">{r.count}</span> },
  ];

  async function doApprove() {
    if (!approveTarget) return;
    setBusyId(approveTarget.id);
    try {
      await reportCardsApi.approve(approveTarget.id, approveComment.trim() || undefined);
      toast.success('Report card approved');
      setCards((prev) => prev.filter((c) => c.id !== approveTarget.id));
      setApproveTarget(null);
      setApproveComment('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function doReturn() {
    if (!returnTarget) return;
    if (!returnComment.trim()) { toast.error('A comment is required to return'); return; }
    setBusyId(returnTarget.id);
    try {
      await reportCardsApi.return(returnTarget.id, returnComment.trim());
      toast.success('Returned to class teacher for revision');
      setCards((prev) => prev.filter((c) => c.id !== returnTarget.id));
      setReturnTarget(null);
      setReturnComment('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function doSend(card: ReportCardRow) {
    setBusyId(card.id);
    try {
      await reportCardsApi.send(card.id);
      toast.success('Report card released to parents');
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'sent' } : c)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const cardColumns: Column<ReportCardRow>[] = [
    {
      header: 'Student',
      accessor: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{c.studentName || c.studentId}</p>
          <p className="text-xs text-text-muted truncate">{c.class} · {c.term} · {c.session}</p>
        </div>
      ),
    },
    {
      header: 'Average',
      accessor: (c) => c.overallAverage != null
        ? <Badge tone={gradeTone(Number(c.overallAverage))}>{Math.round(Number(c.overallAverage))}%</Badge>
        : <span className="text-text-muted">—</span>,
    },
    { header: 'Position', accessor: (c) => c.position || '—' },
    { header: 'Status', accessor: (c) => <Badge tone={STATUS_TONE[c.status] || 'neutral'} dot>{String(c.status).replace(/_/g, ' ')}</Badge> },
    {
      header: '',
      accessor: (c) => {
        if (c.status === 'submitted') {
          return (
            <div className="flex justify-end gap-2">
              <Button size="xs" variant="success" loading={busyId === c.id} onClick={() => { setApproveTarget(c); setApproveComment(''); }} icon={<Check className="h-3.5 w-3.5" />}>Approve</Button>
              <Button size="xs" variant="danger" disabled={busyId === c.id} onClick={() => { setReturnTarget(c); setReturnComment(''); }} icon={<X className="h-3.5 w-3.5" />}>Return</Button>
            </div>
          );
        }
        if (c.status === 'principal_approved') {
          return <div className="flex justify-end"><Button size="xs" loading={busyId === c.id} onClick={() => doSend(c)} icon={<Send className="h-3.5 w-3.5" />}>Release</Button></div>;
        }
        return <span className="text-xs text-text-muted">{c.status === 'sent' ? 'Released' : 'With class teacher'}</span>;
      },
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Academic Oversight"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('performance')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'performance' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <Award className="h-4 w-4" /> Performance
          </button>
          <button
            onClick={() => setTab('reportCards')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'reportCards' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <FileBarChart className="h-4 w-4" /> Report Card Approvals
          </button>
        </div>

        {tab === 'performance' ? (
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 className="font-semibold text-foreground">Class &amp; Subject Performance</h3>
              <div className="w-full sm:w-56">
                <Select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  placeholder="All classes"
                  options={classes.map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>
            <Table
              columns={perfColumns}
              data={sortedRows}
              keyFor={(r) => `${r.class}::${r.subject}`}
              loading={loadingPerf}
              emptyMessage="No results recorded yet."
              emptyIcon={<Award className="h-8 w-8" />}
            />
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /> Sort:</span>
              {sortHeader('Class', 'class')}
              {sortHeader('Subject', 'subject')}
              {sortHeader('Average', 'avgPercent')}
              {sortHeader('Results', 'count')}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-foreground">Report Card Approval Gate</h3>
                <p className="text-xs text-text-muted mt-0.5">draft → submitted → principal approved → sent</p>
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="All statuses"
                  options={[
                    { value: 'submitted', label: 'Submitted (awaiting you)' },
                    { value: 'principal_approved', label: 'Approved (ready to send)' },
                    { value: 'returned', label: 'Returned' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                />
              </div>
            </div>
            <Table
              columns={cardColumns}
              data={cards}
              keyFor={(c) => c.id}
              loading={loadingCards}
              emptyMessage="No report cards in this state."
              emptyIcon={<FileBarChart className="h-8 w-8" />}
            />
          </Card>
        )}
      </div>

      {/* Approve modal (optional comment) */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve report card" size="md">
        {approveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Approving <span className="font-semibold text-foreground">{approveTarget.studentName || approveTarget.studentId}</span>&apos;s
              report card ({approveTarget.class}). You can add a principal comment that appears on the card.
            </p>
            <Textarea label="Principal comment (optional)" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button variant="success" loading={!!busyId} onClick={doApprove}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return modal (comment required) */}
      <Modal open={!!returnTarget} onClose={() => setReturnTarget(null)} title="Return for revision" size="md">
        <div className="space-y-4">
          <Textarea
            label="What needs fixing?"
            placeholder="Explain what the class teacher should correct…"
            value={returnComment}
            onChange={(e) => setReturnComment(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} onClick={doReturn}>Return</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
