'use client';

import { useEffect, useState } from 'react';
import { Wallet, Receipt, Search, Info, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PARENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth/AuthContext';
import { accountantApi, usersApi } from '@/lib/api/resources';
import type { Bill, User } from '@/lib/api/types';
import toast from 'react-hot-toast';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'neutral',
};

export default function ParentFeesPage() {
  const { user } = useAuth();
  const [child, setChild] = useState<User | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const [childData, billsData] = await Promise.all([
          usersApi.getById(user!.studentId!),
          accountantApi.getBills({ studentId: user!.studentId! }).catch(() => [] as Bill[]),
        ]);
        if (!active) return;
        setChild(childData);
        setBills(billsData);
      } catch {
        toast.error('Failed to load fee records');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user]);

  const filtered = bills.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search && !b.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalOutstanding = bills
    .filter((b) => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const totalPaid = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <DashboardShell
      title="School Fees"
      navItems={PARENT_NAV}
      portalLabel="Parent Portal"
      allowedRoles={['parent']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            School Fees &amp; Invoices
          </h2>
          {child && (
            <p className="text-sm text-text-secondary mt-0.5">
              Financial records for <span className="font-bold text-foreground">{child.name}</span> · Admission No: <span className="font-mono font-bold text-maroon">{child.admissionNo || 'N/A'}</span>
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4 border-border/60">
            <div className="h-11 w-11 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-bold uppercase tracking-wide">Total Outstanding</p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                ₦{loading ? '—' : totalOutstanding.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 border-border/60">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-bold uppercase tracking-wide">Total Paid</p>
              <p className="text-2xl font-black text-foreground mt-0.5">
                ₦{loading ? '—' : totalPaid.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 border-border/60">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted font-bold uppercase tracking-wide">Total Invoices</p>
              <p className="text-2xl font-black text-foreground mt-0.5">{loading ? '—' : bills.length}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="flex flex-col sm:flex-row items-center gap-3 p-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search bills by description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-2.5 bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon sm:w-44"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </Card>

        {/* Bills Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card-2">
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full max-w-[120px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-25" />
                      <p className="text-sm font-semibold">No invoices found</p>
                      <p className="text-xs mt-1">Bills issued by the school office will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((bill) => (
                    <tr key={bill.id} className="hover:bg-card-2/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{bill.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-foreground">₦{Number(bill.amount).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[bill.status] || 'neutral'} className="capitalize font-semibold">
                          {bill.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedBill(bill)}
                          className="text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Info className="h-3.5 w-3.5" /> View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Info Note */}
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3 text-sm">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">How to Pay</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              Make a direct bank transfer to <strong>Yeshua Schools Trust Bank</strong>, Account: <span className="font-mono font-bold">1234567890</span> (Yeshua Educational Management System). Use your ward&apos;s admission number as the payment reference. Contact the school accountant after payment to confirm.
            </p>
          </div>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <Modal
          open={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title="Invoice Details"
          description="Full bill information and payment instructions"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 text-sm space-y-3">
              {[
                { label: 'Ward Name', value: child?.name },
                { label: 'Admission No', value: child?.admissionNo || 'N/A', mono: true },
                { label: 'Bill Description', value: selectedBill.description },
                { label: 'Due Date', value: selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleString() : 'N/A' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <span className="text-text-muted font-semibold">{label}:</span>
                  <span className={`font-bold ${mono ? 'font-mono' : ''}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-base border-t border-border pt-2">
                <span className="font-black text-foreground">Amount Due:</span>
                <span className="font-black text-blue-600">₦{Number(selectedBill.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-500" /> Bank Transfer Details
              </h4>
              <div className="grid gap-2.5 text-xs bg-card-2 p-3 rounded-lg border border-border/50">
                {[
                  { label: 'Bank Name', value: 'Yeshua Schools Trust Bank' },
                  { label: 'Account Name', value: 'Yeshua Educational Management System' },
                  { label: 'Account Number', value: '1234567890', mono: true },
                  { label: 'Payment Reference', value: child?.admissionNo || 'Admission Number', mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-text-muted">{label}:</span>
                    <span className={`font-bold text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="secondary" onClick={() => setSelectedBill(null)} className="cursor-pointer">
                Close
              </Button>
              {selectedBill.status !== 'paid' && (
                <Button
                  onClick={() => {
                    toast.success('Payment details noted. Contact the school accountant to confirm your transfer.');
                    setSelectedBill(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Copy Payment Info
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
