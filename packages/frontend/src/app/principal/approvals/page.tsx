'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ListChecks, FileBarChart, ClipboardList, Users, Receipt, ShieldCheck,
  Check, X, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import {
  reportCardsApi, admissionsOversightApi, staffRequestsApi, expensesApi, disciplineApi,
} from '@/lib/api/principal';
import { ApiError } from '@/lib/api/client';

const money = (n: number) => '₦' + Math.round(n || 0).toLocaleString();

interface QueueItem {
  id: string;
  primary: string;
  secondary: string;
  meta?: string;
  href: string;
}

type Bucket = 'reportCards' | 'admissions' | 'staffRequests' | 'expenses' | 'discipline';

const BUCKETS: Array<{ key: Bucket; label: string; icon: React.ElementType; href: string; canReject: boolean }> = [
  { key: 'reportCards', label: 'Report Cards', icon: FileBarChart, href: '/principal/academic', canReject: true },
  { key: 'admissions', label: 'Admissions', icon: ClipboardList, href: '/principal/admissions', canReject: true },
  { key: 'staffRequests', label: 'Staff Requests', icon: Users, href: '/principal/staff', canReject: true },
  { key: 'expenses', label: 'Expenses', icon: Receipt, href: '/principal/financial', canReject: true },
  { key: 'discipline', label: 'Discipline', icon: ShieldCheck, href: '/principal/discipline', canReject: false },
];

export default function PrincipalApprovalsPage() {
  const [active, setActive] = useState<Bucket>('reportCards');
  const [items, setItems] = useState<Record<Bucket, QueueItem[]>>({
    reportCards: [], admissions: [], staffRequests: [], expenses: [], discipline: [],
  });
  const [counts, setCounts] = useState<Record<Bucket, number>>({
    reportCards: 0, admissions: 0, staffRequests: 0, expenses: 0, discipline: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reject modal state (reason required for most reject/return actions).
  const [rejectTarget, setRejectTarget] = useState<{ bucket: Bucket; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, adm, sr, exp, disc] = await Promise.all([
        reportCardsApi.getQueue().catch(() => []),
        admissionsOversightApi.getPending().catch(() => []),
        staffRequestsApi.getQueue().catch(() => []),
        expensesApi.getQueue().catch(() => []),
        disciplineApi.getQueue().catch(() => []),
      ]);
      const next: Record<Bucket, QueueItem[]> = {
        reportCards: rc.map((r) => ({
          id: r.id,
          primary: `${r.studentName || r.studentId} — ${r.class}`,
          secondary: `${r.term} · ${r.session}`,
          meta: r.overallAverage != null ? `Avg ${Math.round(Number(r.overallAverage))}%` : undefined,
          href: '/principal/academic',
        })),
        admissions: adm.map((a) => ({
          id: a.id,
          primary: `${a.firstName} ${a.lastName}`,
          secondary: a.class ? `Applying for ${a.class}` : 'Class unspecified',
          meta: a.score != null ? `Score ${a.score}` : undefined,
          href: '/principal/admissions',
        })),
        staffRequests: sr.map((s) => ({
          id: s.id,
          primary: `${s.staffName || 'Staff'} — ${s.title}`,
          secondary: `${s.type}${s.priority ? ` · ${s.priority} priority` : ''}`,
          meta: s.amount != null ? money(s.amount) : undefined,
          href: '/principal/staff',
        })),
        expenses: exp.map((e) => ({
          id: e.id,
          primary: e.title,
          secondary: `${e.category}${e.vendor ? ` · ${e.vendor}` : ''}`,
          meta: money(e.amount),
          href: '/principal/financial',
        })),
        discipline: disc.map((d) => ({
          id: d.id,
          primary: `${d.studentName || d.studentId} — ${d.class}`,
          secondary: `${d.category} · ${d.severity}`,
          meta: undefined,
          href: '/principal/discipline',
        })),
      };
      setItems(next);
      setCounts({
        reportCards: next.reportCards.length,
        admissions: next.admissions.length,
        staffRequests: next.staffRequests.length,
        expenses: next.expenses.length,
        discipline: next.discipline.length,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeItem = (bucket: Bucket, id: string) => {
    setItems((prev) => ({ ...prev, [bucket]: prev[bucket].filter((i) => i.id !== id) }));
    setCounts((prev) => ({ ...prev, [bucket]: Math.max(0, prev[bucket] - 1) }));
  };

  async function approve(bucket: Bucket, id: string) {
    setBusyId(id);
    try {
      if (bucket === 'reportCards') await reportCardsApi.approve(id);
      else if (bucket === 'admissions') await admissionsOversightApi.approve(id);
      else if (bucket === 'staffRequests') await staffRequestsApi.approve(id);
      else if (bucket === 'expenses') await expensesApi.approve(id);
      toast.success('Approved');
      removeItem(bucket, id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    const { bucket, id } = rejectTarget;
    if (!rejectReason.trim()) { toast.error('A reason is required'); return; }
    setBusyId(id);
    try {
      if (bucket === 'reportCards') await reportCardsApi.return(id, rejectReason.trim());
      else if (bucket === 'admissions') await admissionsOversightApi.reject(id, rejectReason.trim());
      else if (bucket === 'staffRequests') await staffRequestsApi.reject(id, rejectReason.trim());
      else if (bucket === 'expenses') await expensesApi.reject(id, rejectReason.trim());
      toast.success(bucket === 'reportCards' ? 'Returned for revision' : 'Rejected');
      removeItem(bucket, id);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const activeBucket = BUCKETS.find((b) => b.key === active)!;
  const list = items[active];

  return (
    <DashboardShell
      title="Approvals"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon/10 text-maroon shrink-0">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Action queue</h2>
            <p className="text-xs text-text-secondary">Everything awaiting your decision, grouped by type. Detailed context lives in each section.</p>
          </div>
        </Card>

        {/* Bucket tabs */}
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => {
            const Icon = b.icon;
            const isActive = active === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setActive(b.key)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                  isActive ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
                }`}
              >
                <Icon className="h-4 w-4" />
                {b.label}
                <Badge tone={counts[b.key] > 0 ? 'maroon' : 'neutral'}>{counts[b.key]}</Badge>
              </button>
            );
          })}
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{activeBucket.label}</h3>
            <Link href={activeBucket.href} className="text-xs text-maroon hover:underline flex items-center gap-1">
              Open section <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-text-muted">Nothing pending in {activeBucket.label.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border/70 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{item.primary}</p>
                    <p className="text-xs text-text-muted truncate">{item.secondary}</p>
                  </div>
                  {item.meta && <Badge tone="neutral">{item.meta}</Badge>}
                  {active === 'discipline' ? (
                    <Link href="/principal/discipline">
                      <Button size="sm" variant="secondary">Review</Button>
                    </Link>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />}
                        loading={busyId === item.id}
                        onClick={() => approve(active, item.id)}
                      >
                        {active === 'reportCards' ? 'Approve' : active === 'admissions' ? 'Admit' : 'Approve'}
                      </Button>
                      <Button
                        size="sm" variant="danger" icon={<X className="h-3.5 w-3.5" />}
                        disabled={busyId === item.id}
                        onClick={() => { setRejectTarget({ bucket: active, id: item.id }); setRejectReason(''); }}
                      >
                        {active === 'reportCards' ? 'Return' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={rejectTarget?.bucket === 'reportCards' ? 'Return for revision' : 'Reject with reason'}
        size="md"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason"
            placeholder="Explain the decision so the requester knows what to change…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} onClick={submitReject}>
              {rejectTarget?.bucket === 'reportCards' ? 'Return' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
