'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import type { NavItem } from './nav-config';
import { initialsOf } from '@/lib/utils';

interface SidebarProps {
  items: NavItem[];
  portalLabel: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ items, portalLabel, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // The active item is the one whose href is the longest match for the current
  // path. Matching on a trailing-slash boundary keeps a root link (e.g. `/principal`)
  // from also matching its sub-pages, so exactly one item highlights at a time.
  const activeHref = items.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + '/');
    if (!matches) return best;
    return best === null || item.href.length > best.length ? item.href : best;
  }, null);

  const sidebarContent = (
    <aside className="flex h-full w-[260px] shrink-0 flex-col"
      style={{
        background: 'linear-gradient(160deg, #6b1733 0%, #7b1d3c 50%, #8a2248 100%)',
      }}>

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-inner backdrop-blur-sm overflow-hidden">
          <img src="/logo.png" alt="YEMS Logo" className="h-full w-full object-contain p-1" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Yeshua Educational</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">{portalLabel}</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {items.map((item, i) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              style={{ animationDelay: `${i * 30}ms` }}
              className={cn(
                'slide-in flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                active
                  ? 'bg-white text-maroon shadow-sm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-150', !active && 'group-hover:scale-110')} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-maroon/50" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {user && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-2 bg-white/5">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/20" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white shrink-0">
                {user.initials || initialsOf(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] capitalize text-white/50">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden modal-backdrop" onClick={onClose}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <div className="relative h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
