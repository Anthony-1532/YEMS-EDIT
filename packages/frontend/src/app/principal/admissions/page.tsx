'use client';

import { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Check, X, ListOrdered, ArrowUp, ArrowDown, TrendingUp, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { admissionsOversightApi, type AdmissionRow } from '@/lib/api/principal';
import { ApiError } from '@/lib/api/client';

type Tab = 'pending' | 'waitlist';

export default function PrincipalAdmissionsPage() {
  const [tab, setTab] = useState<Tab>('pending');

  const [pending, setPending] = useState<AdmissionRow[]>([]);
  const [waitlist, setWaitlist] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<AdmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        admissionsOversightApi.getPending().catch(() => []),
        admissionsOversightApi.getWaitlist().catch(() => []),
      ]);
      setPending(p);
      setWaitlist([...w].sort((a, b) => (a.waitlistRank ?? 999) - (b.waitlistRank ?? 999)));
      setOrderDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(a: AdmissionRow) {
    setBusyId(a.id);
    try {
      await admissionsOversightApi.approve(a.id);
      toast.success(`${a.firstName} ${a.lastName} admitted`);
      setPending((prev) => prev.filter((x) => x.id !== a.id));
      setWaitlist((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function moveToWaitlist(a: AdmissionRow) {
    setBusyId(a.id);
    try {
      await admissionsOversightApi.waitlist(a.id, typeof a.score === 'number' ? a.score : undefined);
      toast.success(`${a.firstName} ${a.lastName} waitlisted`);
      setPending((prev) => prev.filter((x) => x.id !== a.id));
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await admissionsOversightApi.reject(rejectTarget.id, rejectReason.trim() || undefined);
      toast.success('Application rejected');
      setPending((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setWaitlist((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function promote(a: AdmissionRow) {
    setBusyId(a.id);
    try {
      await admissionsOversightApi.promote(a.id);
      toast.success(`${a.firstName} ${a.lastName} promoted from waitlist`);
      setWaitlist((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  function move(index: number, dir: -1 | 1) {
    setWaitlist((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOrderDirty(true);
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      await admissionsOversightApi.rankWaitlist(waitlist.map((w) => w.id));
      toast.success('Waitlist order saved');
      setOrderDirty(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  }

  const pendingColumns: Column<AdmissionRow>[] = [
    {
      header: 'Applicant',
      accessor: (a) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{a.firstName} {a.lastName}</p>
          <p className="text-xs text-text-muted truncate">{a.email || a.parentName || '—'}</p>
        </div>
      ),
    },
    { header: 'Class', accessor: (a) => a.class || '—' },
    { header: 'Score', accessor: (a) => a.score != null ? <Badge tone="neutral">{a.score}</Badge> : '—' },
    {
      header: '',
      accessor: (a) => (
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="success" loading={busyId === a.id} onClick={() => approve(a)} icon={<Check className="h-3.5 w-3.5" />}>Admit</Button>
          <Button size="xs" variant="secondary" disabled={busyId === a.id} onClick={() => moveToWaitlist(a)}>Waitlist</Button>
          <Button size="xs" variant="danger" disabled={busyId === a.id} onClick={() => { setRejectTarget(a); setRejectReason(''); }} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const waitlistColumns: Column<AdmissionRow>[] = [
    {
      header: 'Rank',
      accessor: (a) => {
        const idx = waitlist.findIndex((w) => w.id === a.id);
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-maroon w-6">{idx + 1}</span>
            <div className="flex flex-col">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-text-muted hover:text-maroon disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(idx, 1)} disabled={idx === waitlist.length - 1} className="text-text-muted hover:text-maroon disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Applicant',
      accessor: (a) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{a.firstName} {a.lastName}</p>
          <p className="text-xs text-text-muted truncate">{a.class || '—'}</p>
        </div>
      ),
    },
    { header: 'Score', accessor: (a) => a.score != null ? <Badge tone="neutral">{a.score}</Badge> : '—' },
    {
      header: '',
      accessor: (a) => (
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="success" loading={busyId === a.id} onClick={() => promote(a)} icon={<TrendingUp className="h-3.5 w-3.5" />}>Promote</Button>
          <Button size="xs" variant="danger" disabled={busyId === a.id} onClick={() => { setRejectTarget(a); setRejectReason(''); }} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Admissions"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('pending')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'pending' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <ClipboardList className="h-4 w-4" /> Pending
            <Badge tone={pending.length > 0 ? 'maroon' : 'neutral'}>{pending.length}</Badge>
          </button>
          <button
            onClick={() => setTab('waitlist')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'waitlist' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <ListOrdered className="h-4 w-4" /> Waitlist
            <Badge tone={waitlist.length > 0 ? 'maroon' : 'neutral'}>{waitlist.length}</Badge>
          </button>
        </div>

        {tab === 'pending' ? (
          <Card>
            <h3 className="font-semibold text-foreground mb-4">Applications Awaiting Decision</h3>
            <Table
              columns={pendingColumns}
              data={pending}
              keyFor={(a) => a.id}
              loading={loading}
              emptyMessage="No pending applications."
              emptyIcon={<ClipboardList className="h-8 w-8" />}
            />
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-foreground">Waitlist</h3>
                <p className="text-xs text-text-muted mt-0.5">Reorder with the arrows, then save. Promote to admit.</p>
              </div>
              <Button size="sm" disabled={!orderDirty} loading={savingOrder} onClick={saveOrder} icon={<Save className="h-4 w-4" />}>
                Save order
              </Button>
            </div>
            <Table
              columns={waitlistColumns}
              data={waitlist}
              keyFor={(a) => a.id}
              loading={loading}
              emptyMessage="Waitlist is empty."
              emptyIcon={<ListOrdered className="h-8 w-8" />}
            />
          </Card>
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject application" size="md">
        <div className="space-y-4">
          <Textarea
            label="Reason (optional)"
            placeholder="Reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} onClick={submitReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
