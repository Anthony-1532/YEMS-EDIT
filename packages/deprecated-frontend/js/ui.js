/* =============================================
   UI.JS — Yeshua Educational Platform
   ============================================= */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Safe embed of server values inside JS string literals: onclick="fn('${jsEsc(val)}')"
function jsEsc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

const UI = (() => {

  /* ---- TOAST ---- */
  function toast(msg, type = 'info', ms = 3800) {
    const c = document.getElementById('toast-container');
    const icons = { success: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', error: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', warning: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>️️', info: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>️️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span style="flex:1">${escapeHtml(msg)}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, ms);
  }

  /* ---- THEME ---- */
  function getTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('yep_theme', t);
  }
  function initTheme() { setTheme(localStorage.getItem('yep_theme') || 'light'); }
  function toggleTheme() {
    const n = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(n); return n;
  }

  /* ---- TIME GREETING ---- */
  function greeting(name = '') {
    const h = new Date().getHours();
    const g = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
    if (!name) return `Good ${g}`;
    return `Good ${g}, ${name.split(' ')[0]}`;
  }

  /* ---- SVG ICONS ---- */
  const icons = {
    home: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    exam: `<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
    live: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
    notes: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    assign: `<svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    sun: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    moon: `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    question: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    download: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    chevron_l: `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevron_r: `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    user: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    mail: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    eye: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeoff: `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    key: `<svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    mcq: `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    theory: `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 14 11 16 15 12"/></svg>`,
    radio: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M16 8a5.5 5.5 0 0 1 0 8M8 16a5.5 5.5 0 0 1 0-8"/><path d="M19 5a9.5 9.5 0 0 1 0 14M5 19a9.5 9.5 0 0 1 0-14"/></svg>`,
    book_open: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    calendar_outline: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    news: `<svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    pin: `<svg viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3h-0a3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    pin_off: `<svg viewBox="0 0 24 24"><line x1="2" y1="2" x2="22" y2="22"/><line x1="12" y1="17" x2="12" y2="22"/><path d="M15 10.68V6a3 3 0 0 0-3-3h-0a3 3 0 0 0-3 3v1.5"/><path d="M14.66 14.66L13.88 15.05a2 2 0 0 0-1.11 1.79v.16a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24v-1.76a2 2 0 0 0-1.11-1.79l-1.5-.75"/></svg>`,
    logout: `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    save: `<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    pencil: `<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    check_circle: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    shield: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    book: `<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    building: `<svg viewBox="0 0 24 24"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    heartbeat: `<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    database: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    crown: `<svg viewBox="0 0 24 24"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg>`,
    mail: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    users: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  };

  function icon(name) { return icons[name] || icons.exam; }

  /* ---- PORTAL LAYOUT ---- */
  function buildPortal(activePage, contentHtml) {
    const user = Auth.current();
    const initials = user?.initials || (user?.name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const theme = getTheme();
    const isPinned = localStorage.getItem('yems_sidebar_pinned') === 'true';

    const navItems = user?.role === 'teacher' ? [
      { id: 'teacher-home', icon: 'home', label: 'Dashboard' },
      ...(user?.isClassTeacher ? [{ id: 'teacher-my-class', icon: 'users', label: 'My Class', cls: 'nav-item-class' }] : []),
      { id: 'teacher-assign', icon: 'assign', label: 'Assignments' },
      { id: 'teacher-live', icon: 'live', label: 'Live Lessons' },
      { id: 'teacher-schemes', icon: 'clipboard', label: 'Schemes & Plans' },
      { id: 'teacher-results', icon: 'chart', label: 'Results' },
      { id: 'teacher-settings', icon: 'settings', label: 'Settings' },
    ] : user?.role === 'superadmin' || user?.role === 'platform_admin' ? [
      { id: 'superadmin-home', icon: 'home', label: 'Dashboard' },
      { id: 'superadmin-admins', icon: 'user', label: 'Admin Management' },
      { id: 'superadmin-institutions', icon: 'building', label: 'Institutions' },
      { id: 'superadmin-system-health', icon: 'heartbeat', label: 'System Health' },
      { id: 'superadmin-rbac', icon: 'shield', label: 'RBAC Policies' },
      { id: 'superadmin-audit-logs', icon: 'clipboard', label: 'Audit Logs' },
      { id: 'superadmin-settings', icon: 'settings', label: 'Platform Settings' },
      { id: 'superadmin-backups', icon: 'database', label: 'Data Backups' },
    ] : user?.role === 'account' || user?.role === 'accountant' ? [
      { id: 'accountant-home', icon: 'home', label: 'Dashboard' },
      { id: 'accountant-fees', icon: 'clipboard', label: 'Fee Payments' },
      { id: 'accountant-billing', icon: 'mail', label: 'Send Bills' },
      { id: 'accountant-reports', icon: 'chart', label: 'Reports' },
      { id: 'accountant-settings', icon: 'settings', label: 'Settings' },
    ] : user?.role === 'principal' ? [
      { id: 'principal-home', icon: 'home', label: 'Dashboard' },
      { id: 'principal-teachers', icon: 'user', label: 'Teachers' },
      { id: 'principal-students', icon: 'users', label: 'Students' },
      { id: 'principal-reports', icon: 'clipboard', label: 'Reports' },
      { id: 'principal-settings', icon: 'settings', label: 'Settings' },
    ] : user?.role === 'technician' ? [
      { id: 'technician-home', icon: 'home', label: 'Dashboard' },
      { id: 'technician-system-health', icon: 'heartbeat', label: 'System Health' },
      { id: 'technician-diagnostics', icon: 'search', label: 'Diagnostics' },
      { id: 'technician-logs', icon: 'clipboard', label: 'Audit Logs' },
      { id: 'technician-devices', icon: 'radio', label: 'Devices' },
      { id: 'technician-alerts', icon: 'bell', label: 'Alerts' },
      { id: 'technician-rbac', icon: 'shield', label: 'RBAC Policies' },
      { id: 'technician-settings', icon: 'settings', label: 'Settings' },
    ] : user?.role === 'hod' ? [
      { id: 'hod-home', icon: 'home', label: 'Dashboard' },
      { id: 'hod-subjects', icon: 'book', label: 'Subjects' },
      { id: 'hod-teachers', icon: 'user', label: 'Teachers' },
      { id: 'hod-students', icon: 'users', label: 'Students' },
      { id: 'hod-settings', icon: 'settings', label: 'Settings' },
    ] : user?.role === 'admin' ? [
      { id: 'admin-home', icon: 'home', label: 'Dashboard' },
      { id: 'admin-user-management', icon: 'user', label: 'User Management' },
      { id: 'admin-teachers', icon: 'user', label: 'Teachers' },
      { id: 'admin-students', icon: 'user', label: 'Students' },
      { id: 'admin-subjects', icon: 'book', label: 'Subjects' },
      { id: 'admin-classes', icon: 'building', label: 'Classes' },
      { id: 'admin-results', icon: 'chart', label: 'Results' },
      { id: 'admin-roles-permissions', icon: 'shield', label: 'Roles & Permissions' },
      { id: 'admin-audit-logs', icon: 'clipboard', label: 'Audit Logs' },
      { id: 'admin-settings', icon: 'settings', label: 'System Settings' },
    ] : [
      { id: 'home', icon: 'home', label: 'Dashboard' },
      { id: 'results', icon: 'chart', label: 'Results' },
      {
        id: 'assessments', icon: 'exam', label: 'Assessments', group: ['exams', 'mcq', 'theory', 'tests'], sub: [
          { id: 'tests', label: 'Mid-Term Tests' },
          { id: 'exams', label: 'Examinations' },
        ]
      },
      { id: 'live', icon: 'live', label: 'Live Classes' },
      { id: 'notes', icon: 'notes', label: 'Notes' },
      { id: 'assign', icon: 'assign', label: 'Assignments' },
    ];

    const navHtml = navItems.map(n => {
      if (n.sub) {
        const isActiveGrp = n.group.includes(activePage);
        const subHtml = n.sub.map(s => {
          // If activePage is mcq or theory, mark "exams" as active
          const isActiveSub = (activePage === s.id) || (s.id === 'exams' && ['mcq', 'theory', 'exams'].includes(activePage));
          return `<button class="nav-sub-item ${isActiveSub ? 'active' : ''}" data-page="${s.id}">${s.label}</button>`;
        }).join('');
        return `
          <button class="nav-item ${isActiveGrp ? 'active' : ''}" onclick="this.nextElementSibling.classList.toggle('collapsed')">
            ${icon(n.icon)}
            <span class="nav-label">${n.label}</span>
          </button>
          <div class="nav-sub ${isActiveGrp ? '' : 'collapsed'}">
            ${subHtml}
          </div>
        `;
      }
      const navPage = n.page || n.id;
      const isActive = activePage === n.id || (n.page && activePage === n.page);
      const extraCls = n.cls || '';
      return `
        <button class="nav-item ${isActive ? 'active' : ''} ${extraCls}" data-page="${navPage}">
          ${icon(n.icon)}
          <span class="nav-label">${n.label}</span>
        </button>
      `;
    }).join('');

    document.getElementById('app').innerHTML = `
      <div class="portal ${isPinned ? 'sidebar-pinned' : ''}">
        <aside class="sidebar">
          <div class="sidebar-logo-area">
            <div class="sidebar-logo-circle">N</div>
            <button class="sidebar-pin-btn" id="sidebar-pin-btn" title="Toggle Sidebar Pin">
              ${icon(isPinned ? 'pin_off' : 'pin')}
            </button>
          </div>
          <nav class="sidebar-nav">${navHtml}</nav>
          <div class="sidebar-bottom">
            <button class="sidebar-settings" id="settings-btn">
              ${icon('settings')}
              <span>Settings</span>
            </button>
            <div class="sidebar-user-card" data-page="${user?.role === 'teacher' ? 'teacher-home' : user?.role === 'admin' ? 'admin-home' : user?.role === 'principal' ? 'principal-home' : user?.role === 'hod' ? 'hod-home' : user?.role === 'technician' ? 'technician-home' : 'home'}">
              <div class="sidebar-user-av">${initials}</div>
              <div class="sidebar-user-info">
                <div class="uname">${user?.name?.split(' ')[0] || 'User'}</div>
                <div class="uid">${user?.role === 'teacher' ? (user?.teacherId || '') : (user?.studentId || user?.adminId || user?.id || '')}</div>
              </div>
            </div>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <span class="topbar-left">${user?.role === 'teacher' ? 'TEACHER DASHBOARD' : user?.role === 'admin' ? 'ADMIN DASHBOARD' : user?.role === 'principal' ? 'PRINCIPAL DASHBOARD' : user?.role === 'hod' ? 'HOD DASHBOARD' : user?.role === 'technician' ? 'TECHNICIAN DASHBOARD' : 'STUDENT DASHBOARD'}</span>
            <span class="topbar-center">Yeshua Educational Platform</span>
            <div class="topbar-right">
              <div id="realtime-clock" style="display: flex; flex-direction: column; text-align: right; margin-right: 1.5rem;">
              <span id="rt-time" style="font-size: 1rem; font-weight: 700; color: var(--text-main); line-height: 1.2;"></span>
              <span id="rt-date" style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500;"></span>
              </div>
              <button class="topbar-icon-btn" id="theme-btn" title="Toggle theme">
                ${icon(theme === 'dark' ? 'sun' : 'moon')}
              </button>
              <div style="position:relative;">
                <button class="topbar-icon-btn" id="notif-btn" title="Notifications" onclick="toggleNotifications()">
                  ${icon('bell')}
                </button>
                <span id="notif-badge" style="display:none; position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:#E74C3C; border-radius:50%; border:2px solid var(--bg-card);"></span>
              </div>
              <div class="topbar-user" onclick="Router.go('settings')">
                <div class="topbar-user-info">
                  <div class="name">${user?.name?.split(' ')[0] || 'User'}</div>
                  <div class="id">ID: ${user?.role === 'teacher' ? (user?.teacherId || '') : (user?.studentId || user?.id || '')}</div>
                </div>
                <div class="topbar-avatar">${initials}</div>
              </div>
            </div>
          </header>

          <div id="server-down-banner" class="server-down-banner" style="display:none;">
            <div class="server-down-banner-inner">
              <span class="server-down-pulse"></span>
              <span>Server is down — reconnecting automatically...</span>
            </div>
          </div>
          <div id="page-outlet">${contentHtml}</div>
          <footer class="portal-footer">
            © 2026 Yeshua Educational Management System. All rights reserved.
          </footer>
        </div>
      </div>
    `;

    document.querySelectorAll('.nav-item[data-page], .nav-sub-item[data-page], .sidebar-user-card[data-page]').forEach(el => {
      el.addEventListener('click', () => Router.go(el.dataset.page));
    });

    document.getElementById('theme-btn').addEventListener('click', () => {
      const n = toggleTheme();
      document.getElementById('theme-btn').innerHTML = icon(n === 'dark' ? 'sun' : 'moon');
    });
    document.getElementById('settings-btn').addEventListener('click', () => {
      const userRole = user?.role || '';
      if (userRole === 'teacher') {
        Router.go('teacher-settings');
      } else if (userRole === 'principal') {
        Router.go('principal-settings');
      } else if (userRole === 'hod') {
        Router.go('hod-settings');
      } else if (userRole === 'admin') {
        Router.go('admin-settings');
      } else if (userRole === 'technician') {
        Router.go('technician-settings');
      } else {
        Router.go('settings');
      }
    });
    document.getElementById('sidebar-pin-btn').addEventListener('click', () => {
      const portalEl = document.querySelector('.portal');
      const pinning = !portalEl.classList.contains('sidebar-pinned');
      portalEl.classList.toggle('sidebar-pinned', pinning);
      localStorage.setItem('yems_sidebar_pinned', pinning);
      document.getElementById('sidebar-pin-btn').innerHTML = icon(pinning ? 'pin_off' : 'pin');
    });

    if (window._yemsClockInterval) clearInterval(window._yemsClockInterval);
    const updateClock = () => {
      const timeEl = document.getElementById('rt-time');
      const dateEl = document.getElementById('rt-date');
      if (timeEl && dateEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
      }
    };
    updateClock();
    window._yemsClockInterval = setInterval(updateClock, 1000);

    // Server-down banner event listeners (added once)
    if (!window.__yems_server_banner_wired) {
      window.__yems_server_banner_wired = true;

      const showServerDown = () => {
        const banner = document.getElementById('server-down-banner');
        if (banner) banner.style.display = '';
      };
      const hideServerDown = () => {
        const banner = document.getElementById('server-down-banner');
        if (banner) banner.style.display = 'none';
      };

      window.addEventListener('yems:server-down', showServerDown);
      window.addEventListener('yems:server-up', hideServerDown);

      // Initial state check — banner may need to show if server was down before portal rendered
      if (window.API && typeof API.isServerOnline === 'function' && !API.isServerOnline()) {
        showServerDown();
      }
    }
  }

  return { toast, getTheme, setTheme, initTheme, toggleTheme, greeting, icon, buildPortal };
})();
