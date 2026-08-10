'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Download, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api/admin';
import type { AuditLog } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  success: 'success',
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  failed: 'danger',
  error: 'danger',
};

const ACTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  APPROVE: 'success',
  REJECT: 'danger',
  SUSPEND: 'warning',
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs(500);
      setLogs(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Build unique action types from logs
  const actionOptions = useMemo(() => {
    const unique = Array.from(new Set(logs.map((l) => l.action.split('_')[0]).filter(Boolean)));
    return unique.map((a) => ({ value: a, label: a }));
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter && l.status?.toLowerCase() !== statusFilter) return false;
      if (actionFilter && !l.action.toUpperCase().startsWith(actionFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          l.user.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, statusFilter, actionFilter]);

  function exportCSV() {
    const rows = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Status'],
      ...filtered.map((l) => [l.timestamp, l.user, l.action, l.resource, l.status]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  }

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessor: (l) => (
        <span className="text-xs text-text-secondary whitespace-nowrap">{formatDate(l.timestamp)}</span>
      ),
    },
    {
      header: 'User',
      accessor: (l) => <span className="font-medium text-foreground text-sm">{l.user}</span>,
    },
    {
      header: 'Action',
      accessor: (l) => {
        const key = l.action.split('_')[0];
        return (
          <Badge tone={ACTION_TONE[key] || 'neutral'}>
            {l.action.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        );
      },
    },
    { header: 'Resource', accessor: (l) => <span className="text-sm text-text-secondary">{l.resource}</span> },
    {
      header: 'Status',
      accessor: (l) => (
        <Badge tone={STATUS_TONE[l.status?.toLowerCase()] || 'neutral'} dot>
          {l.status}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Audit Logs"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            <Input
              placeholder="Search action, user, resource…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="min-w-[200px] sm:max-w-xs"
            />
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={actionOptions}
              placeholder="All actions"
              className="sm:max-w-[140px]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
                { value: 'error', label: 'Error' },
              ]}
              placeholder="All statuses"
              className="sm:max-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!loading && (
              <span className="text-sm text-text-secondary">{filtered.length} log{filtered.length !== 1 ? 's' : ''}</span>
            )}
            <Button variant="secondary" size="sm" onClick={exportCSV} icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={load} icon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={filtered}
          keyFor={(l) => l.id}
          loading={loading}
          emptyMessage="No audit logs found."
          emptyIcon={<ShieldCheck className="h-10 w-10" />}
          compact
        />
      </Card>
    </DashboardShell>
  );
}
