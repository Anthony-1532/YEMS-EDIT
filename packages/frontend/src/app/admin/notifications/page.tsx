'use client';

import { useState } from 'react';
import { Bell, Send, Megaphone, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { notificationsApi } from '@/lib/api/resources';
import { ApiError } from '@/lib/api/client';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [targetRole, setTargetRole] = useState('all');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      const res = await notificationsApi.broadcast({
        type,
        title: title.trim(),
        message: message.trim(),
        targetRole,
      });
      toast.success(`Announced successfully to ${res.count} users!`);
      setTitle('');
      setMessage('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell
      title="Notifications Hub"
      navItems={ADMIN_NAV}
      portalLabel="Admin Portal"
      allowedRoles={['admin', 'superadmin', 'principal']}
    >
      <div className="max-w-2xl mx-auto space-y-6 fade-in">
        {/* Banner */}
        <Card className="flex items-start gap-4 border border-maroon/20 bg-maroon/5 relative overflow-hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon/10 shrink-0 text-maroon">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">System Announcements</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Use this hub to send real-time system notices, event announcements, or exam instructions.
              Recipients will see these instantly as in-app notifications and popup toasts.
            </p>
          </div>
        </Card>

        {/* Form Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Bell className="h-4 w-4 text-maroon" />
            <h2 className="font-semibold text-foreground text-sm">Send Broadcast Message</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Message Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { value: 'system', label: 'System Notice (Important)' },
                  { value: 'note', label: 'Note (General Info)' },
                ]}
              />

              <Select
                label="Target Audience"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                options={[
                  { value: 'all', label: 'Everyone (All Users)' },
                  { value: 'student', label: 'Students Only' },
                  { value: 'teacher', label: 'Teachers Only' },
                  { value: 'parent', label: 'Parents Only' },
                  { value: 'technician', label: 'Technicians Only' },
                ]}
              />
            </div>

            <Input
              label="Notification Title"
              placeholder="e.g. Scheduled Maintenance, Midterm Exam Details..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary">Message Content</label>
              <textarea
                rows={4}
                placeholder="Type your announcement content here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card-2 p-3 text-sm placeholder:text-text-muted focus:border-maroon focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                loading={sending}
                icon={<Send className="h-4 w-4" />}
                className="cursor-pointer"
              >
                Send Broadcast
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
