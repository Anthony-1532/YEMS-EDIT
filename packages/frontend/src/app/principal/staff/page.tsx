'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Users, Search, Check, X, Send, ScrollText, NotebookPen, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import {
  principalApi, staffRequestsApi,
  type StaffActivityRow, type StaffRequestRow,
} from '@/lib/api/principal';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

const money = (n: number) => '₦' + Math.round(n || 0).toLocaleString();

type Tab = 'directory' | 'requests';

export default function PrincipalStaffPage() {
  const [tab, setTab] = useState<Tab>('directory');

  // Directory
  const [staff, setStaff] = useState<StaffActivityRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [search, setSearch] = useState('');

  // Reassign class-teacher modal
  const [reassign, setReassign] = useState<StaffActivityRow | null>(null);
  const [reassignClass, setReassignClass] = useState('');
  const [savingReassign, setSavingReassign] = useState(false);

  // Requests
  const [requests, setRequests] = useState<StaffRequestRow[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StaffRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const rows = await principalApi.getStaffActivity();
      setStaff(rows);
    } catch {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoadingReq(true);
    try {
      const rows = await staffRequestsApi.getAll();
      setRequests(rows);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReq(false);
    }
  }, []);

  useEffect(() => { loadStaff(); loadRequests(); }, [loadStaff, loadRequests]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.classTeacherOf || '').toLowerCase().includes(q) ||
      (s.assignedClasses || []).some((c) => c.toLowerCase().includes(q))
    );
  }, [staff, search]);

  async function saveReassign() {
    if (!reassign) return;
    setSavingReassign(true);
    try {
      const cls = reassignClass.trim();
      await adminApi.updateUser(reassign.id, {
        isClassTeacher: !!cls,
        classTeacherOf: cls || null,
      });
      toast.success(cls ? `${reassign.name} is now class teacher of ${cls}` : `Cleared class-teacher role for ${reassign.name}`);
      setReassign(null);
      loadStaff();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reassign');
    } finally {
      setSavingReassign(false);
    }
  }

  async function approveReq(id: string) {
    setBusyId(id);
    try {
      await staffRequestsApi.approve(id);
      toast.success('Request approved');
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error('A reason is required'); return; }
    setBusyId(rejectTarget.id);
    try {
      await staffRequestsApi.reject(rejectTarget.id, rejectReason.trim());
      toast.success('Request rejected');
      setRequests((prev) => prev.map((r) => (r.id === rejectTarget.id ? { ...r, status: 'rejected', decisionReason: rejectReason.trim() } : r)));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const staffColumns: Column<StaffActivityRow>[] = [
    {
      header: 'Staff',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-maroon/10 text-maroon text-xs font-bold shrink-0">
            {initialsOf(s.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{s.name}</p>
            <p className="text-xs text-text-muted truncate">{s.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Role', accessor: (s) => <Badge tone="neutral">{s.role}</Badge> },
    {
      header: 'Class Teacher',
      accessor: (s) => s.classTeacherOf ? <Badge tone="maroon">{s.classTeacherOf}</Badge> : <span className="text-text-muted">—</span>,
    },
    {
      header: 'Activity',
      accessor: (s) => (
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1" title="Schemes of work"><ScrollText className="h-3.5 w-3.5" />{s.schemesSubmitted}</span>
          <span className="inline-flex items-center gap-1" title="Lesson plans"><NotebookPen className="h-3.5 w-3.5" />{s.lessonPlansSubmitted}</span>
          <span className="inline-flex items-center gap-1" title="Exams created"><ListChecks className="h-3.5 w-3.5" />{s.examsCreated}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (s) => s.isSuspended
        ? <Badge tone="danger" dot>Suspended</Badge>
        : <Badge tone={s.hasSubmittedPlans ? 'success' : 'warning'} dot>{s.status}</Badge>,
    },
    {
      header: '',
      accessor: (s) => (
        <Button
          size="xs" variant="secondary"
          onClick={() => { setReassign(s); setReassignClass(s.classTeacherOf || ''); }}
        >
          Reassign
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const PRIORITY_TONE: Record<string, 'danger' | 'warning' | 'neutral'> = { high: 'danger', normal: 'neutral', low: 'neutral' };
  const STATUS_TONE: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
    approved: 'success', rejected: 'danger', pending: 'warning', cancelled: 'neutral',
  };

  const requestColumns: Column<StaffRequestRow>[] = [
    {
      header: 'Request',
      accessor: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{r.title}</p>
          <p className="text-xs text-text-muted truncate">{r.staffName || r.staffId} · {r.type}</p>
        </div>
      ),
    },
    { header: 'Priority', accessor: (r) => <Badge tone={PRIORITY_TONE[r.priority] || 'neutral'}>{r.priority}</Badge> },
    { header: 'Amount', accessor: (r) => r.amount != null ? money(r.amount) : '—' },
    { header: 'Status', accessor: (r) => <Badge tone={STATUS_TONE[r.status] || 'neutral'} dot>{r.status}</Badge> },
    {
      header: '',
      accessor: (r) => r.status === 'pending' ? (
        <div className="flex justify-end gap-2">
          <Button size="xs" variant="success" loading={busyId === r.id} onClick={() => approveReq(r.id)} icon={<Check className="h-3.5 w-3.5" />}>Approve</Button>
          <Button size="xs" variant="danger" disabled={busyId === r.id} onClick={() => { setRejectTarget(r); setRejectReason(''); }} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
        </div>
      ) : <span className="text-xs text-text-muted">{r.decisionReason || '—'}</span>,
      className: 'text-right',
    },
  ];

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <DashboardShell
      title="Staff Oversight"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('directory')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'directory' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <Users className="h-4 w-4" /> Directory &amp; Activity
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
              tab === 'requests' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <Send className="h-4 w-4" /> Staff Requests
            <Badge tone={pendingCount > 0 ? 'maroon' : 'neutral'}>{pendingCount}</Badge>
          </button>
        </div>

        {tab === 'directory' ? (
          <Card>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 className="font-semibold text-foreground">Teaching Staff</h3>
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search staff or class…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                />
              </div>
            </div>
            <Table
              columns={staffColumns}
              data={filteredStaff}
              keyFor={(s) => s.id}
              loading={loadingStaff}
              emptyMessage="No teaching staff found."
              emptyIcon={<Users className="h-8 w-8" />}
            />
            <p className="text-xs text-text-muted mt-3">
              Activity counts reflect schemes of work, lesson plans and exams authored by each teacher.
            </p>
          </Card>
        ) : (
          <Card>
            <h3 className="font-semibold text-foreground mb-4">Staff Requests</h3>
            <Table
              columns={requestColumns}
              data={requests}
              keyFor={(r) => r.id}
              loading={loadingReq}
              emptyMessage="No staff requests yet."
              emptyIcon={<Send className="h-8 w-8" />}
            />
          </Card>
        )}
      </div>

      {/* Reassign class teacher */}
      <Modal open={!!reassign} onClose={() => setReassign(null)} title="Reassign class teacher" size="md">
        {reassign && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Set which class <span className="font-semibold text-foreground">{reassign.name}</span> is the class teacher of.
              Leave blank to remove the class-teacher role.
            </p>
            <Input
              label="Class"
              placeholder="e.g. JSS 2A"
              value={reassignClass}
              onChange={(e) => setReassignClass(e.target.value)}
              hint="Must match an existing class name exactly."
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReassign(null)}>Cancel</Button>
              <Button loading={savingReassign} onClick={saveReassign}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject staff request */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject request" size="md">
        <div className="space-y-4">
          <Textarea
            label="Reason"
            placeholder="Explain why this request is declined…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} onClick={submitReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
