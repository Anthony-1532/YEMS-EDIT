'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Key, Lock, Users, GraduationCap } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PARENT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { api } from '@/lib/api/client';
import { usersApi } from '@/lib/api/resources';
import type { User } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function ParentSettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [child, setChild] = useState<User | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user?.studentId) return;
    
    usersApi.getById(user.studentId)
      .then((data) => {
        setChild(data);
      })
      .catch((err) => {
        console.error('Failed to load child details for settings:', err);
      });
  }, [user]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword: newPassword
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  async function handleProfilePictureUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!profilePictureFile) return;

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('file', profilePictureFile);

      // Using raw request instead of api.post to support FormData
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
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <DashboardShell
      title="My Settings"
      navItems={PARENT_NAV}
      portalLabel="Parent Portal"
      allowedRoles={['parent']}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl fade-in">
        
        {/* Parent & Child Profile Card */}
        <div className="space-y-6">
          {/* Parent Info */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3">
              <Users className="h-4 w-4 text-maroon" /> Parent Profile Info
            </h3>
            <div className="grid grid-cols-1 gap-4 text-sm mt-2">
              <div className="p-4 rounded-xl bg-card-2 border border-border">
                <span className="text-xs text-text-muted font-semibold block uppercase tracking-wider mb-1">Parent Name</span>
                <span className="font-semibold text-base">{user?.name}</span>
              </div>
              <div className="p-4 rounded-xl bg-card-2 border border-border">
                <span className="text-xs text-text-muted font-semibold block uppercase tracking-wider mb-1">Email Address</span>
                <span className="font-semibold text-base">{user?.email}</span>
              </div>
            </div>
            
            <form onSubmit={handleProfilePictureUpload} className="pt-4 mt-2 border-t border-border/40 space-y-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Update Profile Picture</h4>
              <div className="flex flex-col gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium mb-1">Select Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-maroon file:text-white hover:file:bg-maroon-dark transition-colors"
                  />
                </div>
                <Button type="submit" disabled={savingProfile || !profilePictureFile} className="w-full sm:w-auto self-start">
                  {savingProfile ? 'Uploading...' : 'Upload Avatar'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Linked Child Profile Info */}
          {child && (
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3">
                <GraduationCap className="h-4 w-4 text-maroon" /> Linked Ward Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-2">
                <div className="p-3.5 rounded-xl bg-card-2 border border-border">
                  <span className="text-[10px] text-text-muted font-semibold block uppercase tracking-wider mb-0.5">Ward Name</span>
                  <span className="font-bold text-sm text-foreground">{child.name}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-card-2 border border-border">
                  <span className="text-[10px] text-text-muted font-semibold block uppercase tracking-wider mb-0.5">Admission Number</span>
                  <span className="font-bold text-sm text-foreground font-mono">{child.admissionNo || 'N/A'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-card-2 border border-border">
                  <span className="text-[10px] text-text-muted font-semibold block uppercase tracking-wider mb-0.5">Class / Stream</span>
                  <span className="font-bold text-sm text-foreground">{child.class || 'N/A'}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-card-2 border border-border">
                  <span className="text-[10px] text-text-muted font-semibold block uppercase tracking-wider mb-0.5">Current Term</span>
                  <span className="font-bold text-sm text-foreground">{child.term || 'N/A'} ({child.session || '2024/2025'})</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Change Password Card */}
        <Card className="p-6 h-fit">
          <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3 mb-4">
            <Key className="h-4 w-4 text-maroon" /> Security &amp; Password Update
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="New Password"
                id="newPassword"
                type="password"
                placeholder="••••••••"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                hint="Must be at least 8 characters long"
              />

              <Input
                label="Confirm New Password"
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
              <Button
                type="submit"
                disabled={saving}
                className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer px-6"
              >
                {saving ? <Lock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Update Password
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </DashboardShell>
  );
}
