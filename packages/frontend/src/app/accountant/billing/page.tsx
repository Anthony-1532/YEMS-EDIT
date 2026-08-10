'use client';

import { useEffect, useState } from 'react';
import {
  Receipt, Plus, Mail, Search, Clock, CheckCircle, AlertTriangle, Calendar,
  CreditCard, Sparkles, Filter, ChevronRight, XCircle, Info
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
import type { Bill, User, SchoolClass } from '@/lib/api/types';
import toast from 'react-hot-toast';

export default function AccountantBillingPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states: Single Bill
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('50000');
  const [description, setDescription] = useState('Tuition Fee - JSS1 First Term');
  const [dueDate, setDueDate] = useState('');

  // Form states: Bulk Bills
  const [bulkClass, setBulkClass] = useState('all'); // 'all' or class displayName
  const [bulkAmount, setBulkAmount] = useState('50000');
  const [bulkDescription, setBulkDescription] = useState('Tuition Fee - JSS1 First Term');
  const [bulkDueDate, setBulkDueDate] = useState('');

  // Load Data
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [billsData, studentsData, classesData] = await Promise.all([
          accountantApi.getBills(),
          accountantApi.getStudents({ role: 'student' }),
          adminApi.getClasses()
        ]);

        if (!active) return;
        setBills(billsData);
        setStudents(studentsData);
        setClasses(classesData);

        // Set default due date to 1 month from now
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        const dateStr = oneMonthLater.toISOString().split('T')[0];
        setDueDate(dateStr);
        setBulkDueDate(dateStr);
      } catch (err) {
        console.error('Failed to load billing data:', err);
        toast.error('Failed to load data');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  // Handle single invoice generation
  async function handleCreateSingleBill(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !amount || Number(amount) <= 0 || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedStudent = students.find((s) => s.id === studentId);
    if (!selectedStudent) {
      toast.error('Student not found');
      return;
    }

    setSubmitting(true);
    try {
      await accountantApi.createBill({
        studentId,
        studentName: selectedStudent.name,
        class: selectedStudent.class || 'N/A',
        amount: Number(amount),
        description,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status: 'pending',
      });

      toast.success('Invoice issued successfully');
      setIsSingleModalOpen(false);
      setStudentId('');
      
      // Refresh
      setLoading(true);
      const billsData = await accountantApi.getBills();
      setBills(billsData);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to issue invoice');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  // Handle bulk invoicing
  async function handleCreateBulkBills(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkAmount || Number(bulkAmount) <= 0 || !bulkDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Determine target students
    const targetStudents = students.filter((s) => {
      if (bulkClass === 'all') return true;
      return s.class === bulkClass;
    });

    if (targetStudents.length === 0) {
      toast.error('No students found matching the selected class filter');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    try {
      toast.loading(`Issuing ${targetStudents.length} bills...`, { id: 'bulk-bill' });

      // Create bills sequentially or in parallel chunks
      await Promise.all(
        targetStudents.map(async (student) => {
          try {
            await accountantApi.createBill({
              studentId: student.id,
              studentName: student.name,
              class: student.class || 'N/A',
              amount: Number(bulkAmount),
              description: bulkDescription,
              dueDate: bulkDueDate ? new Date(bulkDueDate).toISOString() : null,
              status: 'pending',
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to bill student ${student.name}:`, err);
          }
        })
      );

      toast.success(`Successfully issued ${successCount} invoices!`, { id: 'bulk-bill' });
      setIsBulkModalOpen(false);
      
      // Refresh
      setLoading(true);
      const billsData = await accountantApi.getBills();
      setBills(billsData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete bulk billing', { id: 'bulk-bill' });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  // Filtering
  const filteredBills = bills.filter((bill) => {
    const matchSearch = bill.studentName.toLowerCase().includes(search.toLowerCase()) ||
                        bill.description.toLowerCase().includes(search.toLowerCase());
    const matchClass = selectedClass ? bill.class === selectedClass : true;
    const matchStatus = selectedStatus ? bill.status === selectedStatus : true;
    return matchSearch && matchClass && matchStatus;
  });

  const columns: Column<Bill>[] = [
    {
      header: 'Student',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.studentName}</span>
          <p className="text-xs text-text-muted mt-0.5">{row.class}</p>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: (row) => <span className="font-medium text-foreground">{row.description}</span>
    },
    {
      header: 'Amount',
      accessor: (row) => <span className="font-bold text-foreground">₦{row.amount.toLocaleString()}</span>
    },
    {
      header: 'Due Date',
      accessor: (row) => (
        <span className="text-xs text-text-secondary">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => {
        const isOverdue = row.dueDate && new Date(row.dueDate) < new Date();
        if (row.status === 'paid') {
          return (
            <Badge tone="success" className="inline-flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Paid
            </Badge>
          );
        } else if (row.status === 'overdue') {
          return (
            <Badge tone="danger" className="inline-flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Overdue
            </Badge>
          );
        }
        return (
          <Badge tone="warning" className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      }
    }
  ];

  return (
    <DashboardShell
      title="Billing & Invoices"
      navItems={ACCOUNTANT_NAV}
      portalLabel="Finance Portal"
      allowedRoles={['accountant', 'admin', 'superadmin']}
    >
      <div className="space-y-6 fade-in">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Issue &amp; Manage Invoices</h2>
            <p className="text-sm text-text-secondary mt-0.5">Generate student fees invoices and track payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsBulkModalOpen(true)}
              className="border-maroon/20 hover:border-maroon text-maroon font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" /> Bulk Billing
            </Button>
            <Button
              onClick={() => setIsSingleModalOpen(true)}
              className="bg-maroon hover:bg-maroon-dark text-white font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Single Invoice
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <Card className="flex flex-col md:flex-row gap-4 p-4 items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search invoice or student..."
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
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="!py-2.5 text-xs font-semibold focus:!ring-maroon/20 focus:!border-maroon"
            />
          </div>
        </Card>

        {/* Invoices List */}
        <Card className="p-0 overflow-hidden">
          <Table
            columns={columns}
            data={filteredBills}
            keyFor={(row) => row.id}
            loading={loading}
            emptyMessage="No billing invoices generated yet."
            emptyIcon={<Receipt className="h-10 w-10 text-text-muted" />}
          />
        </Card>

        {/* Single Invoice Modal */}
        <Modal
          open={isSingleModalOpen}
          onClose={() => setIsSingleModalOpen(false)}
          title="Issue Student Invoice"
          description="Create a custom billing fee for a specific student."
          size="md"
        >
          <form onSubmit={handleCreateSingleBill} className="space-y-4">
            <Select
              label="Select Student"
              required
              options={[
                { value: '', label: 'Choose student...' },
                ...students.map((s) => ({ value: s.id, label: `${s.name} (${s.class || 'No Class'})` }))
              ]}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />

            <Input
              label="Invoice Description"
              id="desc"
              type="text"
              placeholder="e.g. Tuition Fee - First Term"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount (₦)"
                id="amount"
                type="number"
                placeholder="50000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <Input
                label="Due Date"
                id="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSingleModalOpen(false)}
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
                Issue Invoice
              </Button>
            </div>
          </form>
        </Modal>

        {/* Bulk Invoicing Modal */}
        <Modal
          open={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Issue Invoices"
          description="Generate school fee bills for all students or an entire class in one click."
          size="md"
        >
          <form onSubmit={handleCreateBulkBills} className="space-y-4">
            <Select
              label="Target Group"
              required
              options={[
                { value: 'all', label: 'All Registered Students' },
                ...classes.map((c) => ({ value: c.displayName, label: `Students in ${c.displayName}` }))
              ]}
              value={bulkClass}
              onChange={(e) => setBulkClass(e.target.value)}
            />

            <Input
              label="Invoice Description"
              id="bulkDesc"
              type="text"
              placeholder="e.g. Tuition Fee - JSS1 First Term"
              required
              value={bulkDescription}
              onChange={(e) => setBulkDescription(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Invoice Amount (₦)"
                id="bulkAmount"
                type="number"
                placeholder="50000"
                required
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
              />

              <Input
                label="Due Date"
                id="bulkDueDate"
                type="date"
                required
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-xl bg-violet-50 text-violet-800 border border-violet-100 flex items-start gap-2.5 text-xs">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-violet-600" />
              <div>
                <p className="font-semibold">Important Notification</p>
                <p className="mt-0.5">Bulk invoicing creates individual outstanding invoices for all students in the selected class. Parents will see these outstanding balances instantly upon login.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsBulkModalOpen(false)}
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
                Generate Invoices
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardShell>
  );
}
