'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, School, BookOpen, Layers, ClipboardList,
  ArrowRight, ShieldCheck, Plus, UserPlus,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi } from '@/lib/api/admin';
import { admissionsApi } from '@/lib/api/resources';
import type { AuditLog, User } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

interface Stats {
  total: number;
  students: number;
  teachers: number;
  subjects: number;
  classes: number;
  pendingAdmissions: number;
}

const ACTION_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  APPROVE: 'success',
  REJECT: 'danger',
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [backendStats, admissions, logs] = await Promise.all([
          adminApi.getStats(),
          admissionsApi.getPending().catch(() => []),
          adminApi.getAuditLogs(8).catch(() => []),
        ]);
        if (!active) return;
        setStats({
          total: backendStats.total,
          students: backendStats.students,
          teachers: backendStats.teachers,
          subjects: backendStats.subjects,
          classes: backendStats.classes,
          pendingAdmissions: admissions.length,
        });
        setRecentLogs(logs);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats?.total, icon: Users, color: 'bg-violet-50 text-violet-600' },
    { label: 'Students', value: stats?.students, icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
    { label: 'Teachers', value: stats?.teachers, icon: School, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Subjects', value: stats?.subjects, icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
    { label: 'Classes', value: stats?.classes, icon: Layers, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Pending Admissions', value: stats?.pendingAdmissions, icon: ClipboardList, color: 'bg-maroon/10 text-maroon' },
  ];

  const quickActions = [
    { label: 'Add User', href: '/admin/users', icon: UserPlus, desc: 'Create a new system user' },
    { label: 'Add Subject', href: '/admin/subjects', icon: BookOpen, desc: 'Register a new subject' },
    { label: 'Add Class', href: '/admin/classes', icon: Layers, desc: 'Create a new class group' },
    { label: 'Review Admissions', href: '/admin/admissions', icon: ClipboardList, desc: 'Pending applications' },
  ];

  return (
    <DashboardShell
      title="Admin Overview"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal', 'hod']}
    >
      <div className="space-y-6 fade-in">
        {/* Greeting banner */}
        <div
          className="rounded-2xl px-8 py-8 text-white relative overflow-hidden"
          style={{
            background: 'var(--maroon)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute right-16 -bottom-16 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <p className="text-white/70 text-sm font-semibold tracking-wider uppercase mb-1">Admin Portal</p>
            <h2 className="text-2xl font-bold">Welcome back! Here&apos;s your school overview.</h2>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card, i) => (
            <div key={card.label} style={{ animationDelay: `${i * 60}ms` }} className="fade-in">
              <StatCard
                label={card.label}
                value={card.value}
                icon={card.icon}
                loading={loading}
                color={card.color}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Quick Actions</h3>
                <Plus className="h-4 w-4 text-text-muted" />
              </div>
              <div className="space-y-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 hover:bg-card-2 group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-maroon/10">
                        <Icon className="h-4 w-4 text-maroon" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="text-xs text-text-muted truncate">{action.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
                <Link href="/admin/audit-logs" className="text-xs text-maroon hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-0">
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 gap-4">
                    <div className="skeleton h-4 rounded w-1/2" />
                    <div className="skeleton h-4 rounded w-16" />
                  </div>
                ))}
                {!loading && recentLogs.length === 0 && (
                  <div className="py-8 text-center">
                    <ShieldCheck className="h-8 w-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-muted">No recent activity.</p>
                  </div>
                )}
                {recentLogs.map((log) => {
                  const actionWord = log.action.split('_')[0] || log.action;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-3 py-3 border-b border-border/50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <Badge tone={ACTION_TONE[actionWord] || 'neutral'} dot>
                            {log.action.replace(/_/g, ' ').toLowerCase()}
                          </Badge>
                          <span className="text-xs text-text-secondary truncate min-w-0 flex-1">{log.resource}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 truncate">{log.user}</p>
                      </div>
                      <span className="text-xs text-text-muted shrink-0 whitespace-nowrap">{formatDate(log.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
