import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  ClipboardList,
  FileBarChart,
  ShieldCheck,
  Settings,
  School,
  ScrollText,
  ListChecks,
  NotebookPen,
  Wallet,
  Receipt,
  TrendingUp,
  Award,
  Monitor,
  Bell,
  BarChart3,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Students', href: '/admin/students', icon: GraduationCap },
  { label: 'Teachers', href: '/admin/teachers', icon: School },
  { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  { label: 'Classes', href: '/admin/classes', icon: Layers },
  { label: 'Admissions', href: '/admin/admissions', icon: ClipboardList },
  { label: 'Results', href: '/admin/results', icon: FileBarChart },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Overview', href: '/teacher', icon: LayoutDashboard },
  { label: 'My Class', href: '/teacher/my-class', icon: Users },
  { label: 'Exams', href: '/teacher/exams', icon: ListChecks },
  { label: 'Assignments', href: '/teacher/assignments', icon: ClipboardList },
  { label: 'Submissions', href: '/teacher/submissions', icon: FileBarChart },
  { label: 'Notes', href: '/teacher/notes', icon: NotebookPen },
  { label: 'Lesson Plans', href: '/teacher/lesson-plans', icon: BookOpen },
  { label: 'Schemes of Work', href: '/teacher/schemes', icon: ScrollText },
  { label: 'Results', href: '/teacher/results', icon: FileBarChart },
  { label: 'Settings', href: '/teacher/settings', icon: Settings },
];

export const CLASS_TEACHER_NAV: NavItem[] = [
  { label: 'Overview', href: '/teacher/class-teacher', icon: LayoutDashboard },
  { label: 'My Class', href: '/teacher/my-class', icon: Users },
  { label: 'Exams', href: '/teacher/exams', icon: ListChecks },
  { label: 'Class Term Results', href: '/teacher/class-teacher/results', icon: FileBarChart },
  { label: 'Settings', href: '/teacher/settings', icon: Settings },
];

export const STUDENT_NAV: NavItem[] = [
  { label: 'Overview', href: '/student', icon: LayoutDashboard },
  { label: 'Exams', href: '/student/exams', icon: ListChecks },
  { label: 'Assignments', href: '/student/assignments', icon: ClipboardList },
  { label: 'Notes', href: '/student/notes', icon: NotebookPen },
  { label: 'Results', href: '/student/results', icon: FileBarChart },
  { label: 'Settings', href: '/student/settings', icon: Settings },
];

export const ACCOUNTANT_NAV: NavItem[] = [
  { label: 'Overview', href: '/accountant', icon: LayoutDashboard },
  { label: 'Fee Payments', href: '/accountant/fees', icon: Wallet },
  { label: 'Send Bills', href: '/accountant/billing', icon: Receipt },
  { label: 'Financial Reports', href: '/accountant/reports', icon: TrendingUp },
  { label: 'Settings', href: '/accountant/settings', icon: Settings },
];

export const TECHNICIAN_NAV: NavItem[] = [
  { label: 'Overview', href: '/technician', icon: LayoutDashboard },
  { label: 'Analytics', href: '/technician/analytics', icon: BarChart3 },
  { label: 'Services & Queues', href: '/technician/services', icon: Layers },
  { label: 'Active Sessions', href: '/technician/devices', icon: Monitor },
  { label: 'System Alerts', href: '/technician/alerts', icon: Bell },
  { label: 'System Logs', href: '/technician/logs', icon: ShieldCheck },
  { label: 'Settings', href: '/technician/settings', icon: Settings },
];

export const PARENT_NAV: NavItem[] = [
  { label: 'Overview', href: '/parent', icon: LayoutDashboard },
  { label: 'Results', href: '/parent/results', icon: Award },
  { label: 'School Fees', href: '/parent/fees', icon: Wallet },
  { label: 'Settings', href: '/parent/settings', icon: Settings },
];

export const PRINCIPAL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/principal', icon: LayoutDashboard },
  { label: 'Approvals', href: '/principal/approvals', icon: ListChecks },
  { label: 'Staff Oversight', href: '/principal/staff', icon: Users },
  { label: 'Academic', href: '/principal/academic', icon: Award },
  { label: 'Admissions', href: '/principal/admissions', icon: ClipboardList },
  { label: 'Financial', href: '/principal/financial', icon: Wallet },
  { label: 'Discipline', href: '/principal/discipline', icon: ShieldCheck },
  { label: 'Communication', href: '/principal/communication', icon: Bell },
  { label: 'Reports', href: '/principal/reports', icon: BarChart3 },
  { label: 'Settings', href: '/principal/settings', icon: Settings },
];
