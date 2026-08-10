'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wallet, Receipt, TrendingUp, Check, X, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  principalApi, expensesApi,
  type DashboardSummary, type ExpenseRow, type ExpenseSummary,
} from '@/lib/api/principal';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

const money = (n: number) => '₦' + Math.round(n || 0).toLocaleString();
const pct = (n: number) => `${Math.round(n || 0)}%`;

export default function PrincipalFinancialPage() {
  const [fees, setFees] = useState<DashboardSummary['fees'] | null>(null);
  const [expSummary, setExpSummary] = useState<ExpenseSummary | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<ExpenseRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, summary, queue] = await Promise.all([
        principalApi.getDashboard().catch(() => null),
        expensesApi.getSummary().catch(() => null),
        expensesApi.getQueue().catch(() => []),
      ]);
      if (dash) setFees(dash.fees);
      if (summary) setExpSummary(summary);
      setPendingExpenses(queue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(e: ExpenseRow) {
    setBusyId(e.id);
    try {
      await expensesApi.approve(e.id);
      toast.success('Expense approved');
      setPendingExpenses((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error('A reason is required'); return; }
    setBusyId(rejectTarget.id);
    try {
      await expensesApi.reject(rejectTarget.id, rejectReason.trim());
      toast.success('Expense rejected');
      setPendingExpenses((prev) => prev.filter((x) => x.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const collectedPct = fees ? 100 - fees.outstandingPct : 0;
  const byClass = [...(fees?.byClass || [])].sort((a, b) => b.outstanding - a.outstanding);

  const expenseColumns: Column<ExpenseRow>[] = [
    {
      header: 'Expense',
      accessor: (e) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{e.title}</p>
          <p className="text-xs text-text-muted truncate">{e.category}{e.vendor ? ` · ${e.vendor}` : ''} · {formatDate(e.expenseDate)}</p>
        </div>
      ),
    },
    { header: 'Recorded by', accessor: (e) => e.recordedByName || '—' },
    { header: 'Amount', accessor: (e) => <span className="font-semibold text-foreground">{money(e.amount)}</span> },
    {
      header: '',
      accessor: (e) => (
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="success" loading={busyId === e.id} onClick={() => approve(e)} icon={<Check className="h-3.5 w-3.5" />}>Approve</Button>
          <Button size="xs" variant="danger" disabled={busyId === e.id} onClick={() => { setRejectTarget(e); setRejectReason(''); }} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  const statCards = [
    { label: 'Expected Revenue', value: fees ? money(fees.expected) : undefined, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Collected', value: fees ? `${money(fees.collected)} (${pct(collectedPct)})` : undefined, icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Outstanding', value: fees ? money(fees.outstanding) : undefined, icon: Receipt, color: 'bg-maroon/10 text-maroon' },
    { label: 'Approved Expenses', value: expSummary ? money(expSummary.totalApproved) : undefined, icon: Building2, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <DashboardShell
      title="Financial Oversight"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        <Card className="flex items-center gap-3 border border-blue-200 bg-blue-50/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs text-blue-800">
            This is a <span className="font-semibold">view-only</span> financial layer. You can sign off on expenses above the approval
            threshold, but fee records and billing are managed by the accountant.
          </p>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} loading={loading} color={card.color} />
          ))}
        </div>

        {/* Expense approvals */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Expenses Awaiting Sign-off</h3>
              <p className="text-xs text-text-muted mt-0.5">Above-threshold spend held for principal approval.</p>
            </div>
            {expSummary && <Badge tone={expSummary.pendingCount > 0 ? 'maroon' : 'neutral'}>{expSummary.pendingCount} pending · {money(expSummary.totalPending)}</Badge>}
          </div>
          <Table
            columns={expenseColumns}
            data={pendingExpenses}
            keyFor={(e) => e.id}
            loading={loading}
            emptyMessage="No expenses awaiting approval."
            emptyIcon={<Receipt className="h-8 w-8" />}
          />
        </Card>

        {/* Outstanding by class */}
        <Card>
          <h3 className="font-semibold text-foreground mb-4">Outstanding Fees by Class</h3>
          <div className="space-y-2">
            {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-9 rounded-lg" />)}
            {!loading && byClass.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No billing data yet.</p>}
            {!loading && byClass.map((c) => (
              <div key={c.class} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-24 shrink-0 truncate">{c.class}</span>
                <div className="flex-1 h-2.5 rounded-full bg-card-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.outstandingPct >= 40 ? 'bg-red-500' : c.outstandingPct >= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, c.outstandingPct)}%` }}
                  />
                </div>
                <span className="text-sm text-text-secondary w-28 text-right">{money(c.outstanding)}</span>
                <Badge tone={c.outstandingPct >= 40 ? 'danger' : c.outstandingPct >= 20 ? 'warning' : 'success'}>{pct(c.outstandingPct)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject expense" size="md">
        <div className="space-y-4">
          <Textarea
            label="Reason"
            placeholder="Explain why this expense is declined…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
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
