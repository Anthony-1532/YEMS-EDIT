'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Menu, Search, X, Sun, Moon, Info, Calendar, CheckCheck, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { initialsOf, formatDate } from '@/lib/utils';
import { notificationsApi } from '@/lib/api/resources';
import type { Notification } from '@/lib/api/resources';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // --- Notification state ---
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const darkTheme = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (darkTheme) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Notification polling – fires toasts for new (unseen) notifications
  // ---------------------------------------------------------------------------
  const pollNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const allNotifs = await notificationsApi.getAll();
      const unread = allNotifs.filter((n: Notification) => !n.read);
      setUnreadCount(unread.length);

      // Toast for every notification that wasn't in our seen-set yet
      for (const n of unread) {
        if (!seenIdsRef.current.has(n.id)) {
          seenIdsRef.current.add(n.id);
          toast(n.title + '\n' + n.message, {
            icon: n.type === 'system' ? '🔔' : n.type === 'exam' ? '📝' : '📬',
            duration: 6000,
            style: {
              maxWidth: 380,
              fontSize: '0.825rem',
            },
          });
        }
      }
      
      // Update local state if modal is currently open
      if (modalOpen) {
        setNotifications(allNotifs);
      }
    } catch {
      // Silently fail – don't break the layout
    }
  }, [user, modalOpen]);

  useEffect(() => {
    if (!user) return;

    // On first mount: seed the seen-set with currently-unread IDs so we
    // only toast genuinely *new* notifications that arrive after page load.
    let mounted = true;
    notificationsApi.getAll().then((allNotifs: Notification[]) => {
      if (!mounted) return;
      allNotifs.filter((n: Notification) => !n.read).forEach((n: Notification) => seenIdsRef.current.add(n.id));
      setUnreadCount(allNotifs.filter((n: Notification) => !n.read).length);
    }).catch(() => {});

    // Poll every 30 seconds
    const interval = setInterval(pollNotifications, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user, pollNotifications]);

  // Load notifications and open modal
  const handleBellClick = async () => {
    setModalOpen(true);
    setModalLoading(true);
    try {
      const allNotifs = await notificationsApi.getAll();
      setNotifications(allNotifs);
      setUnreadCount(allNotifs.filter((n) => !n.read).length);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setModalLoading(false);
    }
  };

  // Mark all as read inside the modal
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  // Mark single notification as read
  const handleMarkOneRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Ignore
    }
  };

  return (
    <header
      className="flex items-center justify-between gap-2 sm:gap-4 border-b border-border px-3 sm:px-4 md:px-6 py-3"
      style={{
        background: 'var(--card)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-card-2 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {searchOpen ? (
          <div className="flex items-center gap-2 fade-in">
            <input
              autoFocus
              placeholder="Search anything…"
              className="h-9 w-full max-w-[180px] sm:max-w-xs rounded-lg border border-border bg-card-2 px-3 text-sm placeholder:text-text-muted focus:border-maroon focus:outline-none"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="text-text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          </div>
        )}
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {!searchOpen && (
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-card-2 transition-colors"
            aria-label="Search"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-card-2 transition-colors cursor-pointer"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500 fill-amber-500/20" /> : <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
        </button>

        {/* Notification Bell – live unread count + click to open modal */}
        <button
          onClick={handleBellClick}
          className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-card-2 transition-colors cursor-pointer"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
        >
          <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          {/* Live unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-maroon text-[9px] font-bold text-white ring-2 ring-card animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {user && user.role === 'teacher' && user.isClassTeacher && (
          <button
            onClick={() => {
              const currentMode = sessionStorage.getItem('teacher_portal_mode') || 'subject-teacher';
              const newMode = currentMode === 'class-teacher' ? 'subject-teacher' : 'class-teacher';
              sessionStorage.setItem('teacher_portal_mode', newMode);
              window.location.href = newMode === 'class-teacher' ? '/teacher/class-teacher' : '/teacher';
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-maroon/10 text-maroon border border-maroon/20 hover:bg-maroon/15 transition-all cursor-pointer mr-2 shadow-sm"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Switch to </span>
            {sessionStorage.getItem('teacher_portal_mode') === 'class-teacher' ? 'Subject Teacher' : 'Class Teacher'}
          </button>
        )}

        {user && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 sm:pl-2 sm:border-l sm:border-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold leading-tight">{user.name.split(' ')[0]}</p>
              <p className="text-[11px] capitalize text-text-secondary">{user.role}</p>
            </div>
            <div
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white shrink-0 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, var(--maroon-light), var(--maroon-dark))',
              }}
            >
              {user.initials || initialsOf(user.name)}
            </div>
          </div>
        )}
      </div>

      {/* Notifications Inbox Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Notifications Inbox"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-semibold text-text-secondary">
              {unreadCount} Unread message{unreadCount !== 1 && 's'}
            </span>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="secondary"
                onClick={handleMarkAllRead}
                icon={<CheckCheck className="h-3.5 w-3.5" />}
              >
                Mark all as read
              </Button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-maroon border-t-transparent" />
                <span className="text-xs text-text-muted">Loading your notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card-2 border border-border">
                  <Bell className="h-5 w-5 text-text-muted" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">All caught up!</p>
                  <p className="text-xs text-text-muted">You have no new notifications.</p>
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkOneRead(n.id)}
                  className={`flex gap-3 p-3 rounded-xl border transition-all text-left ${
                    n.read
                      ? 'border-border/50 bg-card-2/30 opacity-75'
                      : 'border-maroon/20 bg-maroon/5 hover:bg-maroon/10 cursor-pointer'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                    n.type === 'system'
                      ? 'bg-red-500/10 text-red-600'
                      : n.type === 'exam'
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {n.type === 'system' ? <Info className="h-4.5 w-4.5" /> : <Calendar className="h-4.5 w-4.5" />}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-maroon shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed break-words">{n.message}</p>
                    <span className="text-[10px] text-text-muted block mt-1">
                      {n.createdAt ? formatDate(n.createdAt) : 'Just now'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Close Inbox</Button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
