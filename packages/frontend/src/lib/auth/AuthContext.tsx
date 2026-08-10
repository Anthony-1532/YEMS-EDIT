'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { login as loginApi, logout as logoutApi, me as meApi } from '@/lib/api/auth';
import { clearTokens, setTokens } from '@/lib/api/client';
import type { Role, User } from '@/lib/api/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Mail, AlertTriangle } from 'lucide-react';

const SESSION_KEY = 'yems_session';

const ROLE_HOME: Record<string, string> = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
  // No dedicated /superadmin portal exists in this frontend; superadmin uses the admin portal.
  superadmin: '/admin',
  principal: '/principal',
  hod: '/admin',
  accountant: '/accountant',
  technician: '/technician',
  parent: '/parent',
};

export function getRoleHome(role?: string | null) {
  return ROLE_HOME[role || ''] || '/login';
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Ensure assignedSubjects/assignedClasses are arrays (DB stores them as text)
  function normalizeUser(u: User): User {
    return {
      ...u,
      assignedSubjects: Array.isArray(u.assignedSubjects) ? u.assignedSubjects : [],
      assignedClasses: Array.isArray(u.assignedClasses) ? u.assignedClasses : [],
    };
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setUser(normalizeUser(JSON.parse(raw)));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginApi(email, password);
      const normalized = normalizeUser(result.user);
      setTokens(result.accessToken, result.refreshToken);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
      setUser(normalized);
      return { ok: true, user: normalized };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    logoutApi();
    clearTokens();
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  // Background revalidation of session
  useEffect(() => {
    if (!user) return;
    meApi().then((fresh) => {
      if (!fresh) {
        clearTokens();
        sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
        router.push('/login');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: Telemetry was removed. If reintroduced, it should be:
  // - Opt-in only (user consent required)
  // - Scoped to exam sessions only (not global tracking)
  // - Limited to legitimate proctoring needs, not invasive keystroke/mouse logging

  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [reauthEmail, setReauthEmail] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthSubmitting, setReauthSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSessionExpired = () => {
      if (user) {
        setReauthEmail(user.email);
        setShowSessionExpiredModal(true);
      }
    };

    window.addEventListener('yems-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('yems-session-expired', handleSessionExpired);
    };
  }, [user]);

  async function handleReauthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReauthSubmitting(true);
    try {
      const result = await login(reauthEmail, reauthPassword);
      if (result.ok) {
        setShowSessionExpiredModal(false);
        setReauthPassword('');
        window.location.reload();
      } else {
        alert(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      alert('Failed to authenticate');
    } finally {
      setReauthSubmitting(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
      
      {showSessionExpiredModal && (
        <Modal
          open={showSessionExpiredModal}
          onClose={() => {}}
          title="Session Terminated"
          size="sm"
        >
          <form onSubmit={handleReauthSubmit} className="space-y-4 py-2">
            <div className="flex flex-col items-center text-center gap-2 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 animate-bounce">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Your session has been terminated</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                An administrator force logged you out, or your session expired. Please enter your password to log back in.
              </p>
            </div>

            <Input
              label="Email Address"
              type="email"
              disabled
              value={reauthEmail}
              leftIcon={<Mail className="h-4 w-4 text-text-secondary" />}
            />

            <Input
              label="Password"
              type="password"
              required
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4 text-text-secondary" />}
            />

            <Button
              type="submit"
              loading={reauthSubmitting}
              className="w-full bg-maroon hover:bg-maroon-dark text-white font-bold py-2.5 rounded-xl border-none cursor-pointer mt-2"
            >
              Re-authenticate &amp; Resume
            </Button>
          </form>
        </Modal>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isRoleAllowed(role: Role | undefined, allowed: Role[]) {
  if (!role) return false;
  if (allowed.includes(role)) return true;
  // admin-tier roles can access most management areas
  const adminRoles: Role[] = ['admin', 'superadmin', 'principal', 'hod'];
  return allowed.some((r) => adminRoles.includes(r)) && adminRoles.includes(role);
}
