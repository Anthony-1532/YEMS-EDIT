'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, RefreshCw, Activity, Users, AlertTriangle, Server,
  Clock, Cpu, HardDrive, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  technicianApi,
  type EnhancedDiagnostics,
  type SystemHealth,
  type SystemAlert,
  type ActiveDevice,
  type SystemQueue,
} from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';

const CHART_COLORS = {
  maroon: '#800020',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  slate: '#64748b',
  violet: '#8b5cf6',
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#0ea5e9'];

export default function TechnicianAnalyticsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [diag, setDiag] = useState<EnhancedDiagnostics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [queues, setQueues] = useState<SystemQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [healthRes, diagRes, alertsRes, devicesRes, queuesRes] = await Promise.all([
        technicianApi.getHealth().catch(() => null),
        technicianApi.getEnhancedDiagnostics().catch(() => null),
        technicianApi.getAlerts().catch(() => []),
        technicianApi.getDevices().catch(() => []),
        technicianApi.getQueues().catch(() => []),
      ]);
      setHealth(healthRes);
      setDiag(diagRes);
      setAlerts(alertsRes);
      setDevices(devicesRes);
      setQueues(queuesRes);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [healthRes, diagRes, alertsRes, devicesRes, queuesRes] = await Promise.all([
        technicianApi.getHealth().catch(() => null),
        technicianApi.getEnhancedDiagnostics().catch(() => null),
        technicianApi.getAlerts().catch(() => []),
        technicianApi.getDevices().catch(() => []),
        technicianApi.getQueues().catch(() => []),
      ]);
      setHealth(healthRes);
      setDiag(diagRes);
      setAlerts(alertsRes);
      setDevices(devicesRes);
      setQueues(queuesRes);
      toast.success('Analytics refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // --- Derived chart data ---

  // 1. Memory usage for area chart
  const memUsed = health ? health.totalMemory - health.freeMemory : 0;
  const memTotal = health?.totalMemory || 1;
  const memUsedGB = (memUsed / (1024 * 1024 * 1024)).toFixed(1);
  const memTotalGB = (memTotal / (1024 * 1024 * 1024)).toFixed(1);
  const memPercent = ((memUsed / memTotal) * 100).toFixed(0);

  // Historical memory trend is not available: the backend does not expose a
  // time-series endpoint. Rather than fabricate points, we render an empty state.

  // 2. Alert severity distribution for pie chart
  const alertSeverityData = [
    { name: 'Critical', value: alerts.filter((a) => a.severity === 'critical').length },
    { name: 'Warning', value: alerts.filter((a) => a.severity === 'warning').length },
    { name: 'Info', value: alerts.filter((a) => a.severity === 'info').length },
  ];

  // 3. User sessions by role for bar chart
  const roleCounts: Record<string, number> = {};
  devices.forEach((d) => {
    roleCounts[d.userRole] = (roleCounts[d.userRole] || 0) + 1;
  });
  const sessionByRoleData = Object.entries(roleCounts).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1),
    sessions: count,
  }));

  // 4. Queue performance for grouped bar chart
  const queueData = queues.map((q) => ({
    name: q.displayName,
    waiting: q.waiting,
    active: q.active,
    completed: q.completed,
    failed: q.failed,
  }));

  // 5. DB latency & load average for line chart
  const systemMetrics = [
    { name: 'DB Latency', value: diag?.dbLatency || 0, unit: 'ms' },
    { name: 'Load Avg', value: health?.loadAvg?.[0] || 0, unit: '' },
    { name: 'Uptime (h)', value: health ? Math.floor(health.uptime / 3600) : 0, unit: 'h' },
    { name: 'Active Sessions', value: health?.activeSessions || devices.length, unit: '' },
  ];

  // 6. User distribution for pie chart
  const userDistData = [
    { name: 'Students', value: diag?.userCounts?.students || 0 },
    { name: 'Teachers', value: diag?.userCounts?.teachers || 0 },
    { name: 'Admins', value: diag?.userCounts?.admins || 0 },
  ].filter((d) => d.value > 0);

  return (
    <DashboardShell
      title="System Analytics"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" /> Performance Analytics
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">Real-time system metrics and visual insights</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card-2 hover:bg-border/30 border border-border transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'DB Latency', value: loading ? '—' : `${diag?.dbLatency ?? '—'}ms`, icon: HardDrive, color: 'bg-emerald-500/10 text-emerald-600' },
            { label: 'Memory Used', value: loading ? '—' : `${memPercent}%`, detail: `${memUsedGB} / ${memTotalGB} GB`, icon: Activity, color: 'bg-indigo-500/10 text-indigo-600' },
            { label: 'Active Sessions', value: loading ? '—' : String(health?.activeSessions || devices.length), icon: Users, color: 'bg-sky-500/10 text-sky-600' },
            { label: 'Open Alerts', value: loading ? '—' : String(alerts.filter((a) => !a.acknowledged).length), icon: AlertTriangle, color: 'bg-rose-500/10 text-rose-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="flex items-center gap-3.5 py-4 px-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-black text-foreground mt-0.5">{stat.value}</p>
                  {stat.detail && <p className="text-xs text-text-muted">{stat.detail}</p>}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Memory Usage Trend */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-indigo-600" />
              <h3 className="font-semibold text-foreground text-sm">Memory Usage Trend</h3>
            </div>
            <div className="h-[250px] flex items-center justify-center">
              <div className="text-center text-text-muted">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Historical data not available</p>
                <p className="text-xs mt-1">
                  {loading ? 'Loading…' : `Current usage: ${memUsedGB} / ${memTotalGB} GB (${memPercent}%)`}
                </p>
              </div>
            </div>
          </Card>

          {/* Alert Severity Distribution */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <h3 className="font-semibold text-foreground text-sm">Alert Severity Distribution</h3>
            </div>
            <div className="h-[250px] flex items-center justify-center">
              {alertSeverityData.every((d) => d.value === 0) ? (
                <div className="text-center text-text-muted">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No alerts — system is healthy</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertSeverityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {alertSeverityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Sessions by Role */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-foreground text-sm">Active Sessions by Role</h3>
            </div>
            <div className="h-[250px]">
              {sessionByRoleData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-muted">
                  <p className="text-sm">No active sessions</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionByRoleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="role" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="sessions" fill={CHART_COLORS.emerald} radius={[6, 6, 0, 0]} name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Queue Performance */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-violet-600" />
              <h3 className="font-semibold text-foreground text-sm">Queue Performance</h3>
            </div>
            <div className="h-[250px]">
              {queueData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-muted">
                  <Layers className="h-6 w-6 mr-2 opacity-30" />
                  <p className="text-sm">No queues running (Redis unavailable)</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={queueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="waiting" fill={CHART_COLORS.sky} radius={[4, 4, 0, 0]} name="Waiting" />
                    <Bar dataKey="active" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} name="Active" />
                    <Bar dataKey="completed" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="failed" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* System Metrics Bar */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-foreground text-sm">System Metrics</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemMetrics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {systemMetrics.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={[CHART_COLORS.indigo, CHART_COLORS.amber, CHART_COLORS.emerald, CHART_COLORS.sky][index % 4]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* User Distribution Pie */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-sky-600" />
              <h3 className="font-semibold text-foreground text-sm">User Distribution</h3>
            </div>
            <div className="h-[250px] flex items-center justify-center">
              {userDistData.length === 0 ? (
                <div className="text-center text-text-muted">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No user data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {userDistData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={[CHART_COLORS.maroon, CHART_COLORS.indigo, CHART_COLORS.emerald][index % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

        </div>

        {/* DB Status & Health Summary */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-foreground text-sm">Health Summary</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'API', ok: health?.api ?? false },
              { label: 'Database', ok: health?.database ?? false },
              { label: 'DB Connected', ok: diag?.dbStatus === 'connected' },
              { label: 'Environment', ok: true, extra: health?.environment || diag?.systemInfo?.environment },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-card-2 border border-border/50">
                <div className={`h-3 w-3 rounded-full shrink-0 ${item.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary">{item.label}</p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {item.extra || (item.ok ? 'Healthy' : 'Offline')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
