'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, Layers, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api/admin';
import type { SchoolClass } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [level, setLevel] = useState('');
  const [stream, setStream] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getClasses();
      setClasses(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setLevel('');
    setStream('');
    setModalOpen(true);
  }

  function openEdit(cls: SchoolClass) {
    setEditing(cls);
    setLevel(cls.level);
    setStream(cls.stream || '');
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // The API only supports create/delete — if editing, delete old + create new
      if (editing) {
        await adminApi.deleteClass(editing.id);
        await adminApi.createClass({ level, stream });
        toast.success('Class updated');
      } else {
        await adminApi.createClass({ level, stream });
        toast.success('Class created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save class');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteClass(deleteTarget.id);
      toast.success('Class deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  // Group classes by level
  const levelGroups = classes.reduce<Record<string, SchoolClass[]>>((acc, cls) => {
    acc[cls.level] = acc[cls.level] || [];
    acc[cls.level].push(cls);
    return acc;
  }, {});

  const getHue = (str: string) => str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <DashboardShell
      title="Classes"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <div className="space-y-8">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Object.entries(levelGroups).map(([level, cls]) => (
            <Card key={level} className="flex items-center gap-4 py-4 px-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold text-indigo-600 shrink-0">
                {level.slice(0, 3)}
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{cls.length}</p>
                <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">{level}</p>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">All Classes</h3>
              <p className="text-sm text-text-secondary">{classes.length} class{classes.length !== 1 ? 'es' : ''} total</p>
            </div>
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Add Class
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-48 rounded-2xl w-full" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Layers className="h-12 w-12 text-text-muted mb-4" />
              <p className="text-lg font-medium text-foreground">No classes created yet</p>
              <Button onClick={openCreate} variant="secondary" className="mt-4">Create your first class</Button>
            </Card>
          ) : (
            <div className="space-y-10">
              {Object.entries(levelGroups).map(([level, classList]) => (
                <div key={level}>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-foreground">{level} Level</h4>
                    <Badge tone="neutral" className="bg-white/50">{classList.length} Streams</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classList.map((c) => (
                      <Card key={c.id} className="p-0 overflow-hidden group border-border/50 hover:border-indigo-200 transition-all">
                        <div 
                          className="h-28 relative flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, hsl(${getHue(c.id)}, 70%, 90%), hsl(${(getHue(c.id) + 40) % 360}, 60%, 85%))`
                          }}
                        >
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, white 10%, transparent 80%)' }} />
                          <div className="h-16 w-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-sm border border-white/40 relative z-10 transition-transform group-hover:scale-105">
                            <span className="text-2xl font-black text-indigo-900/70">{c.stream ? c.stream.charAt(0) : c.level.charAt(0)}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-card">
                          <h5 className="font-bold text-foreground text-base mb-1 truncate" title={c.displayName}>{c.displayName}</h5>
                          <div className="flex items-center justify-between mt-4">
                            <Badge tone="info">{c.level}</Badge>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(c)} className="p-2 rounded-xl text-text-secondary hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-xl text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Class' : 'Add Class'}
        description="Classes are defined by a level (e.g. JSS1) and stream (e.g. A)"
        size="sm"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Level"
            placeholder="e.g. JSS1 or SS3"
            required
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            hint="e.g. JSS1, JSS2, SS1, SS2, SS3"
          />
          <Input
            label="Stream"
            placeholder="e.g. A"
            required
            value={stream}
            onChange={(e) => setStream(e.target.value)}
            hint="e.g. A, B, Gold, Science"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete Class"
        message={`Delete class "${deleteTarget?.displayName}"? Students in this class will lose their class assignment.`}
        confirmLabel="Delete Class"
        danger
        loading={deleting}
      />
    </DashboardShell>
  );
}
