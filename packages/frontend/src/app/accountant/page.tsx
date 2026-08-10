'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet, Receipt, TrendingUp, Settings, Users,
  CreditCard, Plus, ArrowRight, Clock, CheckCircle
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ACCOUNTANT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth/AuthContext';
import { accountantApi } from '@/lib/api/resources';
import { adminApi } from '@/lib/api/admin';
import type { Bill, Payment, User } from '@/lib/api/types';

export default function AccountantOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [billsData, paymentsData, studentsData] = await Promise.all([
          accountantApi.getBills(),
          accountantApi.getPayments(),
          adminApi.getUsers({ role: 'student' })
        ]);

        if (!active) return;
        setBills(billsData);
        setPayments(paymentsData);
        setStudents(studentsData);
      } catch (err) {
        console.error('Failed to load accountant overview data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  // Compute stats
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingBills = bills.filter(b => b.status === 'pending');
  const totalPending = pendingBills.reduce((sum, b) => sum + b.amount, 0);
  
  // Fully paid students: students who have bills and none of them are pending
  const paidStudentIds = new Set(
    students
      .map(s => s.id)
      .filter(studentId => {
        const studentBills = bills.filter(b => b.studentId === studentId);
        if (studentBills.length === 0) return false;
        return studentBills.every(b => b.status === 'paid');
      })
  );
  
  const paidStudentsCount = paidStudentIds.size;
  const billsCount = bills.length;

  const stats = [
    { label: 'Total Fees Collected', value: `₦${totalCollected.toLocaleString()}`, icon: Wallet, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', href: '/accountant/fees' },
    { label: 'Outstanding Invoices', value: `₦${totalPending.toLocaleString()}`, icon: Receipt, color: 'text-amber-600 bg-amber-50 border-amber-100', href: '/accountant/billing' },
    { label: 'Fully Paid Students', value: `${paidStudentsCount} / ${students.length}`, icon: Users, color: 'text-sky-600 bg-sky-50 border-sky-100', href: '/accountant/fees' },
    { label: 'Billing Invoices Issued', value: billsCount, icon: CreditCard, color: 'text-violet-600 bg-violet-50 border-violet-100', href: '/accountant/billing' },
  ];

  const recentPayments = payments.slice(0, 5);

  return (
    <DashboardShell
      title="Finance Overview"
      navItems={ACCOUNTANT_NAV}
      portalLabel="Finance Portal"
      allowedRoles={['accountant', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Welcome Banner */}
        <div
          className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7b1d3c 0%, #9b2d54 100%)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-1">
                YEMS Finance System
              </p>
              <h2 className="text-xl font-bold">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h2>
              <p className="text-white/70 text-sm mt-1">
                Session: {user?.session || '2025/2026'} · Term: {user?.term || 'First Term'}
              </p>
            </div>
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href} className="block transition-transform hover:scale-[1.01]">
                <Card className="flex items-center gap-4 py-5 px-6">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</p>
                    <p className="stat-value text-2xl font-black text-foreground mt-0.5">
                      {loading ? '—' : stat.value}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href="/accountant/fees"
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-card-2 border border-border/40 hover:border-border transition-all group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Record Payment</span>
                  <p className="text-xs text-text-muted mt-0.5">Collect school fees</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/accountant/billing"
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-card-2 border border-border/40 hover:border-border transition-all group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Issue Bills</span>
                  <p className="text-xs text-text-muted mt-0.5">Invoices for current term</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/accountant/reports"
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-card-2 border border-border/40 hover:border-border transition-all group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Financial Reports</span>
                  <p className="text-xs text-text-muted mt-0.5">Uptime &amp; fee analytics</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                href="/accountant/settings"
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-card-2 border border-border/40 hover:border-border transition-all group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Fee Settings</span>
                  <p className="text-xs text-text-muted mt-0.5">Configure bank accounts</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </Card>

          {/* Recent Payments Table */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Recent Payments</h3>
              <Link href="/accountant/fees" className="text-xs text-maroon font-semibold hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            {loading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Clock className="h-6 w-6 animate-spin text-maroon" />
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="flex h-[200px] flex-col items-center justify-center text-center p-4">
                <Wallet className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm font-medium text-foreground">No payments recorded</p>
                <p className="text-xs text-text-muted mt-0.5">Payments will appear here once registered.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground animate-fadeIn">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-text-secondary uppercase">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border/40 hover:bg-card-2 transition-colors table-row">
                        <td className="py-3 px-4 font-semibold text-foreground">{payment.studentName}</td>
                        <td className="py-3 px-4">{payment.class}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">₦{payment.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 capitalize">{payment.paymentMethod || 'cash'}</td>
                        <td className="py-3 px-4 text-xs text-text-secondary">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle className="h-3.5 w-3.5" /> Success
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
