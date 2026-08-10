'use client';

import { useEffect, useState } from 'react';
import {
  Monitor, RefreshCw, AlertCircle, Clock, User, Shield, ChevronRight,
  Wifi, WifiOff, Eye, LogOut, Activity, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { technicianApi, type ActiveDevice, type DeviceTelemetry } from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

export default function TechnicianDevicesPage() {
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await technicianApi.getDevices();
      setDevices(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await technicianApi.getDevices();
      setDevices(res);
      toast.success('Sessions refreshed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleViewTelemetry(device: ActiveDevice) {
    setTelemetryLoading(true);
    setSelectedDevice(null);
    try {
      const res = await technicianApi.getDeviceTelemetry(device.id);
      setSelectedDevice(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load telemetry');
    } finally {
      setTelemetryLoading(false);
    }
  }

  async function handleForceLogout(deviceId: string) {
    if (!window.confirm('Are you sure you want to force logout this session? The user will be immediately disconnected.')) return;
    try {
      await technicianApi.revokeDeviceSession(deviceId);
      toast.success('User session revoked');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke session');
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Poll telemetry for the inspected device
  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(async () => {
      try {
        const res = await technicianApi.getDeviceTelemetry(selectedDevice.sessionId);
        setSelectedDevice(res);
      } catch (e) {
        console.error('Error polling telemetry:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedDevice?.sessionId]);

  const roleColor: Record<string, string> = {
    student: 'info',
    teacher: 'success',
    admin: 'warning',
    superadmin: 'danger',
    accountant: 'warning',
    technician: 'maroon',
    principal: 'warning',
    hod: 'success',
    parent: 'neutral',
  };

  const columns: Column<ActiveDevice>[] = [
    {
      header: 'User',
      accessor: (d) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-maroon/10 text-maroon text-xs font-bold">
            {d.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{d.userName}</p>
            <span className="text-[11px] text-text-muted font-mono">{d.userEmail}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (d) => (
        <Badge tone={(roleColor[d.userRole] || 'neutral') as any} className="capitalize">{d.userRole}</Badge>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <Badge tone="success" dot>Active</Badge>
      ),
    },
    {
      header: 'Session Age',
      accessor: (d) => {
        const mins = d.sessionAge;
        const display = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
        return <span className="text-sm font-mono text-foreground">{display}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: (d) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewTelemetry(d)}
            loading={telemetryLoading}
            icon={<Eye className="h-3.5 w-3.5" />}
          >
            Inspect
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleForceLogout(d.id)}
            icon={<LogOut className="h-3.5 w-3.5" />}
          >
            Force Logout
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Active Sessions"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Wifi className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Currently logged in</p>
              <p className="text-2xl font-black text-foreground">{loading ? '—' : devices.length}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-2 hover:bg-border/30 border border-border transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </Card>

        {/* Sessions Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-card-2 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-foreground text-sm">Active User Sessions</h3>
          </div>
          <div className="overflow-x-auto min-h-[400px]">
            <Table
              columns={columns}
              data={devices}
              keyFor={(d) => d.id}
              loading={loading}
              emptyMessage="No active sessions found."
              emptyIcon={<WifiOff className="h-10 w-10 text-text-muted" />}
            />
          </div>
        </Card>

        {/* Telemetry Modal */}
        <Modal
          open={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          title="Session Inspector"
          size="lg"
        >
          {selectedDevice && (() => {
            const events = selectedDevice.telemetryEvents || [];
            const latestMouse = [...events].reverse().find((e) => e.type === 'mousemove');
            const latestPage = [...events].reverse().find((e) => e.type === 'pageview');
            const keypressEvents = events.filter((e) => e.type === 'keypress');
            const tabLeaveEvents = events.filter((e) => e.type === 'tab-leave');
            const currentPage = latestPage?.details?.path || '/dashboard';
            
            const lastEvent = events[events.length - 1];
            const isIdle = lastEvent ? (Date.now() - lastEvent.timestamp > 15000) : true;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/60 pb-4">
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">User</span>
                    <span className="text-sm font-medium text-foreground">{selectedDevice.user.name}</span>
                    <span className="block text-xs text-text-muted font-mono mt-0.5">{selectedDevice.user.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Role</span>
                    <Badge tone="maroon" className="mt-1 capitalize">{selectedDevice.user.role}</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Session Created</span>
                    <span className="text-sm text-foreground font-medium">{formatDate(selectedDevice.session.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold">Session Age</span>
                    <span className="text-sm text-foreground font-medium">{selectedDevice.session.ageMinutes} minutes</span>
                  </div>
                </div>

                {/* Exam Integrity Alerts */}
                {tabLeaveEvents.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 flex flex-col gap-2 text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-pulse" />
                      Exam Integrity Violation Detected: Left Exam Screen
                    </span>
                    <ul className="list-disc pl-5 font-mono space-y-1 mt-1 text-red-400">
                      {tabLeaveEvents.map((evt, idx) => (
                        <li key={idx}>
                          Left exam screen at {new Date(evt.timestamp).toLocaleTimeString()} ({evt.details?.examTitle || 'Exam'}) - Warning #{evt.details?.warningCount || idx + 1}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Live Activity Canvas & Keylog */}
                <div className="mt-4 border-t border-border/60 pt-4">
                  <h3 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-maroon" /> Live Activity (Client Canvas)
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Client screen preview */}
                    <div className="lg:col-span-2 space-y-2">
                      <div className="flex items-center justify-between text-xs text-text-secondary px-1">
                        <span>Active Page: <span className="font-mono text-foreground font-semibold">{currentPage}</span></span>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className={`h-2.5 w-2.5 rounded-full ${isIdle ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                          {isIdle ? 'Idle' : 'Active'}
                        </span>
                      </div>
                      
                      {/* Visual Screen Container */}
                      <div className="relative aspect-video rounded-xl border border-white/10 bg-black/40 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                        {/* Browser chrome */}
                        <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 border-b border-white/5 flex items-center px-3 gap-1.5 select-none">
                          <div className="h-2 w-2 rounded-full bg-rose-500/80" />
                          <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                          <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                          <div className="h-3.5 w-1/3 mx-auto bg-white/10 rounded text-[9px] flex items-center justify-center text-white/40 truncate font-mono">
                            {currentPage}
                          </div>
                        </div>
                        
                        {/* Canvas placeholder */}
                        <div className="flex-1 flex items-center justify-center text-white/5 text-[10px] uppercase tracking-widest select-none pointer-events-none mt-6">
                          Live Client Canvas
                        </div>
                        
                        {/* Cursor representation */}
                        {latestMouse && (
                          <div
                            className="absolute h-5 w-5 pointer-events-none transition-all duration-300 ease-out z-50 flex flex-col items-center"
                            style={{
                              left: `${latestMouse.details.x}%`,
                              top: `${latestMouse.details.y}%`,
                              transform: 'translate(-6px, -6px)',
                            }}
                          >
                            <div className="h-3.5 w-3.5 rounded-full bg-rose-500 border border-white shadow-lg animate-ping absolute" />
                            <div className="h-3.5 w-3.5 rounded-full bg-rose-500 border border-white shadow-lg" />
                            <span className="text-[7px] bg-black/70 px-1 rounded text-white/80 mt-1 whitespace-nowrap font-mono">
                              {latestMouse.details.x}%, {latestMouse.details.y}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Live Keylog */}
                    <div className="space-y-2 flex flex-col">
                      <span className="text-xs text-text-secondary font-semibold px-1">Keypress Ticker</span>
                      <div className="flex-1 min-h-[140px] rounded-xl border border-border bg-card-2 p-3 overflow-y-auto font-mono text-xs text-foreground shadow-inner">
                        {keypressEvents.length === 0 ? (
                          <p className="text-text-muted italic text-center pt-8">No keyboard activity...</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 leading-relaxed">
                            {keypressEvents.map((evt, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/5 font-bold shadow-sm"
                              >
                                {evt.details.key === ' ' ? 'Space' : evt.details.key === 'Enter' ? '↵' : evt.details.key}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-text-muted uppercase tracking-wider block font-semibold mb-2">Server Metrics</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Uptime', value: `${selectedDevice.serverMetrics.uptime}s` },
                      { label: 'Memory', value: selectedDevice.serverMetrics.memoryUsed },
                      { label: 'Heap Limit', value: selectedDevice.serverMetrics.memoryTotal },
                      { label: 'CPU Cores', value: String(selectedDevice.serverMetrics.cpus) },
                    ].map((m) => (
                      <div key={m.label} className="bg-card-2 rounded-xl p-3 border border-border/50">
                        <p className="text-[10px] font-semibold text-text-secondary uppercase">{m.label}</p>
                        <p className="text-sm font-bold font-mono text-foreground mt-0.5">{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/60">
                  <Button variant="secondary" onClick={() => setSelectedDevice(null)}>Close</Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    </DashboardShell>
  );
}
