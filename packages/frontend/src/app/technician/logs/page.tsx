'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Search, Eye, FilterX, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { technicianApi, type AuditLogEntry } from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

export default function TechnicianLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [limit, setLimit] = useState(100);

  // Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Common options for filter lists (derived dynamically or standard defaults)
  const entityTypeOptions = [
    { value: 'users', label: 'Users' },
    { value: 'auth', label: 'Auth / Sessions' },
    { value: 'classes', label: 'Classes' },
    { value: 'courses', label: 'Courses' },
    { value: 'exams', label: 'Exams' },
    { value: 'grades', label: 'Grades' },
    { value: 'assignments', label: 'Assignments' },
    { value: 'billing', label: 'Billing / Fees' },
    { value: 'system', label: 'System Operations' },
  ];

  const actionOptions = [
    { value: 'post.login', label: 'login (POST)' },
    { value: 'post.logout', label: 'logout (POST)' },
    { value: 'post.users', label: 'create user (POST)' },
    { value: 'patch.users', label: 'update user (PATCH)' },
    { value: 'delete.users', label: 'delete user (DELETE)' },
    { value: 'post.classes', label: 'create class (POST)' },
    { value: 'patch.classes', label: 'update class (PATCH)' },
    { value: 'post.exams', label: 'create exam (POST)' },
    { value: 'post.billing', label: 'create bill (POST)' },
  ];

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await technicianApi.getLogs({
        limit,
        action: selectedAction || undefined,
        entityType: selectedEntityType || undefined,
      });
      setLogs(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to retrieve system logs');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await technicianApi.getLogs({
        limit,
        action: selectedAction || undefined,
        entityType: selectedEntityType || undefined,
      });
      setLogs(res);
      toast.success('System logs refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to refresh logs');
    } finally {
      setRefreshing(false);
    }
  }

  function handleResetFilters() {
    setSearchQuery('');
    setSelectedAction('');
    setSelectedEntityType('');
    setLimit(100);
  }

  // Fetch when filters change
  useEffect(() => {
    loadLogs();
  }, [selectedAction, selectedEntityType, limit]);

  // Client-side search matching actorName, details, or entityId
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (log.actor || '').toLowerCase().includes(q) ||
      (log.actorId || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.entityType || '').toLowerCase().includes(q) ||
      (log.entityId || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q)
    );
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Action / Resource',
      accessor: (log) => (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <Badge
            tone={
              log.action.includes('delete')
                ? 'danger'
                : log.action.includes('post') || log.action.includes('create')
                ? 'success'
                : log.action.includes('patch') || log.action.includes('put')
                ? 'warning'
                : 'info'
            }
            dot
          >
            {log.action.replace(/_/g, ' ').toLowerCase()}
          </Badge>
          <span className="text-[10px] text-text-secondary font-mono bg-card-2 border border-border/50 rounded px-1.5 py-0.5 max-w-max">
            {log.entityType}
          </span>
        </div>
      ),
    },
    {
      header: 'Actor',
      accessor: (log) => (
        <div>
          <span className="text-sm font-semibold text-foreground">{log.actor || 'System'}</span>
          {log.actorId && (
            <span className="block text-[10px] text-text-muted font-mono truncate max-w-[120px]">
              ID: {log.actorId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Details Preview',
      accessor: (log) => {
        const detailsStr = typeof log.details === 'object' && log.details !== null
          ? JSON.stringify(log.details)
          : String(log.details || '');
        return (
          <span className="text-xs text-text-muted font-mono truncate block max-w-xs md:max-w-md">
            {detailsStr || '—'}
          </span>
        );
      },
    },
    {
      header: 'Timestamp',
      accessor: (log) => (
        <span className="text-xs text-text-secondary font-medium">
          {formatDate(log.timestamp)}
        </span>
      ),
    },
    {
      header: 'Inspect',
      accessor: (log) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSelectedLog(log)}
          icon={<Eye className="h-3.5 w-3.5" />}
        >
          View
        </Button>
      ),
      className: 'text-right',
    },
  ];

  // Safely parse JSON for inspector modal
  const renderLogDetails = (detailsVal: any) => {
    try {
      const parsed = typeof detailsVal === 'object' && detailsVal !== null
        ? detailsVal
        : JSON.parse(detailsVal);
      return (
        <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-auto max-h-96 border border-slate-800">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div className="p-4 rounded-xl bg-card-2 border border-border font-mono text-xs text-foreground whitespace-pre-wrap break-all">
          {String(detailsVal)}
        </div>
      );
    }
  };

  return (
    <DashboardShell
      title="System Audit Logs"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Filter Card */}
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            {/* Top Search & Refresh */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  placeholder="Search logs by keyword, actor, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                {searchQuery || selectedAction || selectedEntityType || limit !== 100 ? (
                  <Button
                    variant="secondary"
                    onClick={handleResetFilters}
                    icon={<FilterX className="h-4 w-4" />}
                  >
                    Clear Filters
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={handleRefresh}
                  loading={refreshing || loading}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Refresh Logs
                </Button>
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Select
                label="Resource Type"
                value={selectedEntityType}
                options={entityTypeOptions}
                placeholder="All Resources"
                onChange={(e) => setSelectedEntityType(e.target.value)}
              />
              <Select
                label="System Action"
                value={selectedAction}
                options={actionOptions}
                placeholder="All Actions"
                onChange={(e) => setSelectedAction(e.target.value)}
              />
              <Select
                label="Log Limits"
                value={String(limit)}
                options={[
                  { value: '50', label: '50 entries' },
                  { value: '100', label: '100 entries' },
                  { value: '250', label: '250 entries' },
                  { value: '500', label: '500 entries' },
                ]}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
              <div className="flex flex-col justify-end p-1 text-xs text-text-muted font-medium">
                Showing {filteredLogs.length} of {logs.length} fetched logs
              </div>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-card-2 flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Event Stream
            </h3>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            <Table
              columns={columns}
              data={filteredLogs}
              keyFor={(log) => log.id}
              loading={loading}
              emptyMessage="No system audit logs found matching current filter settings."
              emptyIcon={<AlertCircle className="h-10 w-10 text-text-muted" />}
            />
          </div>
        </Card>

        {/* Inspector Modal */}
        <Modal
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Inspector"
          size="lg"
        >
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/60 pb-4">
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Log ID</span>
                  <span className="text-sm font-mono text-foreground select-all font-medium">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Action / Route</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone="maroon">{selectedLog.action}</Badge>
                    <span className="text-xs text-text-secondary font-mono">{selectedLog.entityType}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Actor / User</span>
                  <span className="text-sm text-foreground font-medium">{selectedLog.actor || 'System'}</span>
                  {selectedLog.actorId && (
                    <span className="block text-xs text-text-muted font-mono mt-0.5">ID: {selectedLog.actorId}</span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Logged At</span>
                  <span className="text-sm text-foreground font-medium">{formatDate(selectedLog.timestamp)}</span>
                </div>
                {selectedLog.entityId && (
                  <div className="sm:col-span-2">
                    <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Target Entity ID</span>
                    <span className="text-sm font-mono text-foreground font-medium">{selectedLog.entityId}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold mb-2">Payload & Context Details</span>
                {selectedLog.details ? renderLogDetails(selectedLog.details) : (
                  <p className="text-sm text-text-muted italic">No extra metadata attached to this log entry.</p>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-border/60">
                <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                  Close Inspector
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardShell>
  );
}
