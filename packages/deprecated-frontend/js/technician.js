/* =============================================
   TECHNICIAN.JS — Yeshua Educational Platform
   System monitoring & diagnostics portal
   ============================================= */

const technicianState = {
    health: { status: 'healthy', api: true, database: true, uptime: 'N/A', version: '1.0.0', environment: 'Production', hostname: '', loadAvg: [], cpus: 0, freeMemory: 0, totalMemory: 0 },
    diagnostics: { dbLatency: 0, userCounts: {}, recentAuditEntries: [], systemInfo: {} },
    logs: [],
    devices: [],
    alerts: [],
    rbacPolicies: [],
    loading: null,
};

/* ---- INIT ---- */
(function boot() {
    UI.initTheme();

    const user = Auth.current();
    if (!user || user.role !== 'technician') {
        window.location.href = 'index.html#login';
        return;
    }

    Router.register('technician-home', renderTechnicianHome);
    Router.register('technician-system-health', renderTechnicianSystemHealth);
    Router.register('technician-diagnostics', renderTechnicianDiagnostics);
    Router.register('technician-logs', renderTechnicianLogs);
    Router.register('technician-devices', renderTechnicianDevices);
    Router.register('technician-alerts', renderTechnicianAlerts);
    Router.register('technician-rbac', renderTechnicianRBAC);
    Router.register('technician-settings', renderTechnicianSettings);

    Router.init();

    if (!window.location.hash) Router.go('technician-home');

    /* Auto-refresh: re-fetch monitoring data every 30s if enabled */
    const AUTO_REFRESH_INTERVAL_MS = 30000;
    setInterval(() => {
        if (localStorage.getItem('yems_tech_auto_refresh') !== 'true') return;
        const hash = (window.location.hash || '#technician-home').replace('#', '');
        /* Only refresh monitoring pages, not settings */
        const refreshablePages = ['technician-home', 'technician-system-health', 'technician-diagnostics', 'technician-logs', 'technician-devices', 'technician-alerts', 'technician-rbac'];
        if (!refreshablePages.includes(hash)) return;
        ensureTechnicianData(true).then(() => {
            const routeHandler = Router.routes?.[hash];
            if (typeof routeHandler === 'function') routeHandler();
        });
    }, AUTO_REFRESH_INTERVAL_MS);
})();

async function ensureTechnicianData(force = false) {
    if (!window.API?.technician) return;
    if (!force && technicianState.loading) {
        await technicianState.loading;
        return;
    }
    if (!force && (technicianState.logs.length || technicianState.rbacPolicies.length || technicianState.devices.length || technicianState.alerts.length)) {
        return;
    }

    technicianState.loading = Promise.all([
        API.technician.getHealth(),
        API.technician.getEnhancedDiagnostics(),
        API.technician.getLogs(),
        API.technician.getDevices(),
        API.technician.getAlerts(),
        API.technician.getRbacPolicies(),
    ]).then(([healthRes, diagRes, logsRes, devicesRes, alertsRes, rbacRes]) => {
        technicianState.health = healthRes?.data || technicianState.health;
        technicianState.diagnostics = diagRes?.data || technicianState.diagnostics;
        technicianState.logs = logsRes?.data || [];
        technicianState.devices = devicesRes?.data || [];
        technicianState.alerts = alertsRes?.data || [];
        technicianState.rbacPolicies = rbacRes?.data || [];
    }).catch((error) => {
        console.warn('[Technician] Failed to load data:', error?.message || error);
    }).finally(() => {
        technicianState.loading = null;
    });

    await technicianState.loading;
}

/* =============================================
   HELPERS
   ============================================= */
function getHealth() { return technicianState.health; }
function getDiagnostics() { return technicianState.diagnostics; }
function getTechnicianLogs() { return technicianState.logs; }
function getDevices() { return technicianState.devices; }
function getAlerts() { return technicianState.alerts; }
function getRBACPolicies() { return technicianState.rbacPolicies; }

function formatBytes(bytes) {
    if (bytes == null || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatUptime(seconds) {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    parts.push(m + 'm');
    return parts.join(' ');
}

function getLogActionColor(action) {
    const lower = (action || '').toLowerCase();
    if (lower.includes('create') || lower.includes('login')) return 'var(--success-bg)';
    if (lower.includes('update') || lower.includes('edit')) return 'var(--blue-bg)';
    if (lower.includes('delete') || lower.includes('remove')) return 'var(--danger-bg)';
    return 'var(--bg-card2)';
}

function getLogActionTextColor(action) {
    const lower = (action || '').toLowerCase();
    if (lower.includes('create') || lower.includes('login')) return 'var(--success)';
    if (lower.includes('update') || lower.includes('edit')) return 'var(--blue)';
    if (lower.includes('delete') || lower.includes('remove')) return 'var(--danger)';
    return 'var(--text-secondary)';
}

function getAlertSeverityColor(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return 'var(--danger)';
    if (s === 'warning') return '#F59E0B';
    if (s === 'info') return 'var(--blue)';
    return 'var(--text-secondary)';
}

function getAlertSeverityBg(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return 'var(--danger-bg)';
    if (s === 'warning') return 'rgba(245,158,11,0.12)';
    if (s === 'info') return 'var(--blue-bg)';
    return 'var(--bg-card2)';
}

/* =============================================
   TECHNICIAN DASHBOARD
   ============================================= */
async function renderTechnicianHome() {
    if (!Auth.guard()) return;
    await ensureTechnicianData();
    const user = Auth.current();
    const health = getHealth();
    const logs = getTechnicianLogs();
    const alerts = getAlerts();
    const diag = getDiagnostics();
    const activeAlerts = alerts.filter(a => a.status !== 'acknowledged' && a.status !== 'resolved').length;
    const recentLogs = logs.slice(0, 5);

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="margin-bottom: 2rem;">
          <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Technician Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">System monitoring and diagnostics. ${UI.greeting(user.name)}.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: ${health.status === 'healthy' ? 'linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%)' : 'linear-gradient(135deg, #B87A00 0%, #FBBF24 100%)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                ${health.status === 'healthy' ? '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">System Status</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${health.status === 'healthy' ? 'Healthy' : 'Warning'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${formatUptime(health.uptime)}</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">DB Latency</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${diag.dbLatency != null ? diag.dbLatency + 'ms' : 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Database response time</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Users</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${diag.userCounts?.total ?? 'N/A'}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">All roles</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Active Alerts</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${activeAlerts}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Requiring attention</div>
              </div>
            </div>
          </div>
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 2rem 0 1rem 0;">Quick Actions</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-system-health')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">System Health</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Monitor platform status</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-diagnostics')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Diagnostics</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Deep system analysis</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-logs')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Audit Logs</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Track system activity</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-alerts')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Alerts ${activeAlerts ? `<span style="background: var(--danger); color: white; border-radius: 50%; padding: 0.15rem 0.5rem; font-size: 0.7rem; margin-left: 0.25rem;">${activeAlerts}</span>` : ''}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Review system alerts</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-devices')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16 8a5.5 5.5 0 0 1 0 8M8 16a5.5 5.5 0 0 1 0-8"/><path d="M19 5a9.5 9.5 0 0 1 0 14M5 19a9.5 9.5 0 0 1 0-14"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Devices</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Connected hardware</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('technician-rbac')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                <svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">RBAC Policies</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">View role definitions</div>
              </div>
            </div>
          </div>

        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 2rem 0 1rem 0;">Recent Audit Activity</h2>
        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          ${recentLogs.length === 0 ? '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No recent activity</div>' : recentLogs.map(log => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-light);">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: ${getLogActionColor(log.action)}; color: ${getLogActionTextColor(log.action)}; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 700;">
                ${(log.action || '').includes('create') ? '+' : (log.action || '').includes('delete') ? '×' : '•'}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 0.875rem; color: var(--text-primary); font-weight: 500;">${log.actorName || log.actor || 'System'} ${log.action}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${log.entityType || log.resource || ''} ${log.entityType ? '•' : ''} ${new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()}</div>
              </div>
              <span class="badge" style="background: ${log.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${log.status === 'success' ? 'var(--success)' : 'var(--danger)'}; font-size: 0.65rem;">${log.status || 'success'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-home', content);
}

/* =============================================
   SYSTEM HEALTH
   ============================================= */
async function renderTechnicianSystemHealth() {
    if (!Auth.guard()) return;
    await ensureTechnicianData(true);
    const health = getHealth();
    const diag = getDiagnostics();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">System Health</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Real-time platform health monitoring.</p>
          </div>
          <button onclick="refreshTechnicianHealth()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 0.4rem;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div class="glass-card" style="padding: 2rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); margin-bottom: 2rem; text-align: center;">
          <div style="width: 100px; height: 100px; border-radius: 50%; background: ${health.status === 'healthy' ? 'linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 1rem auto;">
            ${health.status === 'healthy' ? '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}
          </div>
          <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0;">System is ${health.status === 'healthy' ? 'Healthy' : 'Experiencing Issues'}</h2>
          <p style="font-size: 1rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Last checked: ${new Date().toLocaleString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">API Status</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${health.api ? 'var(--success)' : 'var(--danger)'}; display: inline-block;"></span>
              <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.api ? 'Operational' : 'Down'}</span>
            </div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">Database</div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${health.database ? 'var(--success)' : 'var(--danger)'}; display: inline-block;"></span>
              <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${health.database ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">DB Latency</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${diag.dbLatency != null ? diag.dbLatency + 'ms' : 'N/A'}</div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; margin-bottom: 0.5rem;">Uptime</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${formatUptime(health.uptime)}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); margin-bottom: 2rem;">
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1rem 0;">System Information</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Hostname</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.hostname || 'N/A'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Platform Version</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.version || '1.0.0'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Environment</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.environment || 'Production'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">CPU Cores</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.cpus || 'N/A'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Memory</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${health.freeMemory != null && health.totalMemory != null ? formatBytes(health.freeMemory) + ' / ' + formatBytes(health.totalMemory) : 'N/A'}</div>
            </div>
            <div style="padding: 1rem; border-radius: 8px; background: var(--bg-card2);">
              <div style="font-size: 0.75rem; color: var(--text-muted);">Load Average</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${Array.isArray(health.loadAvg) ? health.loadAvg.map(v => Number(v).toFixed(2)).join(', ') : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-system-health', content);
}

/* =============================================
   DIAGNOSTICS
   ============================================= */
async function renderTechnicianDiagnostics() {
    if (!Auth.guard()) return;
    await ensureTechnicianData(true);
    const diag = getDiagnostics();
    const health = getHealth();

    const userCounts = diag.userCounts || {};
    const sysInfo = diag.systemInfo || {};

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">System Diagnostics</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">In-depth platform diagnostics and performance metrics.</p>
          </div>
          <button onclick="refreshTechnicianDiagnostics()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 0.4rem;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Run Diagnostics
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">DB Latency</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: ${diag.dbLatency > 100 ? 'var(--danger)' : diag.dbLatency > 50 ? '#F59E0B' : 'var(--success)'};">${diag.dbLatency != null ? diag.dbLatency + 'ms' : 'N/A'}</div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Total Users</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${userCounts.total || userCounts.all || 0}</div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Students</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${userCounts.students || 0}</div>
          </div>
          <div style="padding: 1.5rem; border-radius: 12px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase;">Teachers</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${userCounts.teachers || 0}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); margin-bottom: 2rem;">
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1rem 0;">System Info</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
            ${Object.entries(sysInfo).map(([key, value]) => `
              <div style="padding: 0.75rem 1rem; border-radius: 8px; background: var(--bg-card2); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">${value != null ? String(value) : 'N/A'}</span>
              </div>
            `).join('')}
            ${Object.keys(sysInfo).length === 0 ? '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No system info available.</div>' : ''}
          </div>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1rem 0;">Recent Audit Entries (${diag.recentAuditEntries?.length || 0})</h3>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${(diag.recentAuditEntries || []).map(entry => `
                  <tr>
                    <td style="color: var(--text-secondary); font-size: 0.8rem;">${new Date(entry.timestamp || entry.createdAt || Date.now()).toLocaleString()}</td>
                    <td style="font-weight: 500;">${entry.actorName || entry.actor || 'System'}</td>
                    <td><span class="badge" style="background: ${getLogActionColor(entry.action)}; color: ${getLogActionTextColor(entry.action)};">${entry.action}</span></td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${entry.entityType || entry.resource || '-'}</td>
                    <td><span class="badge" style="background: ${entry.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${entry.status === 'success' ? 'var(--success)' : 'var(--danger)'};">${entry.status || 'success'}</span></td>
                  </tr>
                `).join('')}
                ${(!diag.recentAuditEntries || diag.recentAuditEntries.length === 0) ? '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No audit entries found.</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-diagnostics', content);
}

/* =============================================
   AUDIT LOGS
   ============================================= */
async function renderTechnicianLogs() {
    if (!Auth.guard()) return;
    await ensureTechnicianData();
    const logs = getTechnicianLogs();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Audit Logs</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">View system audit log entries.</p>
          </div>
          <button onclick="refreshTechnicianLogs()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 0.4rem;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${(Array.isArray(logs) ? logs : []).map(log => `
                  <tr>
                    <td style="color: var(--text-secondary); font-size: 0.8rem; white-space: nowrap;">${new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()}</td>
                    <td style="font-weight: 500;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--blue-bg); color: var(--blue); display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700;">${escapeHtml((log.actorName || log.actor || 'S').charAt(0).toUpperCase())}</span>
                        ${escapeHtml(log.actorName || log.actor || 'System')}
                      </div>
                    </td>
                    <td><span class="badge" style="background: ${getLogActionColor(log.action)}; color: ${getLogActionTextColor(log.action)};">${escapeHtml(log.action)}</span></td>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(log.entityType || '-')}</td>
                    <td style="color: var(--text-muted); font-size: 0.8rem; font-family: monospace;">${log.entityId ? escapeHtml(String(log.entityId).slice(0, 12)) + '...' : '-'}</td>
                    <td><span class="badge" style="background: ${log.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${log.status === 'success' ? 'var(--success)' : 'var(--danger)'};">${escapeHtml(log.status || 'success')}</span></td>
                    <td style="color: var(--text-muted); font-size: 0.8rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.metadata ? JSON.stringify(log.metadata) : (log.details || ''))}">${escapeHtml(log.details || (log.metadata ? 'View metadata' : '-'))}</td>
                  </tr>
                `).join('')}
                ${(!Array.isArray(logs) || logs.length === 0) ? '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">No audit logs found.</td></tr>' : ''}
              </tbody>
            </table>
            ${Array.isArray(logs) && logs.length > 0 ? `<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Showing ${logs.length} log entr${logs.length === 1 ? 'y' : 'ies'}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-logs', content);
}

/* =============================================
   DEVICES
   ============================================= */
async function renderTechnicianDevices() {
    if (!Auth.guard()) return;
    await ensureTechnicianData();
    const devices = getDevices();
    const deviceArray = Array.isArray(devices) ? devices : (devices.data || devices.devices || []);

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Devices</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Monitor connected devices and hardware.</p>
          </div>
          <button onclick="refreshTechnicianDevices()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 0.4rem;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          ${deviceArray.length === 0 ? `
            <div style="padding: 4rem 2rem; text-align: center;">
              <svg class="icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 1rem;"><circle cx="12" cy="12" r="2"/><path d="M16 8a5.5 5.5 0 0 1 0 8M8 16a5.5 5.5 0 0 1 0-8"/><path d="M19 5a9.5 9.5 0 0 1 0 14M5 19a9.5 9.5 0 0 1 0-14"/></svg>
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">No Devices Found</h3>
              <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0; max-width: 400px; margin: 0 auto;">Device inventory is not yet configured. Check back once devices are registered in the system.
              ${devices.meta ? '<br><br><span style="font-size: 0.8rem;">' + (devices.meta.msg || devices.meta.message || '') + '</span>' : ''}</p>
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${deviceArray.map(device => `
                    <tr>
                      <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <span style="width: 36px; height: 36px; border-radius: 8px; background: var(--bg-card2); display: flex; align-items: center; justify-content: center;">📡</span>
                          <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${device.name || 'Unnamed Device'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${device.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style="color: var(--text-secondary);">${device.type || '-'}</td>
                      <td><span class="badge" style="background: ${device.status === 'online' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${device.status === 'online' ? 'var(--success)' : 'var(--danger)'};">${device.status || 'unknown'}</span></td>
                      <td style="color: var(--text-secondary); font-size: 0.85rem;">${device.lastSeen ? new Date(device.lastSeen).toLocaleString() : '-'}</td>
                      <td>
                        <button onclick="UI.toast('Device details coming soon', 'info')" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">View</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-devices', content);
}

/* =============================================
   ALERTS
   ============================================= */
async function renderTechnicianAlerts() {
    if (!Auth.guard()) return;
    await ensureTechnicianData();
    const alerts = getAlerts();
    const alertArray = Array.isArray(alerts) ? alerts : (alerts.data || alerts.alerts || []);

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Alerts</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Review and acknowledge system alerts.</p>
          </div>
          <button onclick="refreshTechnicianAlerts()" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; border-radius: 12px;">
            <svg class="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="margin-right: 0.4rem;"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
          ${alertArray.length === 0 ? `
            <div style="padding: 4rem 2rem; text-align: center;">
              <svg class="icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 1rem;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">No Alerts</h3>
              <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0; max-width: 400px; margin: 0 auto;">The system is running smoothly with no active alerts.
              ${alerts.meta ? '<br><br><span style="font-size: 0.8rem;">' + (alerts.meta.msg || alerts.meta.message || '') + '</span>' : ''}</p>
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Severity</th>
                    <th>Type</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${alertArray.map(alert => `
                    <tr>
                      <td style="color: var(--text-secondary); font-size: 0.85rem; white-space: nowrap;">${new Date(alert.timestamp || alert.createdAt || Date.now()).toLocaleString()}</td>
                      <td><span class="badge" style="background: ${getAlertSeverityBg(alert.severity)}; color: ${getAlertSeverityColor(alert.severity)};">${alert.severity || 'info'}</span></td>
                      <td style="color: var(--text-secondary);">${alert.type || alert.alertType || '-'}</td>
                      <td style="color: var(--text-primary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${alert.message || alert.msg || ''}">${alert.message || alert.msg || '-'}</td>
                      <td><span class="badge" style="background: ${alert.status === 'acknowledged' ? 'var(--blue-bg)' : alert.status === 'resolved' ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${alert.status === 'acknowledged' ? 'var(--blue)' : alert.status === 'resolved' ? 'var(--success)' : 'var(--danger)'};">${alert.status || 'open'}</span></td>
                      <td>
                        ${alert.status !== 'acknowledged' && alert.status !== 'resolved' ? `
                          <button onclick="acknowledgeAlert('${alert.id}')" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Acknowledge</button>
                        ` : `<span style="color: var(--text-muted); font-size: 0.8rem;">—</span>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-alerts', content);
}

/* =============================================
   RBAC POLICIES
   ============================================= */
async function renderTechnicianRBAC() {
    if (!Auth.guard()) return;
    await ensureTechnicianData();
    const policies = getRBACPolicies();
    const policyArray = Array.isArray(policies) ? policies : (policies.data || policies.roles || []);

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">RBAC Policies</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Role-based access control policy definitions.</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
          ${policyArray.map(role => `
            <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">${role.name || role.role || 'Unnamed Role'}</h3>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${role.description || ''}</p>
                  </div>
                </div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem;">Permissions</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                  ${(role.permissions || role.policies || []).map(p => `<span class="badge" style="background: var(--bg-card2); color: var(--text-secondary); font-size: 0.7rem;">${typeof p === 'string' ? p : p.name || p.action || JSON.stringify(p)}</span>`).join('')}
                </div>
              </div>
              ${role.users != null ? `
              <div style="margin-top: 1rem; padding: 0.75rem; border-radius: 8px; background: var(--bg-card2);">
                <div style="font-size: 0.75rem; color: var(--text-muted);">Assigned Users</div>
                <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${role.users}</span>
              </div>
              ` : ''}
            </div>
          `).join('')}
          ${policyArray.length === 0 ? '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">No RBAC policies found.</div>' : ''}
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-rbac', content);
}

/* =============================================
   SETTINGS
   ============================================= */
async function renderTechnicianSettings() {
    if (!Auth.guard()) return;
    const user = Auth.current();

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0;">Settings</h1>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 2rem 0;">Your technician portal preferences.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
          <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0;">Profile</h3>
            <div style="display: grid; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Name</label>
                <input type="text" value="${user.name || ''}" class="form-input" disabled style="opacity: 0.7;">
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Email</label>
                <input type="email" value="${user.email || ''}" class="form-input" disabled style="opacity: 0.7;">
              </div>
              <div>
                <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Role</label>
                <input type="text" value="Technician" class="form-input" disabled style="opacity: 0.7;">
              </div>
            </div>
          </div>

          <div class="glass-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0;">Preferences</h3>
            <form onsubmit="saveTechnicianPrefs(event)" style="display: grid; gap: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" id="techAutoRefresh" ${localStorage.getItem('yems_tech_auto_refresh') === 'true' ? 'checked' : ''} style="width: 18px; height: 18px;">
                <label for="techAutoRefresh" style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 500;">Auto-refresh monitoring data</label>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" id="techShowResolved" ${localStorage.getItem('yems_tech_show_resolved') !== 'false' ? 'checked' : ''} style="width: 18px; height: 18px;">
                <label for="techShowResolved" style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 500;">Show resolved alerts in list</label>
              </div>
              <button type="submit" class="btn btn-primary" style="padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">Save Preferences</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('technician-settings', content);
}

/* =============================================
   ACTIONS & HELPERS
   ============================================= */
function refreshTechnicianHealth() {
    technicianState.loading = null;
    technicianState.health = { status: 'healthy', api: true, database: true, uptime: 'N/A', version: '1.0.0', environment: 'Production' };
    ensureTechnicianData(true).then(() => renderTechnicianSystemHealth());
}

function refreshTechnicianDiagnostics() {
    technicianState.loading = null;
    ensureTechnicianData(true).then(() => renderTechnicianDiagnostics());
}

function refreshTechnicianLogs() {
    technicianState.logs = [];
    ensureTechnicianData(true).then(() => renderTechnicianLogs());
}

function refreshTechnicianDevices() {
    technicianState.devices = [];
    ensureTechnicianData(true).then(() => renderTechnicianDevices());
}

function refreshTechnicianAlerts() {
    technicianState.alerts = [];
    ensureTechnicianData(true).then(() => renderTechnicianAlerts());
}

async function acknowledgeAlert(alertId) {
    try {
        const res = await API.technician.acknowledgeAlert(alertId, 'acknowledged', 'Reviewed by technician');
        if (res?.data) {
            const alertIdx = technicianState.alerts.findIndex(a => a.id === alertId);
            if (alertIdx !== -1) {
                technicianState.alerts[alertIdx] = { ...technicianState.alerts[alertIdx], ...res.data };
            }
            UI.toast('Alert acknowledged', 'success');
            renderTechnicianAlerts();
        } else {
            UI.toast('Alert acknowledged (client-side)', 'success');
            const alertIdx = technicianState.alerts.findIndex(a => a.id === alertId);
            if (alertIdx !== -1) {
                technicianState.alerts[alertIdx].status = 'acknowledged';
            }
            renderTechnicianAlerts();
        }
    } catch (e) {
        console.warn('[Technician] Acknowledge alert error:', e?.message || e);
        UI.toast('Failed to acknowledge alert', 'error');
    }
}

function saveTechnicianPrefs(e) {
    e.preventDefault();
    localStorage.setItem('yems_tech_auto_refresh', document.getElementById('techAutoRefresh')?.checked || false);
    localStorage.setItem('yems_tech_show_resolved', document.getElementById('techShowResolved')?.checked !== false);
    UI.toast('Preferences saved!', 'success');
}
