'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Role } from '@/lib/api/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { type NavItem, CLASS_TEACHER_NAV, TEACHER_NAV } from './nav-config';
import { Loader2 } from 'lucide-react';

interface DashboardShellProps {
  title: string;
  navItems: NavItem[];
  portalLabel: string;
  allowedRoles: Role[];
  children: ReactNode;
}

export function DashboardShell({ title, navItems, portalLabel, allowedRoles, children }: DashboardShellProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalMode, setPortalMode] = useState<string>('subject-teacher');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mode = sessionStorage.getItem('teacher_portal_mode') || 'subject-teacher';
      setPortalMode(mode);
    }
  }, []);

  const isClassTeacherUser = user?.role === 'teacher' && user?.isClassTeacher;

  // Determine final nav items and portal label
  let finalNavItems = navItems;
  let finalPortalLabel = portalLabel;

  if (isClassTeacherUser) {
    if (portalMode === 'class-teacher') {
      finalNavItems = CLASS_TEACHER_NAV;
      finalPortalLabel = 'Class Teacher Portal';
    } else {
      finalNavItems = TEACHER_NAV;
      finalPortalLabel = 'Teacher Portal';
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center"
        style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
            style={{ background: 'linear-gradient(135deg, var(--maroon-light), var(--maroon-dark))' }}>
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
          <p className="text-sm text-text-secondary">Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Sidebar (desktop always visible, mobile via overlay) */}
      <Sidebar
        items={finalNavItems}
        portalLabel={finalPortalLabel}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
