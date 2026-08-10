'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Download, Calendar, DollarSign, Users, Award, ShieldAlert,
  Percent, ArrowRight, BarChart3, PieChart, Info, Landmark
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ACCOUNTANT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { accountantApi } from '@/lib/api/resources';
import { adminApi } from '@/lib/api/admin';
import type { Bill, Payment, User } from '@/lib/api/types';
import toast from 'react-hot-toast';

interface ClassBreakdown {
  className: string;
  expected: number;
  collected: number;
  outstanding: number;
  progress: number;
  studentsCount: number;
}

export default function AccountantReportsPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classBreakdown, setClassBreakdown] = useState<ClassBreakdown[]>([]);

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

        // Calculate class breakdowns
        const classesMap = new Map<string, { expected: number; collected: number; studentsCount: number }>();
        
        // Count students by class
        studentsData.forEach(student => {
          const className = student.class || 'No Class';
          if (!classesMap.has(className)) {
            classesMap.set(className, { expected: 0, collected: 0, studentsCount: 0 });
          }
          const c = classesMap.get(className)!;
          c.studentsCount++;
        });

        // Sum bills (expected) by class
        billsData.forEach(bill => {
          const className = bill.class || 'No Class';
          if (!classesMap.has(className)) {
            classesMap.set(className, { expected: 0, collected: 0, studentsCount: 0 });
          }
          const c = classesMap.get(className)!;
          c.expected += bill.amount;
        });

        // Sum payments (collected) by class
        paymentsData.forEach(payment => {
          const className = payment.class || 'No Class';
          if (!classesMap.has(className)) {
            classesMap.set(className, { expected: 0, collected: 0, studentsCount: 0 });
          }
          const c = classesMap.get(className)!;
          c.collected += payment.amount;
        });

        const breakdowns: ClassBreakdown[] = [];
        classesMap.forEach((val, key) => {
          const outstanding = Math.max(0, val.expected - val.collected);
          const progress = val.expected > 0 ? (val.collected / val.expected) * 100 : 0;
          breakdowns.push({
            className: key,
            expected: val.expected,
            collected: val.collected,
            outstanding,
            progress,
            studentsCount: val.studentsCount
          });
        });

        setClassBreakdown(breakdowns.sort((a, b) => a.className.localeCompare(b.className)));
      } catch (err) {
        console.error('Failed to calculate financial reports:', err);
        toast.error('Failed to load reports');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  const totalExpected = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const summaryStats = [
    { label: 'Expected Revenue', value: `₦${totalExpected.toLocaleString()}`, sub: 'From all issued bills', icon: DollarSign, color: 'text-violet-600 bg-violet-50' },
    { label: 'Actual Revenue', value: `₦${totalCollected.toLocaleString()}`, sub: 'Successfully cleared payments', icon: Landmark, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Outstanding Balance', value: `₦${totalOutstanding.toLocaleString()}`, sub: 'Awaiting parent action', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50' },
    { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, sub: 'Target collection speed', icon: Percent, color: 'text-sky-600 bg-sky-50' },
  ];

  const columns: Column<ClassBreakdown>[] = [
    {
      header: 'Classroom',
      accessor: (row) => <span className="font-semibold text-foreground">{row.className}</span>
    },
    {
      header: 'Students',
      accessor: (row) => <span className="font-medium">{row.studentsCount} students</span>
    },
    {
      header: 'Expected (₦)',
      accessor: (row) => <span>₦{row.expected.toLocaleString()}</span>
    },
    {
      header: 'Collected (₦)',
      accessor: (row) => <span className="font-bold text-emerald-600">₦{row.collected.toLocaleString()}</span>
    },
    {
      header: 'Outstanding (₦)',
      accessor: (row) => <span className="font-bold text-rose-600">₦{row.outstanding.toLocaleString()}</span>
    },
    {
      header: 'Progress',
      accessor: (row) => (
        <div className="flex items-center gap-3 w-40">
          <div className="h-2 w-full rounded-full bg-border overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, row.progress)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-text-secondary">{row.progress.toFixed(0)}%</span>
        </div>
      )
    }
  ];

  const exportCsv = () => {
    if (classBreakdown.length === 0) {
      toast.error('No report data to export');
      return;
    }

    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const headers = ['Class', 'Students', 'Expected', 'Collected', 'Outstanding', 'Progress %'];
    const rows = classBreakdown.map((row) => [
      escape(row.className),
      row.studentsCount,
      row.expected,
      row.collected,
      row.outstanding,
      row.progress.toFixed(1),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  return (
    <DashboardShell
      title="Financial Reports"
      navItems={ACCOUNTANT_NAV}
      portalLabel="Finance Portal"
      allowedRoles={['accountant', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Revenue &amp; Analytics Reports</h2>
            <p className="text-sm text-text-secondary mt-0.5">Summary of payments, collection velocities, and breakdowns</p>
          </div>
          <Button
            onClick={exportCsv}
            variant="secondary"
            className="flex items-center gap-2 border-border/40 hover:border-border cursor-pointer"
            disabled={loading || classBreakdown.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Summary Stat Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-foreground">{loading ? '—' : stat.value}</h3>
                <p className="text-xs text-text-muted mt-1">{stat.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Breakdown by Class */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-foreground">Fee Collection by Class</h3>
              <p className="text-xs text-text-muted mt-0.5">Detailed view of expected revenue vs actual payments grouped by class stream</p>
            </div>
            <Badge tone="info" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Term Summary
            </Badge>
          </div>

          <Table
            columns={columns}
            data={classBreakdown}
            keyFor={(row) => row.className}
            loading={loading}
            emptyMessage="No class data available."
            emptyIcon={<PieChart className="h-10 w-10 text-text-muted" />}
          />
        </Card>

        {/* Billing Overview Alert */}
        <div className="p-4 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 flex items-start gap-3 text-xs leading-relaxed">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
          <div>
            <p className="font-semibold text-sky-950">Reporting Insights</p>
            <p className="mt-0.5">Outstanding values are calculated based on pending billing invoices. General payments not mapped to any specific invoice will decrease overall outstanding values at the portal level, but class-specific indicators depend on students being properly registered inside their active classrooms.</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
