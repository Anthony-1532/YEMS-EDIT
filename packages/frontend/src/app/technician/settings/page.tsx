'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { User as UserIcon, Key, ShieldCheck, Settings, Lock, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TECHNICIAN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';
import { technicianApi, type RbacPolicy } from '@/lib/api/technician';

export default function TechnicianSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [savingProfilePic, setSavingProfilePic] = useState(false);
  const [rbacPolicies, setRbacPolicies] = useState<RbacPolicy[]>([]);
  const [rbacLoading, setRbacLoading] = useState(true);

  useEffect(() => {
    technicianApi.getRbacPolicies()
      .then(setRbacPolicies)
      .catch(() => {})
      .finally(() => setRbacLoading(false));
  }, []);

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name, email });
      toast.success('Profile updated successfully');
      // Briefly reload to refresh context
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleProfilePictureUpload(e: FormEvent) {
    e.preventDefault();
    if (!profilePictureFile) return;

    setSavingProfilePic(true);
    try {
      const formData = new FormData();
      formData.append('file', profilePictureFile);

      const token = sessionStorage.getItem('yems_token');
      const res = await fetch('/api/auth/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to upload profile picture');
      
      toast.success('Profile picture updated successfully');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile picture');
    } finally {
      setSavingProfilePic(false);
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
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
      title="Technician Settings"
      navItems={TECHNICIAN_NAV}
      portalLabel="Technician Portal"
      allowedRoles={['technician', 'admin', 'superadmin']}
    >
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
        {/* Left Side: General Profile Card */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Details */}
          <Card>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="h-16 w-16 rounded-2xl object-cover shrink-0 shadow-sm border border-border" />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shrink-0 shadow-sm"
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile} icon={<Save className="h-4 w-4" />}>
                  Save Profile
                </Button>
              </div>
            </form>

            <form onSubmit={handleProfilePictureUpload} className="pt-4 mt-4 border-t border-border/40 space-y-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Update Profile Picture</h4>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium mb-1">Select Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-maroon file:text-white hover:file:bg-maroon-dark transition-colors"
                  />
                </div>
                <Button type="submit" disabled={savingProfilePic || !profilePictureFile} className="w-full sm:w-auto">
                  {savingProfilePic ? 'Uploading...' : 'Upload Avatar'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password Card */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">Security &amp; Password Update</h3>
            </div>
            <form onSubmit={onPasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  hint="Must be at least 8 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-border/40">
                <Button type="submit" loading={savingPw} icon={<Save className="h-4 w-4" />}>
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Side: Metadata / Side Panels */}
        <div className="space-y-6">
          {/* Security Status */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">Console Access &amp; Security</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: 'Console Access',
                  desc: 'Technician authorization level is active',
                  badge: <Badge tone="success" dot>Authorized</Badge>,
                },
                {
                  label: 'Email Verified',
                  desc: user?.emailVerified ? 'Your email address is verified' : 'Verify email address for system alerts',
                  badge: <Badge tone={user?.emailVerified ? 'success' : 'warning'} dot>{user?.emailVerified ? 'Verified' : 'Unverified'}</Badge>,
                },
                {
                  label: 'Assigned Role',
                  desc: 'Permissions tier of your console',
                  badge: <Badge tone="maroon" className="capitalize">{user?.role}</Badge>,
                },
              ].map((item, i, arr) => (
                <div key={item.label} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <div className="shrink-0">{item.badge}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* System info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">YEMS System</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <p className="text-sm text-text-secondary">Environment</p>
                <p className="text-sm font-mono font-medium text-foreground capitalize">
                  {process.env.NODE_ENV || 'development'}
                </p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-text-secondary">Release Version</p>
                <Badge tone="neutral">v2.0.0-tech</Badge>
              </div>
            </div>
          </Card>

          {/* RBAC Policies */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-maroon" />
              <h3 className="font-semibold text-foreground">RBAC Policies</h3>
            </div>
            {rbacLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-8 rounded-lg w-full" />
                ))}
              </div>
            ) : rbacPolicies.length === 0 ? (
              <p className="text-xs text-text-muted">No custom policies defined yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {rbacPolicies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-text-muted font-mono">{p.permissions.length} permission(s)</p>
                    </div>
                    <Badge tone="maroon" className="shrink-0">{p.key}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
