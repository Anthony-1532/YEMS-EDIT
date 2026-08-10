'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { BarChart3, CalendarDays, Award, Printer, GraduationCap, Wallet } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import {
  principalApi,
  type DashboardSummary, type AcademicRow, type AttendanceTrendPoint,
} from '@/lib/api/principal';

const money = (n: number) => '₦' + Math.round(n || 0).toLocaleString();
const pct = (n: number) => `${Math.round(n || 0)}%`;

export default function PrincipalReportsPage() {
  const [dash, setDash] = useState<DashboardSummary | null>(null);
  const [academic, setAcademic] = useState<AcademicRow[]>([]);
  const [trends, setTrends] = useState<AttendanceTrendPoint[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);

  const loadTrends = useCallback(async () => {
    try { setTrends(await principalApi.getAttendanceTrends(days)); } catch { setTrends([]); }
  }, [days]);

  useEffect(() => {
    let active = true;
    Promise.all([
      principalApi.getDashboard().catch(() => null),
      principalApi.getAcademicPerformance().catch(() => []),
    ]).then(([d, a]) => {
      if (!active) return;
      setDash(d);
      setAcademic(a);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  // Aggregate subject-level rows into per-class averages.
  const classAverages = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of academic) {
      const cur = map.get(r.class) || { sum: 0, count: 0 };
      cur.sum += r.avgPercent; cur.count += 1;
      map.set(r.class, cur);
    }
    return Array.from(map.entries())
      .map(([cls, { sum, count }]) => ({ class: cls, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [academic]);

  const subjectAverages = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of academic) {
      const cur = map.get(r.subject) || { sum: 0, count: 0 };
      cur.sum += r.avgPercent; cur.count += 1;
      map.set(r.subject, cur);
    }
    return Array.from(map.entries())
      .map(([subject, { sum, count }]) => ({ subject, avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [academic]);

  const maxTrend = Math.max(100, ...trends.map((t) => t.rate));

  const barColor = (v: number) => (v >= 70 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500');

  return (
    <DashboardShell
      title="Reports & Analytics"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in print-area">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-foreground">School Analytics</h2>
            <p className="text-sm text-text-secondary">Attendance trends, academic performance and financial summary.</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />} className="no-print">
            Export / Print PDF
          </Button>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Students" value={dash?.enrollment.active} icon={GraduationCap} loading={loading} color="bg-sky-50 text-sky-600" />
          <StatCard label="Attendance This Week" value={dash ? pct(dash.attendance.weekRate) : undefined} icon={CalendarDays} loading={loading} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Fees Collected" value={dash ? pct(100 - dash.fees.outstandingPct) : undefined} icon={Wallet} loading={loading} color="bg-amber-50 text-amber-600" />
          <StatCard label="New Admissions" value={dash?.enrollment.newAdmissions} icon={Award} loading={loading} color="bg-violet-50 text-violet-600" />
        </div>

        {/* Attendance trend */}
        <Card>
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">Attendance Trend</h3>
            </div>
            <div className="w-40 no-print">
              <Select
                value={String(days)}
                onChange={(e) => setDays(Number(e.target.value))}
                options={[
                  { value: '7', label: 'Last 7 days' },
                  { value: '14', label: 'Last 14 days' },
                  { value: '30', label: 'Last 30 days' },
                ]}
              />
            </div>
          </div>
          {trends.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No attendance data for this range.</p>
          ) : (
            <div className="flex items-end gap-1.5 h-48 overflow-x-auto pb-2">
              {trends.map((t) => (
                <div key={t.date} className="flex flex-col items-center gap-1 flex-1 min-w-[18px] group">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className={`w-full max-w-[24px] rounded-t-md transition-all ${barColor(t.rate)}`}
                      style={{ height: `${Math.max(2, (t.rate / maxTrend) * 100)}%` }}
                      title={`${t.date}: ${t.rate}% (${t.records} records)`}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted rotate-0 whitespace-nowrap">{t.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Performance by class */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Award className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">Average Performance by Class</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
            ) : classAverages.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">No results recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {classAverages.map((c) => (
                  <div key={c.class} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-24 shrink-0 truncate">{c.class}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-card-2 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor(c.avg)}`} style={{ width: `${Math.min(100, c.avg)}%` }} />
                    </div>
                    <Badge tone={c.avg >= 70 ? 'success' : c.avg >= 50 ? 'warning' : 'danger'}>{c.avg}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Performance by subject */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">Average Performance by Subject</h3>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
            ) : subjectAverages.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">No results recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {subjectAverages.map((s) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-28 shrink-0 truncate">{s.subject}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-card-2 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor(s.avg)}`} style={{ width: `${Math.min(100, s.avg)}%` }} />
                    </div>
                    <Badge tone={s.avg >= 70 ? 'success' : s.avg >= 50 ? 'warning' : 'danger'}>{s.avg}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Financial summary */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Wallet className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Financial Summary</h3>
          </div>
          {loading || !dash ? (
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-card-2 px-4 py-3">
                <p className="text-xs text-text-muted">Expected</p>
                <p className="text-lg font-bold text-foreground">{money(dash.fees.expected)}</p>
              </div>
              <div className="rounded-xl bg-card-2 px-4 py-3">
                <p className="text-xs text-text-muted">Collected</p>
                <p className="text-lg font-bold text-emerald-600">{money(dash.fees.collected)}</p>
              </div>
              <div className="rounded-xl bg-card-2 px-4 py-3">
                <p className="text-xs text-text-muted">Outstanding</p>
                <p className="text-lg font-bold text-maroon">{money(dash.fees.outstanding)}</p>
              </div>
            </div>
          )}
        </Card>

        {dash && (
          <p className="text-xs text-text-muted text-right">
            Generated {new Date(dash.generatedAt).toLocaleString('en-GB')}
          </p>
        )}
      </div>

      {/* Print styling: hide chrome, keep the report area clean */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside, header { display: none !important; }
          main { overflow: visible !important; padding: 0 !important; }
        }
      `}</style>
    </DashboardShell>
  );
}
