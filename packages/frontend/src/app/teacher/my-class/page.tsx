'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Users, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { teacherApi } from '@/lib/api/resources';
import type { User } from '@/lib/api/types';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

export default function TeacherMyClassPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const myClass = user?.classTeacherOf || '';

  useEffect(() => {
    let active = true;
    async function load() {
      if (!myClass) {
        setLoading(false);
        return;
      }
      try {
        const data = await teacherApi.getMyClass(myClass);
        if (!active) return;
        setStudents(data);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load class');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [myClass]);

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admissionNo || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const boys = students.filter((s) => ['male', 'm'].includes((s.sex || '').toLowerCase())).length;
  const girls = students.length - boys;
  const active = students.filter((s) => !s.isSuspended).length;
  const suspended = students.length - active;

  const columns: Column<User>[] = [
    {
      header: 'Student',
      accessor: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 shrink-0">
            {u.initials || initialsOf(u.name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{u.name}</p>
            <p className="text-xs text-text-secondary">{u.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Admission No.', accessor: (u) => u.admissionNo || '—' },
    {
      header: 'Sex',
      accessor: (u) => u.sex ? (
        <Badge tone={['male', 'm'].includes((u.sex || '').toLowerCase()) ? 'info' : 'maroon'}>
          {u.sex}
        </Badge>
      ) : '—',
    },
    {
      header: 'Status',
      accessor: (u) => (
        <Badge tone={u.isSuspended ? 'danger' : 'success'} dot>
          {u.isSuspended ? 'Suspended' : 'Active'}
        </Badge>
      ),
    },
  ];

  if (!myClass) {
    return (
      <DashboardShell
        title="My Class"
        navItems={TEACHER_NAV}
        portalLabel="Teacher Portal"
        allowedRoles={['teacher']}
      >
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card-2 mb-4">
            <Users className="h-8 w-8 text-text-muted" />
          </div>
          <p className="font-semibold text-foreground">No class assigned</p>
          <p className="mt-1 text-sm text-text-muted">Contact the administrator to set your class assignment.</p>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={`My Class — ${myClass}`}
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
    >
      <div className="space-y-6 fade-in">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Students', value: students.length, icon: Users, color: 'bg-maroon/10 text-maroon' },
            { label: 'Boys', value: boys, icon: UserCheck, color: 'bg-sky-50 text-sky-600' },
            { label: 'Girls', value: girls, icon: UserCheck, color: 'bg-rose-50 text-rose-600' },
            { label: suspended > 0 ? 'Suspended' : 'Active', value: suspended > 0 ? suspended : active, icon: UserX, color: suspended > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="flex items-center gap-3 py-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{loading ? '—' : stat.value}</p>
                  <p className="text-xs text-text-secondary">{stat.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Students in {myClass}</p>
              {!loading && (
                <p className="text-sm text-text-secondary">{filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <Input
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="max-w-xs"
            />
          </div>

          <Table
            columns={columns}
            data={filtered}
            keyFor={(u) => u.id}
            loading={loading}
            emptyMessage="No students found in your class."
            emptyIcon={<Users className="h-10 w-10" />}
          />
        </Card>
      </div>
    </DashboardShell>
  );
}
