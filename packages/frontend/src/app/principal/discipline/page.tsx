'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ShieldCheck, Filter, AlertTriangle, Gavel, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { disciplineApi, type DisciplineRow } from '@/lib/api/principal';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

const SEVERITY_TONE: Record<string, 'neutral' | 'warning' | 'danger'> = {
  minor: 'neutral', moderate: 'warning', serious: 'danger', severe: 'danger',
};
const STATUS_TONE: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
  open: 'neutral', escalated: 'warning', resolved: 'success', dismissed: 'neutral',
};

const ACTIONS = [
  { value: 'warning', label: 'Warning' },
  { value: 'detention', label: 'Detention' },
  { value: 'parent_meeting', label: 'Parent meeting' },
  { value: 'counseling', label: 'Counseling' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'expulsion', label: 'Expulsion' },
  { value: 'none', label: 'No action' },
];

// Actions that permanently affect a student's standing — require explicit confirmation.
const SEVERE_ACTIONS = new Set(['suspension', 'expulsion']);

export default function PrincipalDisciplinePage() {
  const [rows, setRows] = useState<DisciplineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Resolve modal
  const [resolveTarget, setResolveTarget] = useState<DisciplineRow | null>(null);
  const [action, setAction] = useState('warning');
  const [actionDetail, setActionDetail] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [confirmSevere, setConfirmSevere] = useState(false);

  // Dismiss modal
  const [dismissTarget, setDismissTarget] = useState<DisciplineRow | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await disciplineApi.getAll({
        severity: severity || undefined,
        status: status || undefined,
        class: classFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [severity, status, classFilter, from, to]);

  useEffect(() => { load(); }, [load]);

  const escalatedCount = useMemo(() => rows.filter((r) => r.status === 'escalated').length, [rows]);

  function openResolve(r: DisciplineRow) {
    setResolveTarget(r);
    setAction('warning');
    setActionDetail('');
    setResolutionNote('');
    setConfirmSevere(false);
  }

  async function submitResolve() {
    if (!resolveTarget) return;
    if (SEVERE_ACTIONS.has(action) && !confirmSevere) {
      toast.error('Please confirm this serious disciplinary action');
      return;
    }
    setBusyId(resolveTarget.id);
    try {
      await disciplineApi.resolve(resolveTarget.id, {
        action,
        actionDetail: actionDetail.trim() || undefined,
        resolutionNote: resolutionNote.trim() || undefined,
      });
      toast.success('Incident resolved');
      setRows((prev) => prev.map((x) => (x.id === resolveTarget.id ? { ...x, status: 'resolved', action } : x)));
      setResolveTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitDismiss() {
    if (!dismissTarget) return;
    if (!dismissReason.trim()) { toast.error('A reason is required'); return; }
    setBusyId(dismissTarget.id);
    try {
      await disciplineApi.dismiss(dismissTarget.id, dismissReason.trim());
      toast.success('Incident dismissed');
      setRows((prev) => prev.map((x) => (x.id === dismissTarget.id ? { ...x, status: 'dismissed' } : x)));
      setDismissTarget(null);
      setDismissReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<DisciplineRow>[] = [
    {
      header: 'Student',
      accessor: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{r.studentName || r.studentId}</p>
          <p className="text-xs text-text-muted truncate">{r.class} · {formatDate(r.incidentDate)}</p>
        </div>
      ),
    },
    {
      header: 'Incident',
      accessor: (r) => (
        <div className="min-w-0 max-w-xs">
          <p className="text-sm text-foreground truncate">{r.category}</p>
          <p className="text-xs text-text-muted truncate">{r.description}</p>
        </div>
      ),
    },
    { header: 'Severity', accessor: (r) => <Badge tone={SEVERITY_TONE[r.severity] || 'neutral'}>{r.severity}</Badge> },
    { header: 'Status', accessor: (r) => <Badge tone={STATUS_TONE[r.status] || 'neutral'} dot>{r.status}</Badge> },
    {
      header: 'Outcome',
      accessor: (r) => (r.status === 'resolved' && r.action && r.action !== 'none')
        ? <Badge tone={SEVERE_ACTIONS.has(r.action) ? 'danger' : 'info'}>{String(r.action).replace(/_/g, ' ')}</Badge>
        : <span className="text-text-muted">—</span>,
    },
    {
      header: '',
      accessor: (r) => (r.status === 'open' || r.status === 'escalated') ? (
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="primary" loading={busyId === r.id} onClick={() => openResolve(r)} icon={<Gavel className="h-3.5 w-3.5" />}>Resolve</Button>
          <Button size="xs" variant="secondary" disabled={busyId === r.id} onClick={() => { setDismissTarget(r); setDismissReason(''); }}>Dismiss</Button>
        </div>
      ) : <span className="text-xs text-text-muted">Closed</span>,
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Discipline"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {escalatedCount > 0 && (
          <Card className="flex items-center gap-3 border border-amber-200 bg-amber-50/60">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{escalatedCount}</span> incident{escalatedCount > 1 ? 's' : ''} escalated to you for a final decision.
            </p>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">School-wide Discipline Log</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select
              label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="All"
              options={[
                { value: 'minor', label: 'Minor' }, { value: 'moderate', label: 'Moderate' },
                { value: 'serious', label: 'Serious' }, { value: 'severe', label: 'Severe' },
              ]}
            />
            <Select
              label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All"
              options={[
                { value: 'open', label: 'Open' }, { value: 'escalated', label: 'Escalated' },
                { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' },
              ]}
            />
            <Input label="Class" placeholder="e.g. JSS 2A" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} />
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Card>

        <Card>
          <Table
            columns={columns}
            data={rows}
            keyFor={(r) => r.id}
            loading={loading}
            emptyMessage="No incidents match these filters."
            emptyIcon={<ShieldCheck className="h-8 w-8" />}
          />
        </Card>
      </div>

      {/* Resolve modal */}
      <Modal open={!!resolveTarget} onClose={() => setResolveTarget(null)} title="Resolve incident — final decision" size="md">
        {resolveTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-card-2 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{resolveTarget.studentName || resolveTarget.studentId} · {resolveTarget.class}</p>
              <p className="text-xs text-text-muted mt-0.5">{resolveTarget.category} — {resolveTarget.description}</p>
            </div>
            <Select
              label="Final action"
              value={action}
              onChange={(e) => { setAction(e.target.value); setConfirmSevere(false); }}
              options={ACTIONS}
            />
            <Input label="Action detail" placeholder="e.g. 3-day suspension from 12 Aug" value={actionDetail} onChange={(e) => setActionDetail(e.target.value)} />
            <Textarea label="Resolution note" placeholder="Record of the decision…" value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />

            {SEVERE_ACTIONS.has(action) && (
              <label className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 cursor-pointer">
                <input type="checkbox" checked={confirmSevere} onChange={(e) => setConfirmSevere(e.target.checked)} className="mt-0.5 accent-red-600" />
                <span className="text-xs text-red-800">
                  <Ban className="inline h-3.5 w-3.5 mr-1" />
                  I confirm this <span className="font-bold">{action}</span> decision. This seriously affects the student&apos;s standing and will be recorded permanently.
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResolveTarget(null)}>Cancel</Button>
              <Button
                variant={SEVERE_ACTIONS.has(action) ? 'danger' : 'primary'}
                loading={!!busyId}
                onClick={submitResolve}
              >
                Record decision
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dismiss modal */}
      <Modal open={!!dismissTarget} onClose={() => setDismissTarget(null)} title="Dismiss incident" size="md">
        <div className="space-y-4">
          <Textarea
            label="Reason"
            placeholder="Why is this incident being dismissed?"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDismissTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} onClick={submitDismiss}>Dismiss</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
