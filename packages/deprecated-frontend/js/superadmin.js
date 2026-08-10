/* =============================================
   SUPERADMIN.JS — Yeshua Educational Platform
   ============================================= */

const superadminState = {
    institutions: [],
    systemHealth: { status: 'healthy', api: true, database: true, storage: 'N/A', uptime: 'N/A', version: '1.0.0', environment: 'Production', activeSessions: 0 },
    roles: [],
    auditLogs: [],
    platformSettings: {},
    backups: [],
    loading: null,
};

/* ---- INIT ---- */
(function boot() {
    UI.initTheme();

    const user = Auth.current();
    if (!user || !['superadmin', 'platform_admin'].includes(user.role)) {
        window.location.href = 'index.html#login';
        return;
    }

    Router.register('superadmin-home', renderSuperAdminHome);
    Router.register('superadmin-admins', renderSuperAdminAdmins);
    Router.register('superadmin-institutions', renderSuperAdminInstitutions);
    Router.register('superadmin-system-health', renderSuperAdminSystemHealth);
    Router.register('superadmin-rbac', renderSuperAdminRBAC);
    Router.register('superadmin-audit-logs', renderSuperAdminAuditLogs);
    Router.register('superadmin-settings', renderSuperAdminSettings);
    Router.register('superadmin-backups', renderSuperAdminBackups);

    Router.init();

    if (!window.location.hash) Router.go('superadmin-home');
})();

async function ensureSuperadminData(force = false) {
    if (!window.API?.superadmin) return;
    if (!force && superadminState.loading) {
        await superadminState.loading;
        return;
    }
    if (!force && (superadminState.institutions.length || superadminState.roles.length || superadminState.backups.length || superadminState.auditLogs.length)) {
        return;
    }

    superadminState.loading = Promise.all([
        API.superadmin.getInstitutions(),
        API.superadmin.getRbacRoles(),
        API.superadmin.getAuditLogs(200),
        API.superadmin.getPlatformSettings(),
        API.superadmin.getBackups(),
        API.technician.getHealth()
    ]).then(([institutionsRes, rolesRes, logsRes, settingsRes, backupsRes, healthRes]) => {
        superadminState.institutions = institutionsRes?.data || [];
        superadminState.roles = rolesRes?.data || [];
        superadminState.auditLogs = logsRes?.data || [];
        superadminState.platformSettings = settingsRes?.data || {};
        superadminState.backups = backupsRes?.data || [];
        superadminState.systemHealth = healthRes?.data || superadminState.systemHealth;
    }).catch((error) => {
        console.warn('[Superadmin] Failed to load superadmin data:', error?.message || error);
    }).finally(() => {
        superadminState.loading = null;
    });

    await superadminState.loading;
}

/* =============================================
   SUPERADMIN DASHBOARD
   ============================================= */
async function renderSuperAdminHome() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const user = Auth.current();
    const allUsers = getAppUsers();
    const allInstitutions = getInstitutions();

    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter(u => ['admin', 'superadmin'].includes(u.role)).length;
    const totalTeachers = allUsers.filter(u => u.role === 'teacher').length;
    const totalStudents = allUsers.filter(u => u.role === 'student').length;
    const totalInstitutions = allInstitutions.length;
    const systemHealth = getSystemHealth();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="margin-bottom: 2rem;">
          <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Super Admin Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Platform-wide oversight and management. Welcome back, ${user.name}.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Total Users</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalUsers}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">All roles</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Admins</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalAdmins}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Platform administrators</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Institutions</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalInstitutions}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Connected schools</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: ${systemHealth.status === 'healthy' ? 'linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%)' : 'linear-gradient(135deg, #B87A00 0%, #FBBF24 100%)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">${systemHealth.status === 'healthy' ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>️'}</div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">System Status</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${systemHealth.status === 'healthy' ? 'Healthy' : 'Warning'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${systemHealth.uptime || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 2rem 0 1rem 0;">Quick Actions</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          
          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-admins')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Admin Management</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Create, edit, or remove admins</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-institutions')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/></svg>️</div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Institutions</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Manage connected schools</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-system-health')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">System Health</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Monitor platform status</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-rbac')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">RBAC Policies</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Define roles & permissions</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-audit-logs')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Audit Logs</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Track all system activity</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('superadmin-backups')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Backups</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Manage data backups</div>
              </div>
            </div>
          </div>

        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 2rem 0 1rem 0;">Recent Activity</h2>
        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          ${renderRecentActivity()}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-home', content);
}

/* =============================================
   ADMIN MANAGEMENT
   ============================================= */
async function renderSuperAdminAdmins() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const user = Auth.current();
    const allUsers = getAppUsers();
    const admins = allUsers.filter(u => ['admin', 'superadmin'].includes(u.role));

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Admin Management</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Manage platform administrators and super admins.</p>
          </div>
          <button onclick="openCreateAdminModal()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <i class="fas fa-plus"></i> Add Admin
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Total Admins</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${admins.length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Super Admins</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">${admins.filter(a => a.role === 'superadmin').length}</div>
          </div>
          <div style="padding: 1.25rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Active Now</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--success);">${admins.filter(a => a.status === 'active').length}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${admins.map(admin => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${admin.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div style="font-weight: 600; color: var(--text-primary);">${admin.name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${admin.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge" style="background: ${admin.role === 'superadmin' ? 'linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%)' : 'var(--blue-bg)'}; color: ${admin.role === 'superadmin' ? 'white' : 'var(--blue)'};">
                        ${admin.role === 'superadmin' ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Super Admin' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Admin'}
                      </span>
                    </td>
                    <td style="color: var(--text-secondary);">${admin.email}</td>
                    <td>
                      <span class="badge" style="background: ${admin.status === 'active' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${admin.status === 'active' ? 'var(--success)' : 'var(--danger)'};">
                        ${admin.status || 'active'}
                      </span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.875rem;">${new Date(admin.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editAdmin('${admin.id}')" class="btn-icon" title="Edit"><i class="fas fa-edit"></i></button>
                        ${admin.role !== 'superadmin' ? `
                        <button onclick="toggleAdminStatus('${admin.id}')" class="btn-icon" title="${admin.status === 'active' ? 'Suspend' : 'Activate'}"><i class="fas fa-${admin.status === 'active' ? 'pause' : 'play'}"></i></button>
                        <button onclick="deleteAdmin('${admin.id}')" class="btn-icon btn-danger" title="Delete"><i class="fas fa-trash"></i></button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${admins.length === 0 ? '<div style="padding: 3rem; text-align: center; color: var(--text-muted);">No admins found. Create your first admin!</div>' : ''}
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-admins', content);
}

/* =============================================
   INSTITUTIONS MANAGEMENT
   ============================================= */
async function renderSuperAdminInstitutions() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const institutions = getInstitutions();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Institutions</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Manage connected schools and educational institutions.</p>
          </div>
          <button onclick="openCreateInstitutionModal()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <i class="fas fa-plus"></i> Add Institution
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          ${institutions.map(inst => `
            <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="width: 60px; height: 60px; border-radius: 12px; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"/></svg></div>
                <span class="badge" style="background: ${inst.status === 'active' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${inst.status === 'active' ? 'var(--success)' : 'var(--danger)'};">
                  ${inst.status || 'active'}
                </span>
              </div>
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">${inst.name}</h3>
              <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 1rem 0;">${inst.address || 'No address provided'}</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div style="padding: 0.75rem; border-radius: 8px; background: var(--bg-card2);">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Students</div>
                  <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${inst.students || 0}</div>
                </div>
                <div style="padding: 0.75rem; border-radius: 8px; background: var(--bg-card2);">
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Teachers</div>
                  <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${inst.teachers || 0}</div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button onclick="editInstitution('${inst.id}')" class="btn btn-secondary" style="flex: 1; padding: 0.5rem; border-radius: 8px; font-size: 0.875rem;">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteInstitution('${inst.id}')" class="btn btn-danger" style="padding: 0.5rem; border-radius: 8px;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
          ${institutions.length === 0 ? '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">No institutions found. Add your first institution!</div>' : ''}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-institutions', content);
}

/* =============================================
   SYSTEM HEALTH
   ============================================= */
async function renderSuperAdminSystemHealth() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const health = getSystemHealth();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">System Health</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Monitor platform performance and status.</p>
          </div>
          <button onclick="refreshSystemHealth()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <i class="fas fa-sync"></i> Refresh
          </button>
        </div>

        <div class="glass-card" style="padding: 2rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); margin-bottom: 2rem; text-align: center;">
          <div style="width: 100px; height: 100px; border-radius: 50%; background: ${health.status === 'healthy' ? 'linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 1rem auto;">
            ${health.status === 'healthy' ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>️'}
          </div>
          <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0;">System is ${health.status === 'healthy' ? 'Healthy' : 'Experiencing Issues'}</h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Last checked: ${new Date().toLocaleString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">API Status</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${health.api ? 'var(--success)' : 'var(--danger)'};"></div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.api ? 'Operational' : 'Down'}</div>
            </div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">Database</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${health.database ? 'var(--success)' : 'var(--danger)'};"></div>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.database ? 'Connected' : 'Disconnected'}</div>
            </div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">Storage</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.storage || 'N/A'}</div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">Uptime</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.uptime || 'N/A'}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1rem 0;">System Information</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Platform Version</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.version || '1.0.0'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Environment</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.environment || 'Production'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Server Time</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${new Date().toLocaleString()}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Active Sessions</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.activeSessions || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-system-health', content);
}

/* =============================================
   RBAC POLICIES
   ============================================= */
async function renderSuperAdminRBAC() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const roles = getRBACRoles();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Roles & Permissions</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Define and manage role-based access control policies.</p>
          </div>
          <button onclick="openCreateRoleModal()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <i class="fas fa-plus"></i> Create Role
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
          ${roles.map(role => `
            <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: ${getRoleColor(role.name)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">${getRoleIcon(role.name)}</div>
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">${role.name}</h3>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${role.users || 0} users</p>
                  </div>
                </div>
                <button onclick="editRole('${role.id}')" class="btn-icon"><i class="fas fa-edit"></i></button>
              </div>
              <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">Permissions</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                  ${(role.permissions || []).map(p => `<span class="badge" style="background: var(--bg-card2); color: var(--text-secondary); font-size: 0.7rem;">${p}</span>`).join('')}
                </div>
              </div>
              <div style="padding: 0.75rem; border-radius: 8px; background: var(--bg-card2);">
                <div style="font-size: 0.75rem; color: var(--text-muted);">Description</div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">${role.description || 'No description'}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-rbac', content);
}

/* =============================================
   AUDIT LOGS
   ============================================= */
async function renderSuperAdminAuditLogs() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const logs = getAuditLogs();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Audit Logs</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Track all system activity and user actions.</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="exportAuditLogs()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
              <i class="fas fa-download"></i> Export
            </button>
            <button onclick="clearAuditLogs()" class="btn btn-danger" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
              <i class="fas fa-trash"></i> Clear
            </button>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td style="color: var(--text-secondary); font-size: 0.875rem;">${new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">${escapeHtml((log.user || '').charAt(0).toUpperCase())}</div>
                        <span style="color: var(--text-primary); font-weight: 500;">${escapeHtml(log.user)}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" style="background: ${getActionColor(log.action)}; color: ${getActionTextColor(log.action)};">
                        ${escapeHtml(log.action)}
                      </span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 0.875rem;">${escapeHtml(log.resource)}</td>
                    <td>
                      <span class="badge" style="background: ${log.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${log.status === 'success' ? 'var(--success)' : 'var(--danger)'};">
                        ${escapeHtml(log.status)}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${logs.length === 0 ? '<div style="padding: 3rem; text-align: center; color: var(--text-muted);">No audit logs found.</div>' : ''}
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-audit-logs', content);
}

/* =============================================
   SETTINGS
   ============================================= */
async function renderSuperAdminSettings() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const settings = getPlatformSettings();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0;">Platform Settings</h1>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 2rem 0;">Configure global platform settings and preferences.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
          <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0;">General Settings</h3>
            <form onsubmit="saveGeneralSettings(event)" style="display: grid; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Platform Name</label>
                <input type="text" value="${settings.platformName || 'Yeshua Educational Platform'}" class="form-input" required>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Support Email</label>
                <input type="email" value="${settings.supportEmail || 'support@yems.local'}" class="form-input" required>
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Max Users per Institution</label>
                <input type="number" value="${settings.maxUsersPerInstitution || 1000}" class="form-input" required>
              </div>
              <button type="submit" class="btn btn-primary" style="padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">Save Changes</button>
            </form>
          </div>

          <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0;">Security Settings</h3>
            <form onsubmit="saveSecuritySettings(event)" style="display: grid; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Session Timeout (minutes)</label>
                <input type="number" value="${settings.sessionTimeout || 60}" class="form-input" required>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" id="enable2FA" ${settings.enable2FA ? 'checked' : ''} style="width: 18px; height: 18px;">
                <label for="enable2FA" style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 500;">Enable Two-Factor Authentication</label>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" id="forcePasswordChange" ${settings.forcePasswordChange ? 'checked' : ''} style="width: 18px; height: 18px;">
                <label for="forcePasswordChange" style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 500;">Force Password Change on First Login</label>
              </div>
              <button type="submit" class="btn btn-primary" style="padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">Save Security Settings</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-settings', content);
}

/* =============================================
   BACKUPS
   ============================================= */
async function renderSuperAdminBackups() {
    if (!Auth.guard()) return;
    await ensureSuperadminData();
    const backups = getBackups();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Data Backups</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Manage and restore platform data backups.</p>
          </div>
          <button onclick="createBackup()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <i class="fas fa-plus"></i> Create Backup
          </button>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Backup Name</th>
                  <th>Created</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${backups.map(backup => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>
                        <div>
                          <div style="font-weight: 600; color: var(--text-primary);">${backup.name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">${backup.description || 'Manual backup'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="color: var(--text-secondary);">${new Date(backup.createdAt).toLocaleString()}</td>
                    <td style="color: var(--text-secondary); font-weight: 500;">${backup.size}</td>
                    <td>
                      <span class="badge" style="background: var(--bg-card2); color: var(--text-secondary);">${backup.type}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.5rem;">
                        <button onclick="downloadBackup('${backup.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                          <i class="fas fa-download"></i> Download
                        </button>
                        <button onclick="restoreBackup('${backup.id}')" class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                          <i class="fas fa-undo"></i> Restore
                        </button>
                        <button onclick="deleteBackup('${backup.id}')" class="btn btn-danger" style="padding: 0.5rem; border-radius: 8px;">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${backups.length === 0 ? '<div style="padding: 3rem; text-align: center; color: var(--text-muted);">No backups found. Create your first backup!</div>' : ''}
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('superadmin-backups', content);
}

/* =============================================
   HELPER FUNCTIONS
   ============================================= */

function getInstitutions() {
    return superadminState.institutions;
}

function getSystemHealth() {
    return superadminState.systemHealth;
}

function getRBACRoles() {
    return superadminState.roles;
}

function getAuditLogs() {
    return superadminState.auditLogs;
}

function getPlatformSettings() {
    return superadminState.platformSettings;
}

function getBackups() {
    return superadminState.backups;
}

function getRoleColor(role) {
    const colors = {
        'Super Admin': 'linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%)',
        'Admin': 'linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%)',
        'Teacher': 'linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%)',
        'Student': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'Technician': 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)'
    };
    return colors[role] || 'var(--bg-card2)';
}

function getRoleIcon(role) {
    const icons = { 'Super Admin': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>', 'Admin': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', 'Teacher': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>', 'Student': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', 'Technician': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' };
    return icons[role] || '';
}

function getActionColor(action) {
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('login')) return 'var(--success-bg)';
    if (lower.includes('update') || lower.includes('edit')) return 'var(--blue-bg)';
    if (lower.includes('delete') || lower.includes('remove')) return 'var(--danger-bg)';
    return 'var(--bg-card2)';
}

function getActionTextColor(action) {
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('login')) return 'var(--success)';
    if (lower.includes('update') || lower.includes('edit')) return 'var(--blue)';
    if (lower.includes('delete') || lower.includes('remove')) return 'var(--danger)';
    return 'var(--text-secondary)';
}

function renderRecentActivity() {
    const logs = getAuditLogs().slice(0, 5);
    if (logs.length === 0) {
        return '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No recent activity</div>';
    }
    return logs.map(log => `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--border-light);">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${getActionColor(log.action)}; color: ${getActionTextColor(log.action)}; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                ${log.action.includes('create') ? '+' : log.action.includes('delete') ? '×' : '•'}
            </div>
            <div style="flex: 1;">
                <div style="font-size: 0.875rem; color: var(--text-primary); font-weight: 500;">${log.user} ${log.action}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${log.resource} • ${new Date(log.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

// Modal functions
function openCreateAdminModal() {
    UI.toast('Create Admin Modal - Coming soon', 'info');
}

function openCreateInstitutionModal() {
    UI.toast('Create Institution Modal - Coming soon', 'info');
}

function openCreateRoleModal() {
    UI.toast('Create Role Modal - Coming soon', 'info');
}

// Action functions
function editAdmin(id) { console.log('Edit admin:', id); UI.toast('Edit admin - Coming soon', 'info'); }
function toggleAdminStatus(id) { console.log('Toggle admin status:', id); UI.toast('Toggle status - Coming soon', 'info'); }
function deleteAdmin(id) { if(confirm('Delete this admin?')) { UI.toast('Delete - Coming soon', 'info'); } }
function editInstitution(id) { console.log('Edit institution:', id); UI.toast('Edit institution - Coming soon', 'info'); }
function deleteInstitution(id) { if(confirm('Delete this institution?')) { UI.toast('Delete - Coming soon', 'info'); } }
function editRole(id) { console.log('Edit role:', id); UI.toast('Edit role - Coming soon', 'info'); }
function refreshSystemHealth() { location.reload(); }
function exportAuditLogs() { UI.toast('Export audit logs - Coming soon', 'info'); }
async function clearAuditLogs() {
    if (!confirm('Clear all audit logs?')) return;
    await API.superadmin.clearAuditLogs();
    superadminState.auditLogs = [];
    renderSuperAdminAuditLogs();
}
async function saveGeneralSettings(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const payload = {
        platformName: inputs[0]?.value || 'Yeshua Educational Platform',
        supportEmail: inputs[1]?.value || 'support@yems.local',
        maxUsersPerInstitution: Number(inputs[2]?.value || 1000),
    };
    const res = await API.superadmin.updatePlatformSettings(payload);
    superadminState.platformSettings = res?.data || { ...getPlatformSettings(), ...payload };
    UI.toast('Settings saved!', 'success');
}
async function saveSecuritySettings(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const payload = {
        sessionTimeout: Number(inputs[0]?.value || 60),
        enable2FA: Boolean(document.getElementById('enable2FA')?.checked),
        forcePasswordChange: Boolean(document.getElementById('forcePasswordChange')?.checked),
    };
    const res = await API.superadmin.updatePlatformSettings(payload);
    superadminState.platformSettings = res?.data || { ...getPlatformSettings(), ...payload };
    UI.toast('Security settings saved!', 'success');
}
async function createBackup() {
    const backupName = `Manual Backup ${new Date().toLocaleString()}`;
    const res = await API.superadmin.createBackup({
        name: backupName,
        description: 'Manual backup',
        type: 'manual',
        size: '0 MB',
    });
    superadminState.backups = [res?.data, ...getBackups()].filter(Boolean);
    renderSuperAdminBackups();
    UI.toast('Backup created!', 'success');
}
function downloadBackup(id) { console.log('Download backup:', id); UI.toast('Download - Coming soon', 'info'); }
function restoreBackup(id) { console.log('Restore backup:', id); UI.toast('Restore - Coming soon', 'info'); }
async function deleteBackup(id) {
    if (!confirm('Delete this backup?')) return;
    await API.superadmin.deleteBackup(id);
    superadminState.backups = getBackups().filter((backup) => backup.id !== id);
    renderSuperAdminBackups();
    UI.toast('Backup deleted', 'success');
}
