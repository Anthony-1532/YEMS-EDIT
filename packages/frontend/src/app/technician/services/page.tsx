'use client';

import { useEffect, useState } from 'react';
import {
  Layers, RefreshCw, Server, Play, AlertTriangle, CheckCircle,
  Clock, Flame, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { technicianApi, type SystemService, type SystemQueue } from '@/lib/api/technician';
import { ApiError } from '@/lib/api/client';

export default function TechnicianServicesPage() {
  const [services, setServices] = useState<SystemService[]>([]);
  const [queues, setQueues] = useState<SystemQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const [servicesData, queuesData] = await Promise.all([
        technicianApi.getServices(),
        technicianApi.getQueues().catch(() => []),
      ]);
      setServices(servicesData);
      setQueues(queuesData);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestart(serviceName: string) {
    setRestarting((prev) => ({ ...prev, [serviceName]: true }));
    try {
      const res = await technicianApi.restartService(serviceName);
      toast.success(res.message || `Service ${serviceName} restart initiated.`);
      // Refresh after a brief delay
      setTimeout(load, 1500);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Failed to restart ${serviceName}`);
    } finally {
      setRestarting((prev) => ({ ...prev, [serviceName]: false }));
    }
  }

  const serviceColumns: Column<SystemService>[] = [
    {
      header: 'Service Name',
      accessor: (s) => (
        <div>
          <p className="font-semibold text-foreground">{s.displayName}</p>
          <span className="text-xs text-text-muted font-mono">{s.name}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => (
        <Badge tone={s.status === 'operational' ? 'success' : 'danger'} dot>
          {s.status === 'operational' ? 'Operational' : 'Offline'}
        </Badge>
      ),
    },
    {
      header: 'Type',
      accessor: (s) => <span className="text-sm text-text-secondary capitalize">{s.type}</span>,
    },
    {
      header: 'Throughput',
      accessor: (s) => <span className="text-sm font-mono text-foreground">{s.throughput}</span>,
    },
    {
      header: 'Limits / Spec',
      accessor: (s) => <span className="text-xs text-text-muted font-mono">{s.limit}</span>,
    },
    {
      header: 'Actions',
      accessor: (s) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleRestart(s.name)}
          loading={restarting[s.name]}
          disabled={s.status === 'offline' && s.name === 'postgres-db'}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Restart
        </Button>
      ),
      className: 'text-right',
    },
  ];

  return (
    <DashboardShell
      title="Services & Queues"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Services Section */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-600" /> Active System Services
              </h3>
              <p className="text-sm text-text-secondary">Core and helper services running the YEMS application</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-2 hover:bg-border/30 border border-border transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <Table
            columns={serviceColumns}
            data={services}
            keyFor={(s) => s.name}
            loading={loading}
            emptyMessage="No services detected."
          />
        </Card>

        {/* Queues Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-maroon" /> BullMQ Job Queues
              </h3>
              <p className="text-sm text-text-secondary">Active task queues processed in the background by Redis</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="skeleton h-48 rounded-2xl w-full" />
              <div className="skeleton h-48 rounded-2xl w-full" />
            </div>
          ) : queues.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
              <p className="text-lg font-medium text-foreground">No queues running</p>
              <p className="text-sm text-text-secondary mt-1">Queues are disabled (Redis connection is unavailable or version is too old)</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {queues.map((q) => (
                <Card key={q.name} className="overflow-hidden border-border/50">
                  <div className="flex justify-between items-start border-b border-border/40 pb-4 mb-4">
                    <div>
                      <h4 className="text-base font-bold text-foreground">{q.displayName}</h4>
                      <span className="text-xs font-mono text-text-secondary">Name: {q.name}</span>
                    </div>
                    <Badge tone="info" className="font-mono">concurrency: {q.concurrency}</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-indigo-500/5 rounded-xl py-3 border border-indigo-500/10">
                      <div className="flex items-center justify-center gap-1 text-indigo-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Waiting</span>
                      </div>
                      <p className="text-xl font-black text-indigo-600 mt-1">{q.waiting}</p>
                    </div>

                    <div className="bg-amber-500/5 rounded-xl py-3 border border-amber-500/10">
                      <div className="flex items-center justify-center gap-1 text-amber-600">
                        <Flame className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Active</span>
                      </div>
                      <p className="text-xl font-black text-amber-600 mt-1">{q.active}</p>
                    </div>

                    <div className="bg-emerald-500/5 rounded-xl py-3 border border-emerald-500/10">
                      <div className="flex items-center justify-center gap-1 text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Done</span>
                      </div>
                      <p className="text-xl font-black text-emerald-600 mt-1">{q.completed}</p>
                    </div>

                    <div className="bg-rose-500/5 rounded-xl py-3 border border-rose-500/10">
                      <div className="flex items-center justify-center gap-1 text-rose-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Failed</span>
                      </div>
                      <p className="text-xl font-black text-rose-600 mt-1">{q.failed}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
