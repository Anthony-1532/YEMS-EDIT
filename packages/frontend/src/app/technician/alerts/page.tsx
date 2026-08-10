'use client';

import { useEffect, useState } from 'react';
import {
  Bell, RefreshCw, AlertTriangle, AlertCircle, Info, CheckCircle,
  ShieldCheck, FilterX, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { technicianApi, type SystemAlert } from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

export default function TechnicianAlertsPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);

  // Filter states
  const [severityFilter, setSeverityFilter] = useState('');
  const [showAcked, setShowAcked] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await technicianApi.getAlerts();
      setAlerts(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await technicianApi.getAlerts();
      setAlerts(res);
      toast.success('Alerts refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to refresh alerts');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAcknowledge() {
    if (!selectedAlert) return;
    setAcknowledging(true);
    try {
      await technicianApi.acknowledgeAlert(selectedAlert.id, resolutionNote);
      toast.success('Alert acknowledged');
      setSelectedAlert(null);
      setResolutionNote('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to acknowledge alert');
    } finally {
      setAcknowledging(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter && a.severity !== severityFilter) return false;
    if (!showAcked && a.acknowledged) return false;
    return true;
  });

  const severityIcon: Record<string, typeof AlertTriangle> = {
    critical: AlertTriangle,
    warning: AlertCircle,
    info: Info,
  };

  const severityColor: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info',
  };

  const columns: Column<SystemAlert>[] = [
    {
      header: 'Severity',
      accessor: (a) => {
        const Icon = severityIcon[a.severity] || Info;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'}`} />
            <Badge tone={(severityColor[a.severity] || 'info') as any} className="capitalize">{a.severity}</Badge>
          </div>
        );
      },
    },
    {
      header: 'Alert',
      accessor: (a) => (
        <div>
          <p className="text-sm font-semibold text-foreground">{a.title}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate max-w-md">{a.description}</p>
        </div>
      ),
    },
    {
      header: 'Source',
      accessor: (a) => (
        <span className="text-xs font-mono text-text-secondary bg-card-2 border border-border/50 rounded px-2 py-0.5">
          {a.source}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (a) => (
        a.acknowledged
          ? <Badge tone="success" dot>Acknowledged</Badge>
          : <Badge tone="warning" dot>Active</Badge>
      ),
    },
    {
      header: 'Time',
      accessor: (a) => (
        <span className="text-xs text-text-secondary">{formatDate(a.createdAt)}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (a) => (
        !a.acknowledged ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setSelectedAlert(a); setResolutionNote(''); }}
            icon={<CheckCircle className="h-3.5 w-3.5" />}
          >
            Ack
          </Button>
        ) : (
          <span className="text-xs text-text-muted italic">Resolved</span>
        )
      ),
      className: 'text-right',
    },
  ];

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length;
  const infoCount = alerts.filter((a) => a.severity === 'info' && !a.acknowledged).length;

  return (
    <DashboardShell
      title="System Alerts"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex items-center gap-3.5 py-4 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Critical</p>
              <p className="text-2xl font-black text-foreground">{loading ? '—' : criticalCount}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3.5 py-4 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Warnings</p>
              <p className="text-2xl font-black text-foreground">{loading ? '—' : warningCount}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3.5 py-4 px-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10">
              <Info className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Info</p>
              <p className="text-2xl font-black text-foreground">{loading ? '—' : infoCount}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2">
              {['', 'critical', 'warning', 'info'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    severityFilter === s
                      ? 'bg-maroon text-white'
                      : 'bg-card-2 text-text-secondary hover:bg-border/30 border border-border'
                  }`}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAcked}
                  onChange={(e) => setShowAcked(e.target.checked)}
                  className="rounded border-border"
                />
                Show acknowledged
              </label>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-2 hover:bg-border/30 border border-border transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </Card>

        {/* Alerts Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-card-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground text-sm">System Alert Stream</h3>
            <span className="text-xs text-text-muted ml-auto">{filteredAlerts.length} alert(s)</span>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            <Table
              columns={columns}
              data={filteredAlerts}
              keyFor={(a) => a.id}
              loading={loading}
              emptyMessage="No alerts detected. System is healthy."
              emptyIcon={<CheckCircle className="h-10 w-10 text-emerald-500" />}
            />
          </div>
        </Card>

        {/* Acknowledge Modal */}
        <Modal
          open={!!selectedAlert}
          onClose={() => { setSelectedAlert(null); setResolutionNote(''); }}
          title="Acknowledge Alert"
          size="md"
        >
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card-2 border border-border/50">
                {(() => {
                  const Icon = severityIcon[selectedAlert.severity] || Info;
                  return <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${selectedAlert.severity === 'critical' ? 'text-red-500' : selectedAlert.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'}`} />;
                })()}
                <div>
                  <p className="font-semibold text-foreground">{selectedAlert.title}</p>
                  <p className="text-sm text-text-muted mt-1">{selectedAlert.description}</p>
                </div>
              </div>

              <Input
                label="Resolution Note (optional)"
                placeholder="Describe how this was resolved..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <Button variant="secondary" onClick={() => { setSelectedAlert(null); setResolutionNote(''); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAcknowledge}
                  loading={acknowledging}
                  icon={<CheckCircle className="h-4 w-4" />}
                >
                  Acknowledge
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardShell>
  );
}
