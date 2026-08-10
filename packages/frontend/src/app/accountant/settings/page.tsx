'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Clock, HelpCircle, CheckCircle, Landmark, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ACCOUNTANT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { accountantApi } from '@/lib/api/resources';
import type { AccountantSettings } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function AccountantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [feeAmount, setFeeAmount] = useState('50000');
  const [threshold30, setThreshold30] = useState('15000');
  const [threshold70, setThreshold70] = useState('35000');
  const [schoolEmail, setSchoolEmail] = useState('accounts@yems.local');
  const [emailSubject, setEmailSubject] = useState('School Fee Bill - {student_name}');
  const [accountNumber, setAccountNumber] = useState('1234567890');

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const settings = await accountantApi.getSettings();
        if (!active) return;
        setFeeAmount(settings.feeAmount.toString());
        setThreshold30(settings.threshold30.toString());
        setThreshold70(settings.threshold70.toString());
        setSchoolEmail(settings.schoolEmail);
        setEmailSubject(settings.emailSubject);
        setAccountNumber(settings.accountNumber);
      } catch (err) {
        console.error('Failed to load accountant settings:', err);
        toast.error('Failed to load fee configuration settings');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSettings();
    return () => { active = false; };
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await accountantApi.updateSettings({
        feeAmount: Number(feeAmount),
        threshold30: Number(threshold30),
        threshold70: Number(threshold70),
        schoolEmail,
        emailSubject,
        accountNumber,
      });
      toast.success('Fee configurations saved successfully');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title="Fee Configurations"
      navItems={ACCOUNTANT_NAV}
      portalLabel="Finance Portal"
      allowedRoles={['accountant', 'admin', 'superadmin']}
    >
      <div className="max-w-3xl space-y-6 fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground">Global Finance Settings</h2>
          <p className="text-sm text-text-secondary mt-0.5">Configure standard school fee amounts, payment milestones, and billing rules</p>
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Clock className="h-6 w-6 animate-spin text-maroon" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3">
                <Landmark className="h-4 w-4 text-maroon" /> Fee Structures &amp; Milestones
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Standard Term Fee (₦)"
                  id="feeAmount"
                  type="number"
                  required
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  hint="Base tuition cost per student"
                />

                <Input
                  label="30% Milestone Threshold"
                  id="threshold30"
                  type="number"
                  required
                  value={threshold30}
                  onChange={(e) => setThreshold30(e.target.value)}
                  hint="Minimum deposit to clear exams"
                />

                <Input
                  label="70% Milestone Threshold"
                  id="threshold70"
                  type="number"
                  required
                  value={threshold70}
                  onChange={(e) => setThreshold70(e.target.value)}
                  hint="Required deposit for midterm results"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3">
                <Settings className="h-4 w-4 text-maroon" /> Disbursement Details &amp; Bank Account
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Receiving Bank Account Number"
                  id="accountNumber"
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  hint="Specify bank account for parent transfer receipts"
                />

                <Input
                  label="Accounting Email Address"
                  id="schoolEmail"
                  type="email"
                  required
                  value={schoolEmail}
                  onChange={(e) => setSchoolEmail(e.target.value)}
                  hint="School address displayed on statements"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-sm border-b border-border/40 pb-3">
                <HelpCircle className="h-4 w-4 text-maroon" /> Billing Notification Template
              </h3>

              <Input
                label="Billing Email Subject"
                id="emailSubject"
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                hint="Supports dynamic tags: {student_name}, {amount}"
              />

              <div className="p-4 rounded-xl bg-violet-50 text-violet-800 border border-violet-100 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-violet-600" />
                <div>
                  <p className="font-semibold text-violet-950 font-sans">Payment Enforcement Rules</p>
                  <p className="mt-0.5 leading-relaxed font-sans">Milestone thresholds enforce access gates dynamically for student accounts. If a student account has not cleared 30% of their outstanding bills, they are locked from sitting online exams. A 70% clearance is required to view published midterm result sheets.</p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer px-6"
              >
                {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Configurations
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
