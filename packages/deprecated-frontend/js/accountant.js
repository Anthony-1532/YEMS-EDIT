/* =============================================
   ACCOUNTANT.JS — Yeshua Educational Platform
   Premium Platform - Modernized UI/UX
   ============================================= */

/**
 * AccountantPageBuilder: Shared components for the accountant portal
 */
const AccountantPageBuilder = {
    hero: (title, subtitle, icon, extra = '') => {
        const academic = getAcademicInfo();
        return `
            <div class="hero-banner" style="background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%);">
                <div class="hero-eyebrow">Academic Session ${academic.session} - ${academic.term}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;">
                    <div style="max-width: 600px;">
                        <h1 class="hero-title" style="font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 900;">${title}</h1>
                        <p class="hero-sub" style="font-size: 1.05rem; opacity: 0.9; line-height: 1.5;">${subtitle}</p>
                        ${extra}
                    </div>
                    <div class="hero-icon-large" style="font-size: 4rem; opacity: 0.15; transform: rotate(15deg);">${icon}</div>
                </div>
                <div style="position: absolute; bottom: -50px; left: -50px; width: 250px; height: 250px; background: rgba(255,255,255,0.03); border-radius: 50%;"></div>
                <div style="position: absolute; top: -100px; right: -50px; width: 300px; height: 300px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
            </div>
        `;
    },

    section: (title, icon, content, actions = '') => `
        <div class="premium-card" style="margin-bottom: 2rem;">
            <div style="padding: 1.75rem 2rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <span style="font-size: 1.4rem;">${icon}</span>
                    <h3 style="font-weight: 800; font-size: 1.15rem; color: var(--text);">${title}</h3>
                </div>
                <div class="section-actions">${actions}</div>
            </div>
            <div style="padding: 2rem;">
                ${content}
            </div>
        </div>
    `,

    statCard: (icon, label, value, subtext, gradient = 'from-success to-success-light') => `
        <div class="stat-card-premium" style="background: var(--bg-card); border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, ${gradient}); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">${icon}</div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
                    <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${value}</div>
                    ${subtext ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">${subtext}</div>` : ''}
                </div>
            </div>
        </div>
    `,

    actionCard: (icon, title, desc, onClick, color = '#7B1D3C') => `
        <div class="action-card-premium" onclick="${onClick}" style="background: var(--bg-card); border-radius: 16px; padding: 1.5rem; box-shadow: var(--shadow); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onmouseover="this.style.borderColor='${color}'; this.style.transform='translateY(-4px)'" onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 52px; height: 52px; border-radius: 12px; background: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">${icon}</div>
                <div>
                    <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">${title}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${desc}</div>
                </div>
            </div>
        </div>
    `,

    formGroup: (label, input, hint = '') => `
        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.6rem; display: block;">${label}</label>
            ${input}
            ${hint ? `<p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">${hint}</p>` : ''}
        </div>
    `,

    btn: (text, type = 'primary', onClick = '', icon = '', disabled = false) => {
        const colors = {
            primary: 'background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%); color: white;',
            secondary: 'background: var(--bg-card2); color: var(--text-primary); border: 1px solid var(--border);',
            success: 'background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white;',
            danger: 'background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: white;',
            ghost: 'background: transparent; color: var(--text-primary); border: 1px solid var(--border);'
        };
        return `<button ${onClick ? `onclick="${onClick}"` : ''} type="${type === 'submit' ? 'submit' : 'button'}" class="btn btn-premium" style="${colors[type] || colors.primary} padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem;" ${disabled ? 'disabled' : ''} onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">${icon ? `<i class="fas ${icon}"></i>` : ''}${text}</button>`;
    }
};

/* =============================================
   INIT
   ============================================= */
(function boot() {
    UI.initTheme();

    const user = Auth.current();
    if (!user || !['account', 'accountant', 'admin', 'superadmin'].includes(user.role)) {
        window.location.href = 'index.html#login';
        return;
    }

    Router.register('accountant-home', renderAccountantHome);
    Router.register('accountant-fees', renderAccountantFees);
    Router.register('accountant-billing', renderAccountantBilling);
    Router.register('accountant-reports', renderAccountantReports);
    Router.register('accountant-settings', renderAccountantSettings);

    Router.init();

    if (!window.location.hash) Router.go('accountant-home');
})();

const accountantState = {
    payments: [],
    bills: [],
    settings: {},
    loading: null,
};

async function ensureAccountantData(force = false) {
    if (!window.API?.accountant) return;
    if (!force && accountantState.loading) {
        await accountantState.loading;
        return;
    }
    if (!force && accountantState.payments.length + accountantState.bills.length > 0) return;

    accountantState.loading = Promise.all([
        API.accountant.getPayments(),
        API.accountant.getBills(),
        API.accountant.getSettings()
    ]).then(([paymentsRes, billsRes, settingsRes]) => {
        accountantState.payments = paymentsRes?.data || [];
        accountantState.bills = billsRes?.data || [];
        accountantState.settings = settingsRes?.data || {};
    }).catch((error) => {
        console.warn('[Accountant] Failed to load accountant data:', error?.message || error);
    }).finally(() => {
        accountantState.loading = null;
    });

    await accountantState.loading;
}

/* =============================================
   DASHBOARD
   ============================================= */
async function renderAccountantHome() {
    if (!Auth.guard()) return;
    await ensureAccountantData();
    const user = Auth.current();
    const students = getStudents();
    const payments = getFeePayments();
    
    const totalExpected = students.length * 50000;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const pending = totalExpected - totalPaid;
    const paidCount = payments.filter(p => p.status === 'paid').length;

    const content = `
    <div class="page">
      ${AccountantPageBuilder.hero('Accountant Dashboard', 'Manage school fees, billing, and financial reports.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', `
        <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${AccountantPageBuilder.btn('Record Payment', 'success', 'Router.go("accountant-fees")', 'fas fa-plus')}
          ${AccountantPageBuilder.btn('Send Bills', 'primary', 'Router.go("accountant-billing")', 'fas fa-paper-plane')}
          ${AccountantPageBuilder.btn('View Reports', 'secondary', 'Router.go("accountant-reports")', 'fas fa-chart-line')}
        </div>
      `)}

      <div style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          ${AccountantPageBuilder.statCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', 'Total Collected', '₦' + totalPaid.toLocaleString(), 'This academic session', '#2D9B6F, #4ADE80')}
          ${AccountantPageBuilder.statCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', 'Pending Payments', '₦' + pending.toLocaleString(), 'Outstanding fees', '#F59E0B, #FBBF24')}
          ${AccountantPageBuilder.statCard('‍<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', 'Students Paid', paidCount + '/' + students.length, 'Fully paid students', '#1E90FF, #00CFFF')}
          ${AccountantPageBuilder.statCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', 'Bills Sent', getBills().length, 'This academic term', '#8B5CF6, #A78BFA')}
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 2rem 0 1rem 0;">Quick Actions</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          ${AccountantPageBuilder.actionCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', 'Fee Payments', 'Record and track student payments', 'Router.go("accountant-fees")', '#2D9B6F')}
          ${AccountantPageBuilder.actionCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', 'Send Bills', 'Bulk email billing to parents', 'Router.go("accountant-billing")', '#1E90FF')}
          ${AccountantPageBuilder.actionCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', 'Financial Reports', 'View and export reports', 'Router.go("accountant-reports")', '#F59E0B')}
          ${AccountantPageBuilder.actionCard('<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>️', 'Settings', 'Configure fee structure', 'Router.go("accountant-settings")', '#8B5CF6')}
        </div>

        ${AccountantPageBuilder.section('Recent Payments', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', `
          <div style="overflow-x: auto;">
            <table class="table-premium" style="width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 1rem;">Student</th>
                  <th style="text-align: left; padding: 1rem;">Amount</th>
                  <th style="text-align: left; padding: 1rem;">Date</th>
                  <th style="text-align: left; padding: 1rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${getRecentPaymentsRows()}
              </tbody>
            </table>
          </div>
        `)}
      </div>
    </div>
    `;

    UI.buildPortal('accountant-home', content);
}

function getRecentPaymentsRows() {
    const payments = getFeePayments().slice(0, 5);
    if (payments.length === 0) {
        return '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: var(--text-muted);">No recent payments recorded</td></tr>';
    }
    return payments.map(p => `
        <tr style="border-bottom: 1px solid var(--border-light);">
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem;">${p.studentName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${p.studentName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${p.studentClass || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td style="padding: 1rem; font-weight: 700; color: var(--success);">₦${p.amount.toLocaleString()}</td>
            <td style="padding: 1rem; color: var(--text-secondary);">${new Date(p.date).toLocaleDateString()}</td>
            <td style="padding: 1rem;"><span class="badge-premium" style="background: var(--success-bg); color: var(--success); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">Paid</span></td>
        </tr>
    `).join('');
}

/* =============================================
   FEE PAYMENTS
   ============================================= */
async function renderAccountantFees() {
    if (!Auth.guard()) return;
    await ensureAccountantData();
    const students = getStudents();
    const payments = getFeePayments();
    const classes = ['SS1', 'SS2', 'SS3', 'JSS1', 'JSS2', 'JSS3'];
    
    const studentPayments = students.map(student => {
        const studentPays = payments.filter(p => p.studentId === student.id);
        const totalPaid = studentPays.reduce((sum, p) => sum + p.amount, 0);
        const percentage = Math.min(100, Math.round((totalPaid / 50000) * 100));
        let status = 'Not Paid';
        if (percentage >= 100) status = 'Fully Paid';
        else if (percentage >= 70) status = '70% Paid';
        else if (percentage >= 30) status = '30% Paid';
        
        return { ...student, totalPaid, percentage, status, balance: 50000 - totalPaid };
    });

    const content = `
    <div class="page">
      ${AccountantPageBuilder.hero('Fee Payment Checklist', 'Track student fee payments by class and status.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>')}

      <div style="padding: 2rem;">
        ${AccountantPageBuilder.section('Filters', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            ${AccountantPageBuilder.formGroup('Class', `<select id="filterClass" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);"><option value="all">All Classes</option>${classes.map(c => `<option value="${c}">${c}</option>`).join('')}</select>`)}
            ${AccountantPageBuilder.formGroup('Status', `<select id="filterStatus" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);"><option value="all">All Status</option><option value="not-paid">Not Paid</option><option value="30">30% Paid</option><option value="70">70% Paid</option><option value="full">Fully Paid</option></select>`)}
            ${AccountantPageBuilder.formGroup('Search', `<input type="text" id="searchStudent" class="form-input" placeholder="Student name..." style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);">`)}
          </div>
          <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${AccountantPageBuilder.btn('Apply Filters', 'primary', 'applyFeeFilters()', 'fas fa-filter')}
            ${AccountantPageBuilder.btn('Clear', 'ghost', 'clearFeeFilters()', 'fas fa-times')}
          </div>
        `)}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--danger-bg); border: 2px solid var(--danger);">
            <div style="font-size: 0.75rem; color: var(--danger); font-weight: 700; text-transform: uppercase;">Not Paid</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--danger); margin-top: 0.25rem;">${studentPayments.filter(s => s.percentage === 0).length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--warning-bg); border: 2px solid var(--warning);">
            <div style="font-size: 0.75rem; color: var(--warning); font-weight: 700; text-transform: uppercase;">30% Paid</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--warning); margin-top: 0.25rem;">${studentPayments.filter(s => s.percentage >= 30 && s.percentage < 70).length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: #FEF3C7; border: 2px solid #F59E0B;">
            <div style="font-size: 0.75rem; color: #92400E; font-weight: 700; text-transform: uppercase;">70% Paid</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: #92400E; margin-top: 0.25rem;">${studentPayments.filter(s => s.percentage >= 70 && s.percentage < 100).length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--success-bg); border: 2px solid var(--success);">
            <div style="font-size: 0.75rem; color: var(--success); font-weight: 700; text-transform: uppercase;">Fully Paid</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--success); margin-top: 0.25rem;">${studentPayments.filter(s => s.percentage >= 100).length}</div>
          </div>
        </div>

        ${AccountantPageBuilder.section('All Students', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>‍<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', `
          <div style="overflow-x: auto;">
            <table class="table-premium" style="width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 1rem;">Student</th>
                  <th style="text-align: left; padding: 1rem;">Class</th>
                  <th style="text-align: left; padding: 1rem;">Paid</th>
                  <th style="text-align: left; padding: 1rem;">Balance</th>
                  <th style="text-align: left; padding: 1rem;">Progress</th>
                  <th style="text-align: left; padding: 1rem;">Status</th>
                  <th style="text-align: left; padding: 1rem;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${studentPayments.map(student => `
                  <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${student.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div style="font-weight: 600; color: var(--text-primary);">${student.name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">${student.studentId || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="padding: 1rem;"><span class="badge-premium" style="background: var(--bg-card2); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">${student.class || 'N/A'}</span></td>
                    <td style="padding: 1rem; font-weight: 700; color: var(--success);">₦${student.totalPaid.toLocaleString()}</td>
                    <td style="padding: 1rem; font-weight: 700; color: ${student.balance > 0 ? 'var(--danger)' : 'var(--success)'};">₦${student.balance.toLocaleString()}</td>
                    <td style="padding: 1rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; height: 8px; background: var(--bg-card2); border-radius: 4px; overflow: hidden; min-width: 100px;">
                          <div style="width: ${student.percentage}%; height: 100%; background: ${getProgressColor(student.percentage)}; border-radius: 4px;"></div>
                        </div>
                        <span style="font-size: 0.875rem; font-weight: 700; min-width: 45px;">${student.percentage}%</span>
                      </div>
                    </td>
                    <td style="padding: 1rem;"><span class="badge-premium" style="background: ${getStatusBg(student.status)}; color: ${getStatusColor(student.status)}; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">${student.status}</span></td>
                    <td style="padding: 1rem;">${AccountantPageBuilder.btn('Pay', 'success', 'openRecordPaymentModal("' + student.id + '")', 'fas fa-plus')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `)}
      </div>
    </div>
    `;

    UI.buildPortal('accountant-fees', content);
}

/* =============================================
   BILLING
   ============================================= */
async function renderAccountantBilling() {
    if (!Auth.guard()) return;
    await ensureAccountantData();
    const students = getStudents();
    const bills = getBills();

    const content = `
    <div class="page">
      ${AccountantPageBuilder.hero('Send Bills', 'Send fee bills to parents via email.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', AccountantPageBuilder.btn('Send Bulk Bills', 'primary', 'openBulkBillModal()', 'fas fa-paper-plane'))}

      <div style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Bills</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">${bills.length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--warning); font-weight: 600; text-transform: uppercase;">Pending</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--warning); margin-top: 0.25rem;">${bills.filter(b => b.status === 'pending').length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; text-transform: uppercase;">Paid</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--success); margin-top: 0.25rem;">${bills.filter(b => b.status === 'paid').length}</div>
          </div>
        </div>

        ${AccountantPageBuilder.section('Recent Bills', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', `
          <div style="overflow-x: auto;">
            <table class="table-premium" style="width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 1rem;">Student</th>
                  <th style="text-align: left; padding: 1rem;">Parent Email</th>
                  <th style="text-align: left; padding: 1rem;">Amount</th>
                  <th style="text-align: left; padding: 1rem;">Date</th>
                  <th style="text-align: left; padding: 1rem;">Status</th>
                  <th style="text-align: left; padding: 1rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${bills.slice(0, 20).map(bill => `
                  <tr style="border-bottom: 1px solid var(--border-light);">
                    <td style="padding: 1rem; font-weight: 600;">${bill.studentName}</td>
                    <td style="padding: 1rem; color: var(--text-secondary);">${bill.email}</td>
                    <td style="padding: 1rem; font-weight: 700; color: var(--text-primary);">₦${bill.amount.toLocaleString()}</td>
                    <td style="padding: 1rem; color: var(--text-secondary);">${new Date(bill.date).toLocaleDateString()}</td>
                    <td style="padding: 1rem;"><span class="badge-premium" style="background: ${bill.status === 'paid' ? 'var(--success-bg)' : 'var(--warning-bg)'}; color: ${bill.status === 'paid' ? 'var(--success)' : 'var(--warning)'}; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">${bill.status}</span></td>
                    <td style="padding: 1rem;">
                      <div style="display: flex; gap: 0.5rem;">
                        <button onclick="resendBill('${bill.id}')" class="btn-icon-premium" style="background: var(--blue-bg); color: var(--blue); border: none; padding: 0.5rem; border-radius: 8px; cursor: pointer;" title="Resend"><i class="fas fa-redo"></i></button>
                        <button onclick="downloadBill('${bill.id}')" class="btn-icon-premium" style="background: var(--bg-card2); color: var(--text-primary); border: none; padding: 0.5rem; border-radius: 8px; cursor: pointer;" title="Download"><i class="fas fa-download"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
                ${bills.length === 0 ? '<tr><td colspan="6" style="padding: 3rem; text-align: center; color: var(--text-muted);">No bills sent yet. Click "Send Bulk Bills" to get started.</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        `)}
      </div>
    </div>
    `;

    UI.buildPortal('accountant-billing', content);
}

/* =============================================
   REPORTS
   ============================================= */
async function renderAccountantReports() {
    if (!Auth.guard()) return;
    await ensureAccountantData();
    const payments = getFeePayments();
    const students = getStudents();
    
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const byClass = {};
    students.forEach(s => {
        if (!byClass[s.class]) byClass[s.class] = 0;
        const studentPays = payments.filter(p => p.studentId === s.id);
        byClass[s.class] += studentPays.reduce((sum, p) => sum + p.amount, 0);
    });

    const content = `
    <div class="page">
      ${AccountantPageBuilder.hero('Financial Reports', 'View and export financial reports.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', `
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${AccountantPageBuilder.btn('Export PDF', 'secondary', 'exportReport("pdf")', 'fas fa-file-pdf')}
          ${AccountantPageBuilder.btn('Export Excel', 'success', 'exportReport("excel")', 'fas fa-file-excel')}
        </div>
      `)}

      <div style="padding: 2rem;">
        ${AccountantPageBuilder.section('Collection Summary', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>', `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
            <div style="text-align: center; padding: 2rem; border-radius: 12px; background: var(--success-bg); border: 2px solid var(--success);">
              <div style="font-size: 0.75rem; color: var(--success); font-weight: 700; text-transform: uppercase;">Total Collected</div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--success); margin-top: 0.5rem;">₦${totalCollected.toLocaleString()}</div>
            </div>
            <div style="text-align: center; padding: 2rem; border-radius: 12px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total Students</div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-primary); margin-top: 0.5rem;">${students.length}</div>
            </div>
            <div style="text-align: center; padding: 2rem; border-radius: 12px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Average per Student</div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-primary); margin-top: 0.5rem;">₦${Math.round(totalCollected / (students.length || 1)).toLocaleString()}</div>
            </div>
          </div>
        `)}

        ${AccountantPageBuilder.section('Collection by Class', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"/></svg>', `
          <div style="overflow-x: auto;">
            <table class="table-premium" style="width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 1rem;">Class</th>
                  <th style="text-align: left; padding: 1rem;">Students</th>
                  <th style="text-align: left; padding: 1rem;">Total Collected</th>
                  <th style="text-align: left; padding: 1rem;">Average</th>
                  <th style="text-align: left; padding: 1rem;">Performance</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(byClass).map(([className, amount]) => {
                    const classStudents = students.filter(s => s.class === className).length;
                    const avg = Math.round(amount / (classStudents || 1));
                    const performance = Math.round((amount / ((classStudents || 1) * 50000)) * 100);
                    return `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 1rem; font-weight: 700;">${className}</td>
                      <td style="padding: 1rem;">${classStudents}</td>
                      <td style="padding: 1rem; font-weight: 700; color: var(--success);">₦${amount.toLocaleString()}</td>
                      <td style="padding: 1rem; color: var(--text-secondary);">₦${avg.toLocaleString()}</td>
                      <td style="padding: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <div style="flex: 1; height: 8px; background: var(--bg-card2); border-radius: 4px; overflow: hidden; min-width: 120px;">
                            <div style="width: ${performance}%; height: 100%; background: ${getProgressColor(performance)}; border-radius: 4px;"></div>
                          </div>
                          <span style="font-size: 0.875rem; font-weight: 700; min-width: 45px;">${performance}%</span>
                        </div>
                      </td>
                    </tr>
                    `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `)}
      </div>
    </div>
    `;

    UI.buildPortal('accountant-reports', content);
}

/* =============================================
   SETTINGS
   ============================================= */
async function renderAccountantSettings() {
    if (!Auth.guard()) return;
    await ensureAccountantData();
    const settings = getAccountSettings();

    const content = `
    <div class="page">
      ${AccountantPageBuilder.hero('Account Settings', 'Configure fee structure and payment settings.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>️')}

      <div style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
          ${AccountantPageBuilder.section('Fee Structure', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', `
            <form onsubmit="saveFeeSettings(event)">
              ${AccountantPageBuilder.formGroup('School Fees (per term)', `<input type="number" value="${settings.feeAmount || 50000}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`)}
              ${AccountantPageBuilder.formGroup('30% Threshold (₦)', `<input type="number" value="${settings.threshold30 || 15000}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`)}
              ${AccountantPageBuilder.formGroup('70% Threshold (₦)', `<input type="number" value="${settings.threshold70 || 35000}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`)}
              ${AccountantPageBuilder.btn('Save Fee Structure', 'primary', '', 'fas fa-save', false)}
            </form>
          `)}

          ${AccountantPageBuilder.section('Email Settings', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', `
            <form onsubmit="saveEmailSettings(event)">
              ${AccountantPageBuilder.formGroup('School Email', `<input type="email" value="${settings.schoolEmail || 'accounts@yems.local'}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`)}
              ${AccountantPageBuilder.formGroup('Email Subject Template', `<input type="text" value="${settings.emailSubject || 'School Fee Bill - {student_name}'}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`)}
              ${AccountantPageBuilder.formGroup('Payment Account Number', `<input type="text" value="${settings.accountNumber || '1234567890'}" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>`, 'Bank account for fee payments')}
              ${AccountantPageBuilder.btn('Save Email Settings', 'primary', '', 'fas fa-save', false)}
            </form>
          `)}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('accountant-settings', content);
}

/* =============================================
   HELPER FUNCTIONS
   ============================================= */

function getFeePayments() {
    return accountantState.payments;
}

function getBills() {
    return accountantState.bills;
}

function getAccountSettings() {
    return accountantState.settings || {};
}

function getProgressColor(percentage) {
    if (percentage < 30) return 'var(--danger)';
    if (percentage < 70) return 'var(--warning)';
    return 'var(--success)';
}

function getStatusBg(status) {
    if (status === 'Fully Paid') return 'var(--success-bg)';
    if (status === '70% Paid') return '#FEF3C7';
    if (status === '30% Paid') return 'var(--warning-bg)';
    return 'var(--danger-bg)';
}

function getStatusColor(status) {
    if (status === 'Fully Paid') return 'var(--success)';
    if (status === '70% Paid') return '#92400E';
    if (status === '30% Paid') return 'var(--warning)';
    return 'var(--danger)';
}

// Global functions for modals and actions
window.openBulkBillModal = function() {
    const students = getStudents();
    const classes = ['SS1', 'SS2', 'SS3', 'JSS1', 'JSS2', 'JSS3'];
    const settings = getAccountSettings();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'bulk-bill-modal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid var(--border);">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Send Bulk Bills</h3>
                <button onclick="closeBulkBillModal()" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div style="background: var(--info-light); border: 1px solid var(--info); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                    <p style="font-size: 0.875rem; color: var(--text-primary); margin: 0;"><strong><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Instructions:</strong></p>
                    <ul style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.5rem 0 0 1.25rem; padding: 0;">
                        <li>Select students or filter by class</li>
                        <li>Enter bill amount and due date</li>
                        <li>Customize email message (optional)</li>
                        <li>Click "Send Bills" to email all selected parents</li>
                    </ul>
                </div>

                <form id="bulk-bill-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Filter by Class</label>
                            <select id="bulk-class-filter" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" onchange="filterStudentsForBulk()">
                                <option value="all">All Classes</option>
                                ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Search Students</label>
                            <input type="text" id="bulk-search" class="form-input" placeholder="Student name..." style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" onkeyup="filterStudentsForBulk()">
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-sec);">Select Students</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" onclick="selectAllStudents()" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; background: var(--maroon); color: white; border: none; border-radius: 6px; cursor: pointer;">Select All</button>
                                <button type="button" onclick="deselectAllStudents()" style="font-size: 0.75rem; padding: 0.35rem 0.75rem; background: var(--bg-card2); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">Deselect All</button>
                            </div>
                        </div>
                        <div id="bulk-students-list" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem;">
                            ${students.map(s => `
                                <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-card2)'" onmouseout="this.style.background='transparent'">
                                    <input type="checkbox" class="bulk-student-checkbox" value="${s.id}" data-email="${s.parentEmail || s.email}" data-name="${s.name}" data-class="${s.class}" style="width: 18px; height: 18px; accent-color: var(--maroon);">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem;">${s.name.charAt(0).toUpperCase()}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">${s.name}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.class} • ${s.parentEmail || s.email || 'No email'}</div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                        <div id="selected-count" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">0 students selected</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Bill Amount (₦)</label>
                            <input type="number" id="bulk-amount" class="form-input" value="${settings.feeAmount || 50000}" min="1" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Due Date</label>
                            <input type="date" id="bulk-due-date" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Email Subject</label>
                        <input type="text" id="bulk-email-subject" class="form-input" value="${settings.emailSubject || 'School Fee Bill - {student_name}'}" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);">
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Use {'{student_name}'} as placeholder</p>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Email Message</label>
                        <textarea id="bulk-email-message" class="form-input" rows="5" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); resize: vertical;" placeholder="Dear Parent/Guardian,

This is to inform you that the school fee payment for {student_name} is due.

Amount: ₦{amount}
Due Date: {due_date}

Please make payment to the school account:
Account Number: {account_number}

Thank you for your continued support.

Best regards,
School Administration"></textarea>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Placeholders: {'{student_name}'}, {'{amount}'}, {'{due_date}'}, {'{account_number}'}</p>
                    </div>
                </form>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.5rem 2rem; border-top: 1px solid var(--border);">
                <button onclick="closeBulkBillModal()" style="padding: 0.75rem 1.5rem; border-radius: 12px; background: var(--bg-card2); color: var(--text-primary); border: 1px solid var(--border); font-weight: 700; cursor: pointer;">Cancel</button>
                <button onclick="sendBulkBills()" style="padding: 0.75rem 2rem; border-radius: 12px; background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%); color: white; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-paper-plane"></i> Send Bills (<span id="send-count">0</span>)</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    updateSendCount();
    
    // Add checkbox listeners
    document.querySelectorAll('.bulk-student-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSendCount);
    });
};

function closeBulkBillModal() {
    const modal = document.getElementById('bulk-bill-modal');
    if (modal) {
        modal.remove();
    }
}

function filterStudentsForBulk() {
    const classFilter = document.getElementById('bulk-class-filter').value;
    const searchTerm = document.getElementById('bulk-search').value.toLowerCase();
    const checkboxes = document.querySelectorAll('.bulk-student-checkbox');
    
    checkboxes.forEach(cb => {
        const studentClass = cb.dataset.class;
        const studentName = cb.dataset.name.toLowerCase();
        const showClass = classFilter === 'all' || studentClass === classFilter;
        const showSearch = !searchTerm || studentName.includes(searchTerm);
        cb.closest('label').style.display = (showClass && showSearch) ? 'flex' : 'none';
    });
}

function selectAllStudents() {
    document.querySelectorAll('.bulk-student-checkbox').forEach(cb => {
        if (cb.closest('label').style.display !== 'none') {
            cb.checked = true;
        }
    });
    updateSendCount();
}

function deselectAllStudents() {
    document.querySelectorAll('.bulk-student-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateSendCount();
}

function updateSendCount() {
    const count = document.querySelectorAll('.bulk-student-checkbox:checked').length;
    const countSpans = document.querySelectorAll('#selected-count, #send-count');
    countSpans.forEach(span => {
        if (span.id === 'selected-count') {
            span.textContent = count + ' student' + (count !== 1 ? 's' : '') + ' selected';
        } else {
            span.textContent = count;
        }
    });
}

window.sendBulkBills = async function() {
    const selectedCheckboxes = document.querySelectorAll('.bulk-student-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        UI.toast('Please select at least one student', 'error');
        return;
    }
    
    const amount = document.getElementById('bulk-amount').value;
    const dueDate = document.getElementById('bulk-due-date').value;
    const emailSubject = document.getElementById('bulk-email-subject').value;
    const emailMessage = document.getElementById('bulk-email-message').value;
    const settings = getAccountSettings();
    
    if (!amount || !dueDate) {
        UI.toast('Please fill in amount and due date', 'error');
        return;
    }
    
    const bills = getBills().slice();
    const apiBills = [];
    let sentCount = 0;
    let failedCount = 0;
    
    selectedCheckboxes.forEach(cb => {
        const studentId = cb.value;
        const studentEmail = cb.dataset.email;
        const studentName = cb.dataset.name;
        const studentClass = cb.dataset.class;
        
        if (!studentEmail || studentEmail === 'No email') {
            failedCount++;
            return;
        }
        
        // Replace placeholders in subject and message
        const subject = emailSubject.replace('{student_name}', studentName);
        const message = emailMessage
            .replace('{student_name}', studentName)
            .replace('{amount}', amount)
            .replace('{due_date}', new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))
            .replace('{account_number}', settings.accountNumber || '1234567890');
        
        // Create bill record
        const bill = {
            id: 'bill' + Date.now() + Math.random().toString(36).substr(2, 9),
            studentId: studentId,
            studentName: studentName,
            studentClass: studentClass,
            email: studentEmail,
            amount: parseInt(amount),
            subject: subject,
            message: message,
            dueDate: dueDate,
            status: 'pending',
            date: new Date().toISOString(),
            sentAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        
        bills.push(bill);
        apiBills.push(bill);
        sentCount++;
    });

    if (apiBills.length > 0) {
        await Promise.all(apiBills.map((bill) => API.accountant.createBill({
            studentId: bill.studentId,
            studentName: bill.studentName,
            studentClass: bill.studentClass,
            amount: bill.amount,
            dueDate: bill.dueDate,
            status: bill.status,
            description: bill.subject || bill.message || 'School fee bill'
        })));
    }

    accountantState.bills = bills;
    
    // Close modal
    closeBulkBillModal();
    
    // Show success message
    setTimeout(() => {
        let message = `Successfully sent ${sentCount} bill${sentCount !== 1 ? 's' : ''}!`;
        if (failedCount > 0) {
            message += ` ${failedCount} failed (no email).`;
        }
        UI.toast(message, sentCount > 0 ? 'success' : 'error');
        
        // Refresh the billing page
        if (window.location.hash === '#accountant-billing') {
            renderAccountantBilling();
        }
    }, 500);
};

window.openRecordPaymentModal = function(studentId) {
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    const settings = getAccountSettings();
    
    if (!student) {
        UI.toast('Student not found', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'record-payment-modal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid var(--border);">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Record Payment</h3>
                <button onclick="closeRecordPaymentModal()" style="background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div style="background: var(--info-light); border: 1px solid var(--info); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${student.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight: 700; color: var(--text-primary);">${student.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${student.class} • ${student.studentId || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                <form id="record-payment-form">
                    <input type="hidden" id="payment-student-id" value="${student.id}">
                    <input type="hidden" id="payment-student-name" value="${student.name}">
                    <input type="hidden" id="payment-student-class" value="${student.class}">
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Payment Amount (₦)</label>
                        <input type="number" id="payment-amount" class="form-input" placeholder="Enter amount" min="1" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); font-size: 1.125rem; font-weight: 700;" required>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Full fee: ₦${settings.feeAmount || 50000}</p>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Payment Date</label>
                        <input type="date" id="payment-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);" required>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Payment Method</label>
                        <select id="payment-method" class="form-input" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);">
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                            <option value="online">Online Payment</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.5rem;">Reference/Note (Optional)</label>
                        <input type="text" id="payment-reference" class="form-input" placeholder="Transaction ID, receipt number, etc." style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);">
                    </div>
                </form>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.5rem 2rem; border-top: 1px solid var(--border);">
                <button onclick="closeRecordPaymentModal()" style="padding: 0.75rem 1.5rem; border-radius: 12px; background: var(--bg-card2); color: var(--text-primary); border: 1px solid var(--border); font-weight: 700; cursor: pointer;">Cancel</button>
                <button onclick="submitPayment()" style="padding: 0.75rem 2rem; border-radius: 12px; background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-check-circle"></i> Record Payment</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
};

function closeRecordPaymentModal() {
    const modal = document.getElementById('record-payment-modal');
    if (modal) {
        modal.remove();
    }
}

window.submitPayment = async function() {
    const studentId = document.getElementById('payment-student-id').value;
    const studentName = document.getElementById('payment-student-name').value;
    const studentClass = document.getElementById('payment-student-class').value;
    const amount = parseInt(document.getElementById('payment-amount').value);
    const date = document.getElementById('payment-date').value;
    const method = document.getElementById('payment-method').value;
    const reference = document.getElementById('payment-reference').value;
    
    if (!amount || amount < 1) {
        UI.toast('Please enter a valid amount', 'error');
        return;
    }
    
    const payment = {
        studentId: studentId,
        studentName: studentName,
        studentClass: studentClass,
        amount: amount,
        date: date,
        method: method,
        reference: reference,
        status: 'paid',
        recordedAt: new Date().toISOString(),
        recordedBy: Auth.current()?.name || 'Accountant'
    };

    const result = await API.accountant.createPayment({
        studentId: payment.studentId,
        studentName: payment.studentName,
        studentClass: payment.studentClass,
        amount: payment.amount,
        date: payment.date,
        method: payment.method,
        reference: payment.reference,
        status: payment.status
    });

    accountantState.payments = [result?.data || payment, ...getFeePayments()];
    
    closeRecordPaymentModal();
    UI.toast('Payment recorded successfully! <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', 'success');
    
    // Refresh fees page if active
    if (window.location.hash === '#accountant-fees') {
        renderAccountantFees();
    }
};

window.resendBill = async function(id) {
    const bills = getBills();
    const bill = bills.find(b => b.id === id);
    
    if (!bill) {
        UI.toast('Bill not found', 'error');
        return;
    }
    
    if (confirm(`Resend bill to ${bill.studentName}'s parent at ${bill.email}?`)) {
        bill.resentAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        await API.accountant.updateBill(id, { description: bill.subject || bill.message || 'Resent bill' });
        accountantState.bills = bills;
        UI.toast('Bill resent successfully!', 'success');
        renderAccountantBilling();
    }
};

window.downloadBill = function(id) {
    const bills = getBills();
    const bill = bills.find(b => b.id === id);
    
    if (!bill) {
        UI.toast('Bill not found', 'error');
        return;
    }
    
    // Create a simple text receipt
    const receipt = `SCHOOL FEE BILL
=====================
Student: ${bill.studentName}
Class: ${bill.studentClass || 'N/A'}
Amount: ₦${bill.amount.toLocaleString()}
Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
Date Sent: ${bill.sentAt}
Status: ${bill.status.toUpperCase()}

Payment Account:
Account Number: ${getAccountSettings().accountNumber || '1234567890'}

Thank you for your prompt payment.
`;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fee_Bill_${bill.studentName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    UI.toast('Bill downloaded!', 'success');
};

window.exportReport = function(format) {
    const payments = getFeePayments();
    const students = getStudents();
    
    if (format === 'excel') {
        // Create CSV content
        let csv = 'Student Name,Class,Amount Paid,Date,Method,Reference,Status\n';
        payments.forEach(p => {
            csv += `"${p.studentName}","${p.studentClass || 'N/A'}",${p.amount},"${p.date}","${p.method}","${p.reference || ''}","${p.status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fee_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UI.toast('Report exported as CSV!', 'success');
    } else if (format === 'pdf') {
        UI.toast('PDF export coming soon! Use CSV for now.', 'info');
    }
};

window.saveFeeSettings = async function(e) {
    e.preventDefault();
    const form = e.target;
    const inputs = form.querySelectorAll('input[type="number"]');
    const payload = {
        feeAmount: parseInt(inputs[0]?.value || '50000', 10),
        threshold30: parseInt(inputs[1]?.value || '15000', 10),
        threshold70: parseInt(inputs[2]?.value || '35000', 10),
    };
    const result = await API.accountant.updateSettings(payload);
    accountantState.settings = result?.data || { ...getAccountSettings(), ...payload };
    UI.toast('Fee settings saved!', 'success');
};

window.saveEmailSettings = async function(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const payload = {
        schoolEmail: inputs[0]?.value || '',
        emailSubject: inputs[1]?.value || '',
        accountNumber: inputs[2]?.value || '',
    };
    const result = await API.accountant.updateSettings(payload);
    accountantState.settings = result?.data || { ...getAccountSettings(), ...payload };
    UI.toast('Email settings saved!', 'success');
};

window.applyFeeFilters = function() {
    UI.toast('Filters applied!', 'success');
};

window.clearFeeFilters = function() {
    document.getElementById('filterClass').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('searchStudent').value = '';
    UI.toast('Filters cleared', 'info');
    if (window.location.hash === '#accountant-fees') {
        renderAccountantFees();
    }
};
