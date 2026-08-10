'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Search, Eye, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { admissionsApi } from '@/lib/api/resources';
import type { Admission } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function AdminAdmissionsPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailModal, setDetailModal] = useState<Admission | null>(null);
  const [rejectModal, setRejectModal] = useState<Admission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await admissionsApi.getAll();
      setAdmissions(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load admissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return admissions.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (a.name || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [admissions, search, statusFilter]);

  async function onApprove(admission: Admission) {
    setActing(true);
    try {
      await admissionsApi.approve(admission.id);
      toast.success(`Admission for "${admission.name || 'student'}" approved`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to approve');
    } finally {
      setActing(false);
    }
  }

  function openReject(admission: Admission) {
    setRejectModal(admission);
    setRejectReason('');
  }

  async function onReject() {
    if (!rejectModal) return;
    setActing(true);
    try {
      await admissionsApi.reject(rejectModal.id, rejectReason || undefined);
      toast.success('Admission rejected');
      setRejectModal(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reject');
    } finally {
      setActing(false);
    }
  }

  const columns: Column<Admission>[] = [
    {
      header: 'Applicant',
      accessor: (a) => (
        <div>
          <p className="font-medium text-foreground">{a.name || '—'}</p>
          <p className="text-xs text-text-secondary">{a.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (a) => <Badge tone={STATUS_TONE[a.status] || 'neutral'} dot>{a.status}</Badge>,
    },
    {
      header: 'Date',
      accessor: (a) => formatDate((a as Record<string, unknown>).createdAt as string),
    },
    {
      header: 'Actions',
      accessor: (a) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailModal(a)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-maroon transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {a.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(a)}
                disabled={acting}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-emerald-600 transition-colors disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => openReject(a)}
                disabled={acting}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-card-2 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  const pending = admissions.filter((a) => a.status === 'pending').length;
  const approved = admissions.filter((a) => a.status === 'approved').length;
  const rejected = admissions.filter((a) => a.status === 'rejected').length;

  return (
    <DashboardShell
      title="Admissions"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <div className="space-y-6 fade-in">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending Review', value: pending, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Approved', value: approved, tone: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Rejected', value: rejected, tone: 'bg-red-50 text-red-700 border-red-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border px-5 py-4 ${s.tone}`}>
              <p className="text-2xl font-extrabold">{loading ? '—' : s.value}</p>
              <p className="text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="sm:max-w-xs"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={STATUS_OPTIONS}
                placeholder="All statuses"
                className="sm:max-w-[160px]"
              />
            </div>
            {!loading && (
              <span className="text-sm text-text-secondary shrink-0">{filtered.length} admission{filtered.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <Table
            columns={columns}
            data={filtered}
            keyFor={(a) => a.id}
            loading={loading}
            emptyMessage="No admissions found."
            emptyIcon={<ClipboardList className="h-10 w-10" />}
          />
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Admission Details">
        {detailModal && (
          <div className="space-y-3">
            {Object.entries(detailModal).filter(([k]) => !['id', 'status'].includes(k)).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-border pb-2">
                <span className="text-sm font-medium text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-sm text-foreground">{String(value ?? '—')}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Admission" description={`Rejecting admission for ${rejectModal?.name || 'this applicant'}`} size="sm">
        <div className="space-y-4">
          <Textarea
            label="Reason for rejection (optional)"
            placeholder="Provide a reason for rejection…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" loading={acting} onClick={onReject}>Reject Admission</Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
