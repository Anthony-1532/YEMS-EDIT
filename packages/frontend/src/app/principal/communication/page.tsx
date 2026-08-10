'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Send, Megaphone, MessageSquare, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PRINCIPAL_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { notificationsApi } from '@/lib/api/resources';
import { adminApi } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';
import type { User } from '@/lib/api/types';

type Mode = 'broadcast' | 'direct';

export default function PrincipalCommunicationPage() {
  const [mode, setMode] = useState<Mode>('broadcast');

  // shared fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [sending, setSending] = useState(false);

  // broadcast
  const [targetRole, setTargetRole] = useState('all');

  // direct
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [toUserId, setToUserId] = useState('');

  useEffect(() => {
    adminApi
      .getUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, []);

  const recipientOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
      .slice(0, 100)
      .map((u) => ({ value: u.id, label: `${u.name} — ${u.role}${u.class ? ` (${u.class})` : ''}` }));
  }, [users, search]);

  const reset = () => { setTitle(''); setMessage(''); };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    try {
      const res = await notificationsApi.broadcast({ type, title: title.trim(), message: message.trim(), targetRole });
      toast.success(`Broadcast sent to ${res.count} users`);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId) { toast.error('Select a recipient'); return; }
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    setSending(true);
    try {
      await notificationsApi.direct({ type, title: title.trim(), message: message.trim(), toUserId });
      const who = users.find((u) => u.id === toUserId);
      toast.success(`Message sent to ${who?.name || 'recipient'}`);
      reset();
      setToUserId('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell
      title="Communication"
      navItems={PRINCIPAL_NAV}
      portalLabel="Principal Portal"
      allowedRoles={['principal', 'admin', 'superadmin']}
    >
      <div className="max-w-2xl mx-auto space-y-6 fade-in">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('broadcast')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              mode === 'broadcast' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <Megaphone className="h-4 w-4" /> Broadcast
          </button>
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              mode === 'direct' ? 'border-maroon bg-maroon/5 text-maroon' : 'border-border text-text-secondary hover:bg-card-2'
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Direct Message
          </button>
        </div>

        {mode === 'broadcast' ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
              <Bell className="h-4 w-4 text-maroon" />
              <h2 className="font-semibold text-foreground text-sm">Broadcast to a group</h2>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Message Type" value={type} onChange={(e) => setType(e.target.value)}
                  options={[
                    { value: 'system', label: 'System Notice (Important)' },
                    { value: 'note', label: 'Note (General Info)' },
                  ]}
                />
                <Select
                  label="Target Audience" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                  options={[
                    { value: 'all', label: 'Everyone (All Users)' },
                    { value: 'teacher', label: 'Teachers' },
                    { value: 'hod', label: 'Heads of Department' },
                    { value: 'accountant', label: 'Accountants' },
                    { value: 'student', label: 'Students' },
                    { value: 'parent', label: 'Parents' },
                    { value: 'technician', label: 'Technicians' },
                  ]}
                />
              </div>
              <Input label="Title" placeholder="e.g. Staff meeting Friday 3pm" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea label="Message" placeholder="Write your announcement…" value={message} onChange={(e) => setMessage(e.target.value)} required />
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>Send Broadcast</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
              <UsersIcon className="h-4 w-4 text-maroon" />
              <h2 className="font-semibold text-foreground text-sm">Message one person</h2>
            </div>
            <form onSubmit={handleDirect} className="space-y-4">
              <Input label="Find recipient" placeholder="Search by name, email or role…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select
                label="Recipient"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                placeholder={loadingUsers ? 'Loading users…' : 'Select a recipient'}
                options={recipientOptions}
                required
              />
              <Select
                label="Message Type" value={type} onChange={(e) => setType(e.target.value)}
                options={[
                  { value: 'system', label: 'System Notice (Important)' },
                  { value: 'note', label: 'Note (General Info)' },
                ]}
              />
              <Input label="Title" placeholder="e.g. Regarding your leave request" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea label="Message" placeholder="Write your message…" value={message} onChange={(e) => setMessage(e.target.value)} required />
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={sending} icon={<Send className="h-4 w-4" />}>Send Message</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
