'use client';

import { useEffect, useState } from 'react';
import {
  Wallet, Plus, Search, Filter, Clock, Receipt, CheckCircle,
  CreditCard, Ban, Calendar, UserPlus, Info
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ACCOUNTANT_NAV } from '@/components/layout/nav-config';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { accountantApi } from '@/lib/api/resources';
import { adminApi } from '@/lib/api/admin';
import type { Payment, User, Bill, SchoolClass } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function AccountantFeesPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New payment form state
  const [newStudentId, setNewStudentId] = useState('');
  const [newBillId, setNewBillId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('bank_transfer');
  const [newReference, setNewReference] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // Load baseline data
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [paymentsData, studentsData, classesData, billsData] = await Promise.all([
          accountantApi.getPayments(),
          accountantApi.getStudents({ role: 'student' }),
          adminApi.getClasses(),
          accountantApi.getBills()
        ]);

        if (!active) return;
        setPayments(paymentsData);
        setStudents(studentsData);
        setClasses(classesData);
        setBills(billsData);
      } catch (err) {
        console.error('Failed to load fee payments data:', err);
        toast.error('Failed to load portal data');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  // Filter bills for the selected student
  const studentPendingBills = bills.filter(
    (b) => b.studentId === newStudentId && b.status === 'pending'
  );

  // Prefill amount when a bill is selected
  useEffect(() => {
    if (!newBillId) {
      setNewAmount('');
      return;
    }
    const bill = studentPendingBills.find((b) => b.id === newBillId);
    if (bill) {
      setNewAmount(bill.amount.toString());
    }
  }, [newBillId]);

  // Handle Record Payment Submit
  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudentId || !newAmount || Number(newAmount) <= 0) {
      toast.error('Please select a student and enter a valid amount');
      return;
    }

    const selectedStudent = students.find((s) => s.id === newStudentId);
    if (!selectedStudent) {
      toast.error('Student not found');
      return;
    }

    setSubmitting(true);
    try {
      await accountantApi.createPayment({
        studentId: newStudentId,
        studentName: selectedStudent.name,
        class: selectedStudent.class || 'N/A',
        amount: Number(newAmount),
        paymentMethod: newMethod,
        reference: newReference || null,
        billId: newBillId || null,
        paidAt: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
      });

      toast.success('Payment recorded successfully');
      setIsModalOpen(false);

      // Reset form
      setNewStudentId('');
      setNewBillId('');
      setNewAmount('');
      setNewReference('');
      setNewMethod('bank_transfer');

      // Refresh list
      setLoading(true);
      const [paymentsData, billsData] = await Promise.all([
        accountantApi.getPayments(),
        accountantApi.getBills()
      ]);
      setPayments(paymentsData);
      setBills(billsData);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  // Filter logic
  const filteredPayments = payments.filter((payment) => {
    const matchSearch = payment.studentName.toLowerCase().includes(search.toLowerCase()) || 
                        (payment.reference && payment.reference.toLowerCase().includes(search.toLowerCase()));
    const matchClass = selectedClass ? payment.class === selectedClass : true;
    const matchMethod = selectedMethod ? payment.paymentMethod === selectedMethod : true;
    return matchSearch && matchClass && matchMethod;
  });

  const columns: Column<Payment>[] = [
    {
      header: 'Student',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.studentName}</p>
          {row.reference && (
            <p className="text-xs text-text-muted mt-0.5 font-mono">Ref: {row.reference}</p>
          )}
        </div>
      )
    },
    {
      header: 'Class',
      accessor: (row) => <span className="font-medium">{row.class}</span>
    },
    {
      header: 'Amount Paid',
      accessor: (row) => <span className="font-bold text-emerald-600">₦{row.amount.toLocaleString()}</span>
    },
    {
      header: 'Method',
      accessor: (row) => (
        <span className="capitalize px-2.5 py-1 rounded-lg bg-card-2 border border-border/50 text-xs font-semibold">
          {(row.paymentMethod || 'cash').replace('_', ' ')}
        </span>
      )
    },
    {
      header: 'Paid Date',
      accessor: (row) => (
        <span className="text-xs text-text-secondary">
          {row.paidAt ? new Date(row.paidAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: () => (
        <Badge tone="success" className="inline-flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Success
        </Badge>
      )
    }
  ];

  return (
    <DashboardShell
      title="Fee Payments"
      navItems={ACCOUNTANT_NAV}
      portalLabel="Finance Portal"
      allowedRoles={['accountant', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Record &amp; Track Fees</h2>
            <p className="text-sm text-text-secondary mt-0.5">Collect school fees and trace payment transactions</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        </div>

        {/* Filter Controls */}
        <Card className="flex flex-col md:flex-row gap-4 p-4 items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search student or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-3 flex-wrap md:flex-nowrap">
            <Select
              options={[
                { value: '', label: 'All Classes' },
                ...classes.map((c) => ({ value: c.displayName, label: c.displayName }))
              ]}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="!py-2.5 text-xs font-semibold focus:!ring-maroon/20 focus:!border-maroon"
            />

            <Select
              options={[
                { value: '', label: 'All Methods' },
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'card', label: 'Card Payment' },
                { value: 'check', label: 'Cheque' }
              ]}
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="!py-2.5 text-xs font-semibold focus:!ring-maroon/20 focus:!border-maroon"
            />
          </div>
        </Card>

        {/* Payments Table */}
        <Card className="p-0 overflow-hidden">
          <Table
            columns={columns}
            data={filteredPayments}
            keyFor={(row) => row.id}
            loading={loading}
            emptyMessage="No fee payments recorded yet."
            emptyIcon={<Wallet className="h-10 w-10 text-text-muted" />}
          />
        </Card>

        {/* Record Payment Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record Fee Payment"
          description="Register a manual payment for a student and update pending invoices."
          size="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <Select
              label="Select Student"
              required
              options={[
                { value: '', label: 'Choose student...' },
                ...students.map((s) => ({ value: s.id, label: `${s.name} (${s.class || 'No Class'})` }))
              ]}
              value={newStudentId}
              onChange={(e) => {
                setNewStudentId(e.target.value);
                setNewBillId('');
              }}
            />

            {newStudentId && (
              <>
                {studentPendingBills.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-start gap-2 text-xs">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">No pending invoices found</p>
                      <p className="mt-0.5">This student has no outstanding invoices for the current term. You can still record a general payment.</p>
                    </div>
                  </div>
                ) : (
                  <Select
                    label="Apply to Pending Invoice (Optional)"
                    options={[
                      { value: '', label: 'General Payment (No specific invoice)' },
                      ...studentPendingBills.map((b) => ({
                        value: b.id,
                        label: `${b.description} - ₦${b.amount.toLocaleString()} (Due: ${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'})`
                      }))
                    ]}
                    value={newBillId}
                    onChange={(e) => setNewBillId(e.target.value)}
                  />
                )}
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount Paid (₦)"
                id="amount"
                type="number"
                placeholder="50000"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />

              <Select
                label="Payment Method"
                required
                options={[
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card Payment' },
                  { value: 'check', label: 'Cheque' }
                ]}
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Transaction Reference / Receipt No."
                id="reference"
                type="text"
                placeholder="TXN123456789"
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
              />

              <Input
                label="Payment Date"
                id="date"
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer"
              >
                {submitting && <Clock className="h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardShell>
  );
}
