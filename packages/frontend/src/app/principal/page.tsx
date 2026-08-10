'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap, CalendarCheck, CalendarDays, Wallet, AlertTriangle,
  ArrowRight, ListChecks, TrendingUp, TrendingDown, ShieldCheck,
  ClipboardList, Users, Receipt, FileBarChart, Bell,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { principalApi, type DashboardSummary } from '@/lib/api/principal';

const money = (n: number) => '₦' + Math.round(n || 0).toLocaleString();
const pct = (n: number) => `${Math.round(n || 0)}%`;

const ALERT_TONE: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
};

// Which portal page each pending-approval bucket routes to.
const APPROVAL_LINKS: Array<{ key: keyof DashboardSummary['approvals']; label: string; href: string; icon: React.ElementType }> = [
  { key: 'reportCards', label: 'Report cards to approve', href: '/principal/academic', icon: FileBarChart },
  { key: 'admissions', label: 'Admissions to review', href: '/principal/admissions', icon: ClipboardList },
  { key: 'staffRequests', label: 'Staff requests', href: '/principal/staff', icon: Users },
  { key: 'expenses', label: 'Expenses to sign off', href: '/principal/financial', icon: Receipt },
  { key: 'discipline', label: 'Discipline escalations', href: '/principal/discipline', icon: ShieldCheck },
];

export default function PrincipalDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    principalApi
      .getDashboard()
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Failed to load dashboard'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const statCards = [
    { label: 'Active Students', value: data?.enrollment.active, icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
    { label: 'Attendance Today', value: data ? pct(data.attendance.todayRate) : undefined, icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600' },
    {
      label: 'Attendance This Week', value: data ? pct(data.attendance.weekRate) : undefined, icon: CalendarDays,
      color: 'bg-indigo-50 text-indigo-600',
      trend: data ? { value: data.attendance.trend, label: 'vs last week' } : undefined,
    },
    { label: 'Fees Collected', value: data ? pct(100 - data.fees.outstandingPct) : undefined, icon: Wallet, color: 'bg-amber-50 text-amber-600' },
    { label: 'Outstanding Fees', value: data ? money(data.fees.outstanding) : undefined, icon: Receipt, color: 'bg-maroon/10 text-maroon' },
    { label: 'Pending Approvals', value: data?.approvals.total, icon: ListChecks, color: 'bg-violet-50 text-violet-600' },
  ];

  // Lowest-attendance classes surface first — these are the ones needing action.
  const worstClasses = (data?.attendance.byClass || []).slice(0, 5);
  const topOutstanding = [...(data?.fees.byClass || [])]
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  return (
    <DashboardShell
      title="Principal Dashboard"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Greeting banner */}
        <div
          className="rounded-2xl px-8 py-8 text-white relative overflow-hidden"
          style={{ background: 'var(--maroon)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute right-16 -bottom-16 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-white/70 text-sm font-semibold tracking-wider uppercase mb-1">Principal Portal</p>
            <h2 className="text-2xl font-bold">School oversight at a glance</h2>
            <p className="text-white/80 text-sm mt-1">Enrollment, attendance, finance and everything awaiting your decision.</p>
          </div>
        </div>

        {error && (
          <Card className="border border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, i) => (
            <div key={card.label} style={{ animationDelay: `${i * 60}ms` }} className="fade-in">
              <StatCard
                label={card.label}
                value={card.value}
                icon={card.icon}
                loading={loading}
                color={card.color}
                trend={card.trend}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pending approvals queue (clickable counts) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Pending Approvals</h3>
              <Link href="/principal/approvals" className="text-xs text-maroon hover:underline flex items-center gap-1">
                Action queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div className="skeleton h-4 rounded w-1/2" />
                  <div className="skeleton h-6 w-8 rounded" />
                </div>
              ))}
              {!loading && data && APPROVAL_LINKS.map((row) => {
                const count = data.approvals[row.key];
                const Icon = row.icon;
                return (
                  <Link
                    key={row.key}
                    href={row.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 hover:bg-card-2 group"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maroon/10">
                      <Icon className="h-4 w-4 text-maroon" />
                    </div>
                    <p className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{row.label}</p>
                    <Badge tone={count > 0 ? 'maroon' : 'neutral'}>{count}</Badge>
                    <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
              {!loading && data && data.approvals.total === 0 && (
                <div className="py-6 text-center">
                  <ListChecks className="h-8 w-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Nothing awaiting approval. All clear.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Threshold alerts */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Alerts</h3>
              <AlertTriangle className="h-4 w-4 text-text-muted" />
            </div>
            <div className="space-y-2">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
              {!loading && data && data.alerts.length === 0 && (
                <div className="py-6 text-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No threshold alerts. Everything is within range.</p>
                </div>
              )}
              {!loading && data && data.alerts.map((alert) => {
                const body = (
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                    <span className="mt-0.5">
                      <Badge tone={ALERT_TONE[alert.severity] || 'neutral'} dot>{alert.category}</Badge>
                    </span>
                    <p className="text-sm text-foreground flex-1 min-w-0">{alert.message}</p>
                    {alert.href && <ArrowRight className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />}
                  </div>
                );
                return alert.href
                  ? <Link key={alert.id} href={alert.href} className="block hover:opacity-80 transition-opacity">{body}</Link>
                  : <div key={alert.id}>{body}</div>;
              })}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Lowest attendance classes */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Lowest Attendance by Class</h3>
              <Link href="/principal/reports" className="text-xs text-maroon hover:underline flex items-center gap-1">
                Reports <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
              {!loading && worstClasses.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No attendance recorded yet.</p>}
              {!loading && worstClasses.map((c) => (
                <div key={c.class} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-20 shrink-0 truncate">{c.class}</span>
                  <div className="flex-1 h-2 rounded-full bg-card-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.rate < 75 ? 'bg-red-500' : c.rate < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, c.rate)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-12 text-right ${c.rate < 75 ? 'text-red-600' : 'text-foreground'}`}>{pct(c.rate)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Highest outstanding fees by class */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Highest Outstanding Fees</h3>
              <Link href="/principal/financial" className="text-xs text-maroon hover:underline flex items-center gap-1">
                Financial <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
              {!loading && topOutstanding.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No billing data yet.</p>}
              {!loading && topOutstanding.map((c) => (
                <div key={c.class} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground truncate">{c.class}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">{money(c.outstanding)}</span>
                    <Badge tone={c.outstandingPct >= 40 ? 'danger' : c.outstandingPct >= 20 ? 'warning' : 'success'}>
                      {pct(c.outstandingPct)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {data && (
          <p className="text-xs text-text-muted text-right">
            Last updated {new Date(data.generatedAt).toLocaleString('en-GB')}
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
