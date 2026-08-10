'use client';

import { useState, type FormEvent } from 'react';
import { User as UserIcon, Key, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { TEACHER_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth/AuthContext';
import { api, ApiError } from '@/lib/api/client';
import { initialsOf } from '@/lib/utils';

export default function TeacherSettingsPage() {
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

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [savingProfilePic, setSavingProfilePic] = useState(false);

  async function handleProfilePictureUpload(e: React.FormEvent) {
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
      window.location.reload();
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
      navItems={TEACHER_NAV}
      portalLabel="Teacher Portal"
      allowedRoles={['teacher']}
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
            {user?.classTeacherOf && (
              <div className="rounded-xl bg-card-2 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Class Teacher Of</p>
                  <p className="text-xs text-text-muted">Contact admin to change class assignment</p>
                </div>
                <Badge tone="maroon">{user.classTeacherOf}</Badge>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Save Profile</Button>
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

        {/* Password Card */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Change Password</h3>
          </div>
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

        {/* Notifications placeholder */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-maroon" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
          <p className="text-sm text-text-muted">Notification preferences are managed by the system administrator.</p>
        </Card>
      </div>
    </DashboardShell>
  );
}
