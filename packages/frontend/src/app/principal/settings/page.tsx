'use client';

import { useState, type FormEvent } from 'react';
import { User as UserIcon, Key, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { api, ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

export default function PrincipalSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.patch('/auth/profile', { name, email });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { oldPassword: currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update password');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <DashboardShell
      title="Settings"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="mx-auto max-w-2xl space-y-6 fade-in">
        {/* Profile Card */}
        <Card>
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="h-16 w-16 rounded-2xl object-cover shrink-0 shadow-sm border border-border" />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--maroon-light), var(--maroon-dark))' }}
              >
                {user ? (user.initials || initialsOf(user.name)) : '?'}
              </div>
            )}
            <div>
              <p className="font-bold text-foreground text-lg">{user?.name}</p>
              <p className="text-sm text-text-secondary">{user?.email}</p>
              <Badge tone="maroon" className="mt-1">{user?.role}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Profile Information</h3>
          </div>
          <form onSubmit={onProfileSubmit} className="flex flex-col gap-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Save Profile</Button>
            </div>
          </form>
        </Card>

        {/* Password Card */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Change Password</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">
            If this is your first login with the provisioned account, change your password now.
          </p>
          <form onSubmit={onPasswordSubmit} className="flex flex-col gap-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              hint="Min 8 characters, with uppercase, lowercase, number, and special character"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPw}>Update Password</Button>
            </div>
          </form>
        </Card>

        {/* Security Info */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Account Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div>
                <p className="text-sm font-medium text-foreground">Account Status</p>
                <p className="text-xs text-text-muted">Your account is in good standing</p>
              </div>
              <Badge tone="success" dot>Active</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Email Verified</p>
                <p className="text-xs text-text-muted">Verification status</p>
              </div>
              <Badge tone={user?.emailVerified ? 'success' : 'warning'} dot>
                {user?.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
