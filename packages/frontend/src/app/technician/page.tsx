'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, ShieldCheck, Activity, Cpu, HardDrive, Clock,
  ArrowRight, RefreshCw, AlertCircle, Terminal, Users, HeartPulse
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { technicianApi, type EnhancedDiagnostics, type AuditLogEntry, type SystemHealth } from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

export default function TechnicianOverviewPage() {
  const [data, setData] = useState<EnhancedDiagnostics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [diag, healthRes] = await Promise.all([
        technicianApi.getEnhancedDiagnostics(),
        technicianApi.getHealth().catch(() => null),
      ]);
      setData(diag);
      setHealth(healthRes);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [diag, healthRes] = await Promise.all([
        technicianApi.getEnhancedDiagnostics(),
        technicianApi.getHealth().catch(() => null),
      ]);
      setData(diag);
      setHealth(healthRes);
      toast.success('System diagnostics updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to refresh diagnostics');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const systemStats = [
    {
      label: 'DB Status',
      value: data?.dbStatus === 'connected' ? 'Connected' : 'Offline',
      detail: data?.dbLatency !== undefined && data.dbLatency >= 0 ? `${data.dbLatency}ms latency` : 'Unavailable',
      icon: HardDrive,
      color: data?.dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600',
    },
    {
      label: 'Server Memory',
      value: data?.systemInfo.memory.split(' / ')[0] || '—',
      detail: `Total: ${data?.systemInfo.memory.split(' / ')[1] || '—'}`,
      icon: Activity,
      color: 'bg-indigo-500/10 text-indigo-600',
    },
    {
      label: 'Processor Cores',
      value: `${data?.systemInfo.cpus || 0} CPUs`,
      detail: `Arch: ${data?.systemInfo.arch || '—'}`,
      icon: Cpu,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'Process Uptime',
      value: data?.systemInfo.uptime || '—',
      detail: `Node: ${data?.systemInfo.nodeVersion || '—'}`,
      icon: Clock,
      color: 'bg-sky-500/10 text-sky-600',
    },
  ];

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Action / Resource',
      accessor: (log) => (
        <div>
          <Badge tone={log.action.includes('DELETE') ? 'danger' : log.action.includes('CREATE') ? 'success' : 'info'} dot>
            {log.action.replace(/_/g, ' ').toLowerCase()}
          </Badge>
          <span className="ml-2 text-xs text-text-secondary font-mono">{log.entityType}</span>
        </div>
      ),
    },
    {
      header: 'Actor',
      accessor: (log) => <span className="text-sm font-medium text-foreground">{log.actor || 'System'}</span>,
    },
    {
      header: 'Details',
      accessor: (log) => {
        const detailsStr = typeof log.details === 'object' && log.details !== null
          ? JSON.stringify(log.details)
          : String(log.details || '');
        return <span className="text-xs text-text-muted font-mono truncate block max-w-xs">{detailsStr}</span>;
      },
    },
    {
      header: 'Time',
      accessor: (log) => <span className="text-xs text-text-secondary">{formatDate(log.timestamp)}</span>,
    },
  ];

  return (
    <DashboardShell
      title="Technician Overview"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Welcome Header */}
        <div
          className="rounded-2xl px-6 py-5 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" /> Technician Console
              </p>
              <h2 className="text-xl font-bold flex items-center gap-3">
                System Status & Operations
                {health && (
                  <Badge
                    tone={health.status === 'healthy' ? 'success' : 'danger'}
                    className="text-xs"
                  >
                    <HeartPulse className="h-3 w-3 inline mr-1" />
                    {health.status === 'healthy' ? 'All Systems Healthy' : 'Degraded'}
                  </Badge>
                )}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                Monitor queues, system logs, services diagnostics, and system health.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* System Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {systemStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="flex items-center gap-3.5 py-5 px-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-black text-foreground mt-0.5 truncate">{loading ? '—' : stat.value}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{loading ? '—' : stat.detail}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Stats & Specs */}
          <div className="space-y-6">
            {/* System Info */}
            <Card>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" /> Host Information
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Hostname', value: data?.systemInfo.hostname },
                  { name: 'OS Platform', value: data?.systemInfo.platform },
                  { name: 'Environment', value: data?.systemInfo.environment },
                  { name: 'Node.js', value: data?.systemInfo.nodeVersion },
                ].map((item) => (
                  <div key={item.name} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="text-text-secondary">{item.name}</span>
                    <span className="font-mono font-medium text-foreground">{loading ? '—' : item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Active Users Stats */}
            <Card>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-maroon" /> Active Records
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Total Accounts', value: data?.userCounts.total },
                  { name: 'Students', value: data?.userCounts.students || 0 },
                  { name: 'Teachers', value: data?.userCounts.teachers || 0 },
                  { name: 'Administrators', value: data?.userCounts.admins || 0 },
                ].map((item) => (
                  <div key={item.name} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span className="text-text-secondary">{item.name}</span>
                    <span className="font-bold text-foreground">{loading ? '—' : item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Audit Activities */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-600" /> Recent System Logs
                </h3>
                <Link href="/technician/logs" className="text-xs text-maroon hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex-1 overflow-auto min-h-[300px]">
                <Table
                  columns={columns}
                  data={data?.recentAuditEntries || []}
                  keyFor={(l) => l.id}
                  loading={loading}
                  emptyMessage="No system logs found."
                  emptyIcon={<AlertCircle className="h-10 w-10 text-text-muted" />}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
