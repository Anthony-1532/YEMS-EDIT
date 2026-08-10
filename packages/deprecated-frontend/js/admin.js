/* =============================================
   ADMIN.JS — Yeshua Educational Platform
   ============================================= */

/**
 * Determines school level from class name
 * @param {string} className - Class name (e.g., "JSS1", "SS2")
 * @returns {string} 'junior' or 'senior'
 */
function getSchoolLevelFromClass(className) {
    if (!className) return null;
    return className.startsWith('JSS') ? 'junior' : 'senior';
}

/**
 * Gets unique school levels from selected classes
 * @param {string[]} classes - Array of selected class names
 * @returns {string[]} Unique school levels ['junior', 'senior']
 */
function getSchoolLevelsFromClasses(classes) {
    if (!Array.isArray(classes) || classes.length === 0) return [];
    const levels = new Set(classes.map(c => getSchoolLevelFromClass(c)).filter(Boolean));
    return Array.from(levels);
}

/**
 * Gets subject options based on selected classes
 * @param {string[]} selectedClasses - Array of selected class names
 * @returns {string} HTML string of subject checkboxes
 */
function getTeacherSubjectOptions(selectedClasses) {
    const schoolLevels = getSchoolLevelsFromClasses(selectedClasses);
    let subjects = [];
    
    if (schoolLevels.length === 0) {
        // No classes selected - show all subjects
        subjects = getJuniorSubjects().length > 0 ? getJuniorSubjects() : ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Studies'];
    } else {
        // Show subjects based on selected school levels
        if (schoolLevels.includes('junior')) {
            const juniorSubjects = getJuniorSubjects().length > 0 ? getJuniorSubjects() : ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Studies'];
            subjects = [...subjects, ...juniorSubjects];
        }
        if (schoolLevels.includes('senior')) {
            const seniorSubjects = getSeniorSubjects();
            const seniorList = [
                ...(seniorSubjects.science || []),
                ...(seniorSubjects.art || []),
                ...(seniorSubjects.commercial || []),
                ...(seniorSubjects.general || [])
            ];
            subjects = [...subjects, ...seniorList];
        }
    }
    
    // Remove duplicates and return
    subjects = [...new Set(subjects)];
    
    return subjects.map(subject => `
        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
            <input type="checkbox" name="teacher-subjects" value="${subject}" /> ${subject}
        </label>
    `).join('');
}

/**
 * Updates subject checkboxes based on selected classes
 * Called when any teacher-class checkbox is changed
 */
function updateTeacherSubjectsForClasses() {
    const classCheckboxes = document.getElementsByName('teacher-classes');
    const selectedClasses = Array.from(classCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    const subjectContainer = document.getElementById('subject-checkboxes');
    if (subjectContainer) {
        subjectContainer.innerHTML = getTeacherSubjectOptions(selectedClasses);
    }
}

// Fetch all users from API (or localStorage fallback)
async function fetchAllUsers() {
  try {
    const result = await API.admin.getUsers();
    if (result.success && result.data) {
      // Transform to app format and cache
      const users = result.data.map(u => {
        // Ensure assignedSubjects and assignedClasses are arrays if they come as strings (e.g., from PG array formatting)
        let assignedSubjects = Array.isArray(u.assignedSubjects) ? u.assignedSubjects : [];
        let assignedClasses = Array.isArray(u.assignedClasses) ? u.assignedClasses : [];
        if (typeof assignedSubjects === 'string') {
          try {
            // Try parsing as JSON array if possible
            assignedSubjects = JSON.parse(assignedSubjects);
          } catch {
            // If it's a PG array literal like {Math,Physics}, convert to array
            const str = assignedSubjects.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            assignedSubjects = str;
          }
        }
        if (typeof assignedClasses === 'string') {
          try {
            assignedClasses = JSON.parse(assignedClasses);
          } catch {
            const str = assignedClasses.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            assignedClasses = str;
          }
        }
        return {
          ...u,
          initials: u.initials || (u.name ? u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : ''),
          status: u.isSuspended ? 'inactive' : 'active',
          assignedSubjects,
          assignedClasses
        };
      });
      saveAppUsers(users);
      return users;
    }
  } catch (error) {
    console.error('[Admin] API fetch failed, using localStorage:', error.message);
  }
  // Fallback
  return getAppUsers();
}

// Fetch all subjects from API (or localStorage fallback)
async function fetchAllSubjects() {
  try {
    const result = await API.admin.getSubjects();
    if (result.success && result.data) {
      // Transform to the expected format: { junior: [], senior: { science: [], art: [], commercial: [] } }
      const subjects = result.data;
      const junior = subjects
        .filter(s => s.category === 'junior')
        .map(s => s.name);
      const senior = {
        science: subjects
          .filter(s => s.category === 'senior' && s.department === 'science')
          .map(s => s.name),
        art: subjects
          .filter(s => s.category === 'senior' && s.department === 'art')
          .map(s => s.name),
        commercial: subjects
          .filter(s => s.category === 'senior' && s.department === 'commercial')
          .map(s => s.name),
        general: subjects
          .filter(s => s.category === 'senior' && s.department === 'general')
          .map(s => s.name)
      };
      // Cache to localStorage for offline use
      saveSubjects({ junior, senior });
      return { junior, senior };
    }
  } catch (error) {
    console.error('[Admin] API fetch subjects failed, using localStorage:', error.message);
  }
  // Fallback
  return getSubjects();
}

// Audit logs localStorage helpers
function saveAuditLogs(logs) {
  if (!Array.isArray(logs)) return;
  try {
    localStorage.setItem('yep_audit_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('[Admin] Failed to save audit logs:', e.message);
  }
}

function getAuditLogs() {
  try {
    const stored = localStorage.getItem('yep_audit_logs');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[Admin] Failed to read audit logs:', e.message);
    return [];
  }
}

// Fetch all audit logs from API (or localStorage fallback)
async function fetchAllAuditLogs() {
  try {
    const result = await API.admin.getAuditLogs();
    if (result.success && result.data) {
      // Cache to localStorage for offline use
      saveAuditLogs(result.data);
      return result.data;
    }
  } catch (error) {
    console.error('[Admin] API fetch audit logs failed, using localStorage:', error.message);
  }
  // Fallback
  return getAuditLogs();
}

/* ---- INIT ---- */
(function boot() {
    UI.initTheme();

    const user = Auth.current();
    if (!user || !['admin', 'superadmin', 'principal', 'hod'].includes(user.role)) {
        window.location.href = 'index.html#login';
        return;
    }

    // Redirect superadmins to superadmin portal
    if (user.role === 'superadmin' || user.role === 'platform_admin') {
        window.location.href = 'superadmin.html';
        return;
    }

    Router.register('admin-home', renderAdminHome);
    Router.register('admin-user-management', renderAdminUserManagement);
    Router.register('admin-students', renderAdminStudents);
    Router.register('admin-teachers', renderAdminTeachers);
    Router.register('admin-subjects', renderAdminSubjects);
    Router.register('admin-classes', renderAdminClasses);
Router.register('admin-roles-permissions', renderAdminRolesPermissions);
Router.register('admin-results', renderAdminResults);
Router.register('admin-audit-logs', renderAdminAuditLogs);
Router.register('admin-settings', renderAdminSettings);

if (Auth.isLoggedIn()) {
    const waitForToken = () => {
        const token = Auth.getToken();
        if (token) {
            window.__ADMIN_SYNC_PROMISE = window.DataSync?.refreshCore().catch(error => {
                console.error('[Admin] Background data sync failed:', error?.message || error);
            });
        } else {
            setTimeout(waitForToken, 200);
        }
    };
    waitForToken();
}

Router.init();

    if (!window.location.hash) Router.go('admin-home');
})();

/* =============================================
   ADMIN DASHBOARD
   ============================================= */
async function renderAdminHome() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    
    // Fetch latest users from API
    const allUsers = await fetchAllUsers();
    
    const totalUsers = allUsers.length;
    const totalTeachers = allUsers.filter(u => u.role === 'teacher').length;
    const totalStudents = allUsers.filter(u => u.role === 'student').length;

    const isSuperAdmin = user.role === 'superadmin';

    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div style="padding: 2rem 2rem 0 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Admin Dashboard</h1>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Welcome back, ${user.name}. Here's what's happening with your platform today.</p>
          </div>
          ${isSuperAdmin ? `
          <a href="superadmin.html" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 12px; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color: white; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-crown"></i> Super Admin Portal
          </a>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--purple-bg); color: var(--purple); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Total Platform Users</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalUsers}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">No data</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>‍<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Total Teachers</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalTeachers}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Instructors & Professors</div>
              </div>
            </div>
          </div>

          <div class="stat-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background: var(--yellow-bg); color: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Total Students</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary);">${totalStudents}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Active learners</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('admin-settings')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--purple-bg); color: var(--purple); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>️</div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">System Settings</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Configure system</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('admin-subjects')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--green-bg); color: var(--green); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Subject Management</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Create and manage subjects</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('admin-user-management')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">User Management</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Add or remove users</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('admin-audit-logs')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--orange-bg); color: var(--orange); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Audit Logs</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">View system activity</div>
              </div>
            </div>
          </div>

          <div class="action-card" style="padding: 1.5rem; border-radius: 16px; background: var(--bg-card); box-shadow: var(--shadow); cursor: pointer; border: 1px solid var(--border-light);" onclick="Router.go('admin-roles-permissions')">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 52px; height: 52px; border-radius: 12px; background: var(--pink-bg); color: var(--pink); display: flex; align-items: center; justify-content: center; font-size: 1.4rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
              <div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Roles & Permissions</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Manage access controls</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('admin-home', content);
}

/* =============================================
   USER MANAGEMENT
   ============================================= */
async function renderAdminUserManagement() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    
    // Fetch latest users from API
    const allUsers = await fetchAllUsers();
    
    const users = allUsers.filter(u => !['admin', 'superadmin', 'principal', 'hod'].includes(u.role));
    
    const activeCount = users.filter(u => u.status === 'active').length;
    const pendingCount = users.filter(u => u.status === 'pending').length;
    const inactiveCount = users.filter(u => u.status === 'inactive').length;

    const userRows = users.map(u => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:36px;height:36px;border-radius:50%;background:var(--maroon-bg);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;">${u.initials || u.name.charAt(0)}</div>
                    <div>
                        <div style="font-weight:600;">${u.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${u.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-${u.role === 'teacher' ? 'info' : u.role === 'student' ? 'success' : 'warning'}">${u.role}</span></td>
            <td><span class="badge badge-${u.status === 'active' ? 'success' : u.status === 'pending' ? 'warning' : 'danger'}">${u.status || 'active'}</span></td>
            <td style="color:var(--text-muted);font-size:0.875rem;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editUser('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteUser('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">User Management</h1>
        <p class="hero-sub">Manage all user accounts in the system</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:1.5rem 0;">
        <div class="stat-card" style="padding:1.25rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--purple-bg);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Total Users</div>
              <div style="font-size:1.5rem;font-weight:800;">${users.length}</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="padding:1.25rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--success-bg);color:var(--success);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Active</div>
              <div style="font-size:1.5rem;font-weight:800;">${activeCount}</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="padding:1.25rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--warning-bg);color:var(--warning);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Pending</div>
              <div style="font-size:1.5rem;font-weight:800;">${pendingCount}</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="padding:1.25rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:48px;height:48px;border-radius:12px;background:var(--danger-bg);color:var(--danger);display:flex;align-items:center;justify-content:center;font-size:1.25rem;">×</div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted);">Inactive</div>
              <div style="font-size:1.5rem;font-weight:800;">${inactiveCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:1.1rem;font-weight:800;">All Users (${users.length})</h3>
        </div>
        <div style="padding:1rem 2rem;border-bottom:1px solid var(--border);">
          <input type="text" id="userSearch" placeholder="Search by name or email..." class="form-input" style="width:100%;padding:0.75rem 1rem;" onkeyup="filterUserTable()" />
        </div>
        <table class="teacher-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="userTableBody">
                ${userRows || '<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-muted);">No users found</td></tr>'}
            </tbody>
        </table>
      </div>
    </div>
    `;

    UI.buildPortal('admin-user-management', content);

    window.deleteUser = async function(id) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const result = await API.admin.deleteUser(id);
                if (result.success) {
                    UI.toast('User deleted successfully', 'success');
                    // Refresh the page to reflect changes
                    Router.go('admin-user-management');
                } else {
                    UI.toast('Failed to delete user: ' + (result.message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('Delete user error:', error);
                UI.toast('Error deleting user: ' + error.message, 'error');
            }
        }
    };

    window.filterUserTable = function() {
        const search = document.getElementById('userSearch').value.toLowerCase();
        const tbody = document.getElementById('userTableBody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    };
}

/* =============================================
   ADMISSION MANAGEMENT
   ============================================= */
async function renderAdminAdmission() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const admissions = getAdmissions();
    
    const subjectsData = await fetchAllSubjects();
    const juniorSubjects = subjectsData.junior || [];
    const seniorSubjects = subjectsData.senior || {};
    
    const admissionRows = admissions.map(a => `
        <tr>
            <td>${a.surname}, ${a.firstName}</td>
            <td>${a.gender}</td>
            <td>${a.dob}</td>
            <td>${a.schoolType}</td>
            <td>${a.class}</td>
            <td>${a.parentName}</td>
            <td>${a.parentPhone}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="approveAdmission('${a.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Approve</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteAdmission('${a.id}'); Router.go('admin-admission');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Admission Management</h1>
        <p class="hero-sub">Manage new student admissions and registrations</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem; padding: 2rem;">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">New Admission Form</h3>
        </div>
        
        <form id="admission-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">First Name</label>
                    <input type="text" id="adm-firstname" class="form-input" style="padding-left:1rem;" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Surname</label>
                    <input type="text" id="adm-surname" class="form-input" style="padding-left:1rem;" required />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" id="adm-dob" class="form-input" style="padding-left:1rem;" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Gender</label>
                    <select id="adm-gender" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">School Type</label>
                    <select id="adm-school-type" class="form-input" style="padding-left:1rem;" required onchange="updateAdmissionClassOptions()">
                        <option value="">Select School Type</option>
                        <option value="Junior Secondary">Junior Secondary (JSS1-JSS3)</option>
                        <option value="Senior Secondary">Senior Secondary (SS1-SS3)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Class</label>
                    <select id="adm-class" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Class</option>
                    </select>
                </div>
            </div>
            
            <div id="senior-dept-section" style="display:none; margin-top:1rem;">
                <div class="form-group">
                    <label class="form-label">Department (Senior Secondary)</label>
                    <select id="adm-department" class="form-input" style="padding-left:1rem;">
                        <option value="">Select Department</option>
                        <option value="Science">Science</option>
                        <option value="Art">Art</option>
                        <option value="Commercial">Commercial</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-top:1rem; padding:1rem; background:#F5F5F5; border-radius:8px;">
                <h4 style="margin-bottom:1rem;">Parent/Guardian Information</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Parent/Guardian Name</label>
                        <input type="text" id="adm-parent-name" class="form-input" style="padding-left:1rem;" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone Number</label>
                        <input type="tel" id="adm-parent-phone" class="form-input" style="padding-left:1rem;" required />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="adm-parent-email" class="form-input" style="padding-left:1rem;" />
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="reset" class="btn btn-ghost">Clear</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;">Submit Admission</button>
            </div>
        </form>
      </div>

      <div class="section-card" style="margin-top:2rem;">
        <div style="padding:1.5rem 2rem; border-bottom:1px solid var(--border);">
          <h3 style="font-size:1.1rem; font-weight:800;">Admission Requests (${admissions.length})</h3>
        </div>
        <table class="teacher-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>DOB</th>
                    <th>School Type</th>
                    <th>Class</th>
                    <th>Parent</th>
                    <th>Phone</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${admissionRows || '<tr><td colspan="8" style="text-align:center;padding:2rem;">No admission requests yet</td></tr>'}
            </tbody>
        </table>
      </div>
    </div>
    `;

    UI.buildPortal('admin-admission', content);
    
    window.updateAdmissionClassOptions = function() {
        const schoolType = document.getElementById('adm-school-type').value;
        const classSelect = document.getElementById('adm-class');
        const deptSection = document.getElementById('senior-dept-section');
        const allClasses = getClasses();
        
        let options = '<option value="">Select Class</option>';
        
        if (schoolType === 'Junior Secondary') {
            options += allClasses.filter(c => c.level.startsWith('JSS')).map(c => `<option value="${c.displayName}">${c.displayName}</option>`).join('');
            deptSection.style.display = 'none';
        } else if (schoolType === 'Senior Secondary') {
            options += allClasses.filter(c => c.level.startsWith('SS')).map(c => `<option value="${c.displayName}">${c.displayName}</option>`).join('');
            deptSection.style.display = 'block';
        }
        
        classSelect.innerHTML = options;
    };
    
    document.getElementById('admission-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const schoolType = document.getElementById('adm-school-type').value;
        const department = schoolType === 'Senior Secondary' ? document.getElementById('adm-department').value : '';
        
        const admission = {
            id: 'adm' + Date.now(),
            firstName: document.getElementById('adm-firstname').value,
            surname: document.getElementById('adm-surname').value,
            dob: document.getElementById('adm-dob').value,
            gender: document.getElementById('adm-gender').value,
            schoolType: schoolType,
            class: document.getElementById('adm-class').value,
            department: department,
            parentName: document.getElementById('adm-parent-name').value,
            parentPhone: document.getElementById('adm-parent-phone').value,
            parentEmail: document.getElementById('adm-parent-email').value,
            status: 'pending',
            appliedAt: new Date().toISOString()
        };
        
        addAdmission(admission);
        UI.toast('Admission submitted successfully!', 'success');
        document.getElementById('admission-form').reset();
        document.getElementById('senior-dept-section').style.display = 'none';
        Router.go('admin-admission');
    });
}

window.approveAdmission = async function(id) {
    const admissions = getAdmissions();
    const admission = admissions.find(a => a.id === id);
    if (!admission) return;
    
    const newStudent = {
        name: admission.surname + ', ' + admission.firstName,
        initials: (admission.firstName[0] || '') + (admission.surname[0] || ''),
        email: 'student' + Date.now() + '@yems.local',
        password: 'student123',
        role: 'student',
        studentId: 'YEP/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 10000),
        class: admission.class,
        session: '2025/2026',
        term: 'First Term',
        sex: admission.gender,
        admissionNo: 'YEP/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 10000)
    };
    
    try {
        const result = await API.admin.createUser(newStudent);
        if (result.success) {
            deleteAdmission(id);
            UI.toast('Student approved and registered!', 'success');
        } else {
            UI.toast('Failed to create student: ' + (result.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Approve admission error:', error);
        UI.toast('Error creating student: ' + error.message, 'error');
    }
    Router.go('admin-admission');
};

/* =============================================
   STUDENTS MANAGEMENT
   ============================================= */
async function renderAdminStudents() {
    if (!Auth.guard()) return;
    const users = (await fetchAllUsers()).filter(u => u.role === 'student');

    // Group by exact class name using dynamic class streams
    const allClassStreams = getClasses().map(c => c.displayName);
    const groupedStudents = {};
    const seenClasses = new Set();
    users.forEach(u => {
        const cls = u.class || 'Unassigned';
        if (!groupedStudents[cls]) groupedStudents[cls] = [];
        groupedStudents[cls].push(u);
        seenClasses.add(cls);
    });
    // Sort groups: defined streams first, then any extras
    const groupOrder = allClassStreams.filter(c => seenClasses.has(c));
    const extraGroups = Array.from(seenClasses).filter(c => !allClassStreams.includes(c)).sort();

    let rows = '';
    groupOrder.concat(extraGroups).forEach(className => {
        if (groupedStudents[className] && groupedStudents[className].length > 0) {
            rows += `<tr style="background:#7B1D3C; color:white;"><td colspan="7" style="font-weight:700; padding:0.75rem;">${className} (${groupedStudents[className].length} Student${groupedStudents[className].length !== 1 ? 's' : ''})</td></tr>`;
            groupedStudents[className].forEach(u => {
                rows += `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <div style="width:36px;height:36px;border-radius:50%;background:var(--maroon-bg);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;">${u.initials || u.name.charAt(0)}</div>
                                <div>
                                    <div style="font-weight:600;">${u.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">${u.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>${u.admissionNo || u.studentId || '-'}</td>
                        <td>${u.class || '-'}</td>
                        <td>${u.department || '-'}</td>
                        <td>${u.sex || '-'}</td>
                        <td>
                            <button class="btn btn-ghost btn-sm" onclick="editStudent('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️</button>
                            <button class="btn btn-ghost btn-sm" onclick="deleteStudent('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                        </td>
                    </tr>
                `;
            });
        }
    });

    if (!rows) {
        rows = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--text-muted);">No students found. Add a student to get started.</td></tr>';
    }

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Student Management</h1>
        <p class="hero-sub">View, create and manage student accounts</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem;font-weight:800;">All Students (${users.length})</h3>
            <p style="font-size:0.875rem;color:var(--text-muted);margin-top:0.25rem;">Manage student enrollments and data</p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline" onclick="downloadStudentsPDF()" style="display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>
            <button class="btn btn-primary" onclick="scrollToStudentForm()" style="background:var(--maroon);display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Student</button>
          </div>
        </div>
        
        <div style="overflow-x:auto;">
          <table class="teacher-table">
              <thead>
                  <tr>
                      <th>Student</th>
                      <th>Admission No</th>
                      <th>Class</th>
                      <th>Department</th>
                      <th>Sex</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${rows}
              </tbody>
          </table>
        </div>
      </div>

      <div class="section-card" style="margin-top:2rem; padding: 2rem;" id="student-form-section">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">Create New Student</h3>
        </div>
        <form id="student-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="student-name" class="form-input" style="padding-left:1rem;" placeholder="e.g. John Doe" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="student-email" class="form-input" style="padding-left:1rem;" placeholder="e.g. john@yems.local" required />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Admission Number</label>
                    <input type="text" id="student-admission" class="form-input" style="padding-left:1rem;" placeholder="e.g. YEP/2024/0001" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Class</label>
                    <select id="student-class" class="form-input" style="padding-left:1rem;" required onchange="toggleDepartmentField()">
                        <option value="">Select Class</option>
                        ${getClasses().map(c => `<option value="${c.displayName}">${c.displayName}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row" id="department-row" style="display:none;">
                <div class="form-group">
                    <label class="form-label">Department</label>
                    <select id="student-department" class="form-input" style="padding-left:1rem;">
                        <option value="">Select Department</option>
                        <option value="Science">Science</option>
                        <option value="Art">Art</option>
                        <option value="Commercial">Commercial</option>
                    </select>
                </div>
                <div class="form-group">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Sex</label>
                    <select id="student-sex" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="student-password" class="form-input" style="padding-left:1rem;" placeholder="Default: student123" />
                </div>
            </div>
            <input type="hidden" id="student-edit-id" value="" />
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-ghost" onclick="clearStudentForm()">Clear</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;">Save Student</button>
            </div>
        </form>
      </div>
    </div>
    `;

    UI.buildPortal('admin-students', content);

    window.scrollToStudentForm = function() {
        document.getElementById('student-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    window.editStudent = function(studentId) {
        const student = users.find(u => u.id === studentId);
        if (!student) return;

        document.getElementById('student-name').value = student.name;
        document.getElementById('student-email').value = student.email;
        document.getElementById('student-admission').value = student.admissionNo || student.studentId || '';
        document.getElementById('student-class').value = student.class || '';
        document.getElementById('student-department').value = student.department || '';
        document.getElementById('student-sex').value = student.sex || '';
        document.getElementById('student-edit-id').value = studentId;

        toggleDepartmentField();

        window.scrollTo(0, 0);
        UI.toast('Editing student...', 'info')
    };

    window.deleteStudent = async function(studentId) {
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                const result = await API.admin.deleteUser(studentId);
                if (result.success) {
                    UI.toast('Student deleted successfully', 'success');
                    Router.go('admin-students');
                } else {
                    UI.toast('Failed to delete student', 'error');
                }
            } catch (error) {
                console.error('Delete student error:', error);
                UI.toast('Error deleting student: ' + error.message, 'error');
            }
        }
    };

    window.toggleDepartmentField = function() {
        const classValue = document.getElementById('student-class').value;
        const deptRow = document.getElementById('department-row');
        if (classValue && classValue.startsWith('SS')) {
            deptRow.style.display = 'flex';
            document.getElementById('student-department').setAttribute('required', 'true');
        } else {
            deptRow.style.display = 'none';
            document.getElementById('student-department').removeAttribute('required');
            document.getElementById('student-department').value = '';
        }
    };

    window.clearStudentForm = function() {
        document.getElementById('student-form').reset();
        document.getElementById('student-edit-id').value = '';
        document.getElementById('department-row').style.display = 'none';
    };

    window.downloadStudentsPDF = function() {
        const students = getAppUsers().filter(u => u.role === 'student');
        const allClassStreams = getClasses().map(c => c.displayName);
        const groupedStudents = {};
        const seenClasses = new Set();
        students.forEach(u => {
            const cls = u.class || 'Unassigned';
            if (!groupedStudents[cls]) groupedStudents[cls] = [];
            groupedStudents[cls].push(u);
            seenClasses.add(cls);
        });
        const groupOrder = allClassStreams.filter(c => seenClasses.has(c));
        const extraGroups = Array.from(seenClasses).filter(c => !allClassStreams.includes(c)).sort();

        let content = `
            <html>
            <head>
                <title>Yeshua Educational Platform - Students List</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #7B1D3C; border-bottom: 3px solid #7B1D3C; padding-bottom: 10px; }
                    h2 { color: #7B1D3C; margin-top: 30px; }
                    h3 { color: #7B1D3C; background: #f0f0f0; padding: 10px; border-left: 4px solid #7B1D3C; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background: #7B1D3C; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Yeshua Educational Platform</h1>
                <h2>Complete Students List</h2>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Total Students:</strong> ${students.length}</p>
                
                ${groupOrder.concat(extraGroups).map(className => {
                    const classStudents = groupedStudents[className] || [];
                    if (classStudents.length === 0) return '';
                    return `
                        <h3>${escapeHtml(className)} (${classStudents.length} Students)</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student Name</th>
                                    <th>Email</th>
                                    <th>Admission No</th>
                                    <th>Department</th>
                                    <th>Sex</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${classStudents.map((s, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${escapeHtml(s.name || '')}</td>
                                        <td>${escapeHtml(s.email || '')}</td>
                                        <td>${escapeHtml(s.admissionNo || s.studentId || '-')}</td>
                                        <td>${escapeHtml(s.department || '-')}</td>
                                        <td>${escapeHtml(s.sex || '-')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }).join('')}

                <div class="footer">
                    <p><strong>Yeshua Educational Management System (YEMS)</strong></p>
                    <p>Generated on ${new Date().toLocaleString('en-NG')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.onload = function() {
            printWindow.print();
        };
    };

    // Attach event listener after a short delay to ensure DOM is ready
    setTimeout(() => {
        const studentForm = document.getElementById('student-form');
        if (studentForm) {
            studentForm.addEventListener('submit', async e => {
                e.preventDefault();

                const editId = document.getElementById('student-edit-id').value;
                const name = document.getElementById('student-name').value;
                const email = document.getElementById('student-email').value;
                const admissionNo = document.getElementById('student-admission').value;
                const className = document.getElementById('student-class').value;
                const department = document.getElementById('student-department').value;
                const sex = document.getElementById('student-sex').value;
                const password = document.getElementById('student-password').value;

                if (!name || !email || !admissionNo || !className || !sex) {
                    UI.toast('Please fill in all required fields', 'error');
                    return;
                }

                if (className.startsWith('SS') && !department) {
                    UI.toast('Please select a department for senior school students', 'error');
                    return;
                }

                const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

                if (editId) {
                    const updateData = {
                        name,
                        email,
                        admissionNo,
                        studentId: admissionNo,
                        class: className,
                        sex,
                        initials
                    };
                    if (password) {
                        updateData.password = password;
                    }
                    try {
                        const result = await API.admin.updateUser(editId, updateData);
                        if (result.success) {
                            await window.DataSync?.refreshResource('users');
                            UI.toast('Student updated successfully!', 'success');
                        } else {
                            UI.toast('Failed to update student: ' + (result.message || 'Unknown error'), 'error');
                            return;
                        }
                    } catch (error) {
                        console.error('Update student error:', error);
                        UI.toast('Error updating student: ' + error.message, 'error');
                        return;
                    }
                } else {
                    // Create student via backend API
                    const createData = {
                        name,
                        email,
                        password: password || 'student123',
                        role: 'student',
                        studentId: admissionNo,
                        admissionNo,
                        class: className,
                        sex,
                        session: '2024/2025',
                        term: 'Second Term',
                        initials
                    };
                    try {
                        const result = await API.admin.createUser(createData);
                        if (result.success) {
                            await window.DataSync?.refreshResource('users');
                            UI.toast('Student created successfully!', 'success');
                        } else {
                            UI.toast('Failed to create student: ' + (result.message || 'Unknown error'), 'error');
                            return;
                        }
                    } catch (error) {
                        console.error('Create student error:', error);
                        UI.toast('Error creating student: ' + error.message, 'error');
                        return;
                    }
                }

                clearStudentForm();
                // Re-render the student management page
                setTimeout(() => Router.go('admin-students'), 100);
            });
        }
    }, 100);
}

/* =============================================
   TEACHERS MANAGEMENT
   ============================================= */
async function renderAdminTeachers() {
    if (!Auth.guard()) return;
    const users = (await fetchAllUsers()).filter(u => u.role === 'teacher');
    
    const rows = users.map(u => {
        const assignedClasses = Array.isArray(u.assignedClasses) ? u.assignedClasses : [];
        const assignedSubjects = Array.isArray(u.assignedSubjects) ? u.assignedSubjects : [];
        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:36px;height:36px;border-radius:50%;background:var(--maroon-bg);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;">${u.initials || u.name.charAt(0)}</div>
                        <div>
                            <div style="font-weight:600;">${u.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td>${u.teacherId || '-'}</td>
                <td>${assignedSubjects.length > 0 ? `<span class="badge badge-info">${assignedSubjects.length} subjects</span>` : '-'}</td>
                <td>${assignedClasses.length > 0 ? `<span class="badge badge-success">${assignedClasses.join(', ')}</span>` : '-'}</td>
                <td>${u.isClassTeacher || u.classTeacherOf ? '<span class="badge badge-warning">Class Teacher</span>' : '<span class="badge">Teacher</span>'}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editTeacher('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteTeacher('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                </td>
            </tr>
        `;
    }).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Teacher Management</h1>
        <p class="hero-sub">Create teachers, assign subjects and classes, set class teachers</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem;font-weight:800;">All Teachers (${users.length})</h3>
            <p style="font-size:0.875rem;color:var(--text-muted);margin-top:0.25rem;">Manage teaching staff and assignments</p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline" onclick="downloadTeachersPDF()" style="display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>
            <button class="btn btn-primary" onclick="scrollToTeacherForm()" style="background:var(--maroon);display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Teacher</button>
          </div>
        </div>
        
        <div style="overflow-x:auto;">
          <table class="teacher-table">
              <thead>
                  <tr>
                      <th>Teacher</th>
                      <th>ID</th>
                      <th>Subjects</th>
                      <th>Classes</th>
                      <th>Role</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${rows || '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted);">No teachers found. Add a teacher to get started.</td></tr>'}
              </tbody>
          </table>
        </div>
      </div>

      <div class="section-card" style="margin-top:2rem; padding: 2rem;" id="teacher-form-section">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">Create New Teacher</h3>
        </div>
        <form id="teacher-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="teacher-name" class="form-input" style="padding-left:1rem;" placeholder="e.g. John Doe" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="teacher-email" class="form-input" style="padding-left:1rem;" placeholder="e.g. john@yems.local" required />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Teacher ID</label>
                    <input type="text" id="teacher-id" class="form-input" style="padding-left:1rem;" placeholder="e.g. T002" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="teacher-password" class="form-input" style="padding-left:1rem;" placeholder="Default password" required />
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Assign Subjects</label>
                <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:0.5rem;" id="subject-checkboxes">
                    ${getTeacherSubjectOptions([])}
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Assign Classes (Subjects will update based on selection)</label>
                <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:0.5rem;">
                    ${getClasses().map(c => `
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="teacher-classes" value="${c.displayName}" onchange="updateTeacherSubjectsForClasses()" /> ${c.displayName}
                    </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Assign as Class Teacher</label>
                <select id="teacher-class-teacher" class="form-input" style="padding-left:1rem;">
                    <option value="">No - Subject Teacher Only</option>
                    ${getClasses().map(c => `<option value="${c.displayName}">Class Teacher - ${c.displayName}</option>`).join('')}
                </select>
            </div>
            <input type="hidden" id="teacher-edit-id" value="" />
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
                <button type="button" class="btn btn-ghost" onclick="clearTeacherForm()">Clear</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;">Save Teacher</button>
            </div>
        </form>
      </div>
    </div>
    `;

    UI.buildPortal('admin-teachers', content);

    window.scrollToTeacherForm = function() {
        document.getElementById('teacher-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    window.getSelectedSubjects = function() {
        const checkboxes = document.getElementsByName('teacher-subjects');
        return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    };

    window.getSelectedClasses = function() {
        const checkboxes = document.getElementsByName('teacher-classes');
        return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    };

    window.editTeacher = function(teacherId) {
        const teacher = users.find(u => u.id === teacherId);
        if (!teacher) return;

        document.getElementById('teacher-name').value = teacher.name;
        document.getElementById('teacher-email').value = teacher.email;
        document.getElementById('teacher-id').value = teacher.teacherId || '';
        document.getElementById('teacher-password').value = '';
        document.getElementById('teacher-edit-id').value = teacherId;
        document.getElementById('teacher-class-teacher').value = teacher.classTeacherOf || '';

        const subjectCheckboxes = document.getElementsByName('teacher-subjects');
        subjectCheckboxes.forEach(cb => {
            cb.checked = (Array.isArray(teacher.assignedSubjects) ? teacher.assignedSubjects : []).includes(cb.value);
        });

        const classCheckboxes = document.getElementsByName('teacher-classes');
        classCheckboxes.forEach(cb => {
            cb.checked = (Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses : []).includes(cb.value);
        });

        window.scrollTo(0, 0);
        UI.toast('Editing teacher...', 'info');
    };

    window.deleteTeacher = async function(teacherId) {
        if (confirm('Are you sure you want to delete this teacher?')) {
            try {
                const result = await API.admin.deleteUser(teacherId);
                if (result.success) {
                    UI.toast('Teacher deleted successfully', 'success');
                    Router.go('admin-teachers');
                } else {
                    UI.toast('Failed to delete teacher', 'error');
                }
            } catch (error) {
                console.error('Delete teacher error:', error);
                UI.toast('Error deleting teacher: ' + error.message, 'error');
            }
        }
    };

    window.clearTeacherForm = function() {
        document.getElementById('teacher-form').reset();
        document.getElementById('teacher-edit-id').value = '';
    };

    window.downloadTeachersPDF = function() {
        const teachers = getAppUsers().filter(u => u.role === 'teacher');
        
        let content = `
            <html>
            <head>
                <title>Yeshua Educational Platform - Teachers List</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #7B1D3C; border-bottom: 3px solid #7B1D3C; padding-bottom: 10px; }
                    h2 { color: #7B1D3C; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background: #7B1D3C; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>‍<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 6h16M4 12h16m-7 6h7"/></svg> Yeshua Educational Platform</h1>
                <h2>Complete Teachers List</h2>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Total Teachers:</strong> ${teachers.length}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Teacher Name</th>
                            <th>Email</th>
                            <th>Teacher ID</th>
                            <th>Assigned Subjects</th>
                            <th>Assigned Classes</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers.length > 0 ? teachers.map((t, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${t.name}</td>
                                <td>${t.email}</td>
                                <td>${t.teacherId || '-'}</td>
                                <td>${(Array.isArray(t.assignedSubjects) ? t.assignedSubjects : []).join(', ') || '-'}</td>
                                <td>${(Array.isArray(t.assignedClasses) ? t.assignedClasses : []).join(', ') || '-'}</td>
                                <td>${t.classTeacherOf ? 'Class Teacher (' + t.classTeacherOf + ')' : 'Subject Teacher'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="7" style="text-align:center;">No teachers added yet.</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    <p><strong>Yeshua Educational Management System (YEMS)</strong></p>
                    <p>Generated on ${new Date().toLocaleString('en-NG')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.onload = function() {
            printWindow.print();
        };
    };

    document.getElementById('teacher-form').addEventListener('submit', async e => {
        e.preventDefault();
        
        const editId = document.getElementById('teacher-edit-id').value;
        const name = document.getElementById('teacher-name').value;
        const email = document.getElementById('teacher-email').value;
        const teacherId = document.getElementById('teacher-id').value;
        const password = document.getElementById('teacher-password').value || 'teacher123';
        const classTeacherOf = document.getElementById('teacher-class-teacher').value;
        const assignedSubjects = getSelectedSubjects();
        const assignedClasses = getSelectedClasses();
        
        if (!name || !email || !teacherId) {
            UI.toast('Please fill in all required fields', 'error');
            return;
        }

        const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
        
        if (editId) {
            // Update via backend API
            const updateData = {
                name,
                email,
                teacherId,
                assignedSubjects,
                assignedClasses,
                isClassTeacher: !!classTeacherOf,
                classTeacherOf: classTeacherOf || null,
                initials
            };
            
            // Only include password if a new one was provided
            if (password) {
                updateData.password = password;
            }
            
try {
                    const result = await API.admin.updateUser(editId, updateData);
                    if (result.success) {
                        await window.DataSync?.refreshResource('users');
                        UI.toast('Teacher updated successfully!', 'success');
                    } else {
                        UI.toast('Failed to update teacher: ' + (result.message || 'Unknown error'), 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Update teacher error:', error);
                    UI.toast('Error updating teacher: ' + error.message, 'error');
                    return;
                }
        } else {
            const existingTeacher = users.find(u => u.email === email || u.teacherId === teacherId);
            if (existingTeacher) {
                UI.toast('Teacher with this email or ID already exists', 'error');
                return;
            }
            
            // Create teacher via backend API
            const createData = {
                name,
                email,
                password,
                role: 'teacher',
                teacherId,
                assignedSubjects,
                assignedClasses,
                isClassTeacher: !!classTeacherOf,
                classTeacherOf,
                session: '2024/2025',
                term: 'Second Term',
                initials
            };
            try {
                const result = await API.admin.createUser(createData);
                if (result.success) {
                    UI.toast('Teacher created successfully!', 'success');
                } else {
                    UI.toast('Failed to create teacher: ' + (result.message || 'Unknown error'), 'error');
                    return;
                }
            } catch (error) {
                console.error('Create teacher error:', error);
                UI.toast('Error creating teacher: ' + error.message, 'error');
                return;
            }
        }
        
        clearTeacherForm();
        Router.go('admin-teachers');
    });
}

/* =============================================
   SUBJECTS MANAGEMENT
   ============================================= */
async function renderAdminSubjects() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const subjectsData = await fetchAllSubjects();
    
    // Migration: Fix old data format if needed
    if (!subjectsData.junior) subjectsData.junior = [];
    if (!subjectsData.senior) subjectsData.senior = { science: [], art: [], commercial: [], general: [] };
    if (!subjectsData.senior.science) subjectsData.senior.science = [];
    if (!subjectsData.senior.art) subjectsData.senior.art = [];
    if (!subjectsData.senior.commercial) subjectsData.senior.commercial = [];
    if (!subjectsData.senior.general) subjectsData.senior.general = [];
    saveSubjects(subjectsData);
    
    const juniorSubjects = subjectsData.junior || [];
    const seniorSubjects = subjectsData.senior || {};
    const teachers = (await fetchAllUsers()).filter(u => u.role === 'teacher');

    console.log('Subjects Data:', subjectsData);
    console.log('Junior Subjects:', juniorSubjects);
    console.log('Senior Subjects:', seniorSubjects);

    // Build subject rows for all categories
    let subjectRows = '';
    
    // Junior subjects
    if (juniorSubjects.length > 0) {
        juniorSubjects.forEach((s, i) => {
            subjectRows += `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <div style="width:40px;height:40px;border-radius:8px;background:var(--purple-bg);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
                            <div>
                                <div style="font-weight:600;">${s}</div>
                                <div style="font-size:0.75rem;color:var(--text-muted);">Junior Secondary</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-info">JSS</span></td>
                    <td><span class="badge badge-success">active</span></td>
                    <td style="color:var(--text-muted);font-size:0.875rem;">-</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="deleteJuniorSubject('${s}'); Router.go('admin-subjects');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                    </td>
                </tr>
            `;
        });
    }
    
    // Senior subjects by department
    ['science', 'art', 'commercial', 'general'].forEach(dept => {
        if (seniorSubjects[dept] && seniorSubjects[dept].length > 0) {
            seniorSubjects[dept].forEach((s, i) => {
                subjectRows += `
                    <tr>
                        <td>
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <div style="width:40px;height:40px;border-radius:8px;background:var(--purple-bg);color:var(--purple);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
                                <div>
                                    <div style="font-weight:600;">${s}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">Senior Secondary - ${dept.charAt(0).toUpperCase() + dept.slice(1)}</div>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-info">SS</span></td>
                    <td><span class="badge badge-success">active</span></td>
                    <td style="color:var(--text-muted);font-size:0.875rem;">${dept.charAt(0).toUpperCase() + dept.slice(1)}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="deleteSeniorSubject('${s}', '${dept}'); Router.go('admin-subjects');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                    </td>
                </tr>
                `;
            });
        }
    });

    if (!subjectRows) {
        subjectRows = '<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-muted);">No subjects found. Add subjects to get started.</td></tr>';
    }

    const totalSubjects = juniorSubjects.length + (seniorSubjects.science?.length || 0) + (seniorSubjects.art?.length || 0) + (seniorSubjects.commercial?.length || 0) + (seniorSubjects.general?.length || 0);

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Subject Management</h1>
        <p class="hero-sub">Create and manage subjects for your institution</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem;font-weight:800;">All Subjects (${totalSubjects})</h3>
            <p style="font-size:0.875rem;color:var(--text-muted);margin-top:0.25rem;">Junior: ${juniorSubjects.length} | Senior Science: ${seniorSubjects.science?.length || 0} | Art: ${seniorSubjects.art?.length || 0} | Commercial: ${seniorSubjects.commercial?.length || 0} | General: ${seniorSubjects.general?.length || 0}</p>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-outline" onclick="downloadSubjectsPDF()" style="display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF</button>
            <button class="btn btn-primary" onclick="openAddSubjectModal()" style="background:var(--maroon);display:flex;align-items:center;gap:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Subject</button>
          </div>
        </div>
        <div style="padding:1rem 2rem;border-bottom:1px solid var(--border);">
          <input type="text" id="subjectSearch" placeholder="Search subjects..." class="form-input" style="width:100%;padding:0.75rem 1rem;" onkeyup="filterSubjectTable()" />
        </div>
        <div style="overflow-x:auto;">
          <table class="teacher-table">
              <thead>
                  <tr>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody id="subjectTableBody">
                  ${subjectRows}
              </tbody>
          </table>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('admin-subjects', content);

    window.openAddSubjectModal = function() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:var(--bg-card);border-radius:16px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <h2 style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin:0;">Add New Subject</h2>
                    <button onclick="this.closest('.modal-overlay')?.remove()" style="background:none;border:none;font-size:1.5rem;color:var(--text-muted);cursor:pointer;">×</button>
                </div>
                <div style="padding:2rem;">
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;font-size:0.875rem;font-weight:700;color:var(--text-sec);margin-bottom:0.5rem;">School Type</label>
                        <select id="subjectSchoolType" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);" required onchange="toggleSubjectDeptField()">
                            <option value="">Select Type</option>
                            <option value="junior">Junior Secondary (JSS)</option>
                            <option value="senior">Senior Secondary (SS)</option>
                        </select>
                    </div>
                    <div id="subjectDeptGroup" style="display:none;margin-bottom:1.5rem;">
                        <label style="display:block;font-size:0.875rem;font-weight:700;color:var(--text-sec);margin-bottom:0.5rem;">Department</label>
                        <select id="subjectDept" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);">
                            <option value="science">Science</option>
                            <option value="art">Art</option>
                            <option value="commercial">Commercial</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;font-size:0.875rem;font-weight:700;color:var(--text-sec);margin-bottom:0.5rem;">Subject Name</label>
                        <input type="text" id="subjectNameInput" placeholder="e.g., Mathematics" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);" required />
                    </div>
                </div>
                <div style="padding:1.5rem 2rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button onclick="this.closest('.modal-overlay')?.remove()" style="padding:0.75rem 1.5rem;border-radius:8px;background:var(--bg-card2);color:var(--text-primary);border:1px solid var(--border);font-weight:700;cursor:pointer;">Cancel</button>
                    <button onclick="saveNewSubject()" style="padding:0.75rem 1.5rem;border-radius:8px;background:linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%);color:white;border:none;font-weight:700;cursor:pointer;">Save Subject</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.toggleSubjectDeptField = function() {
        const schoolType = document.getElementById('subjectSchoolType').value;
        const deptGroup = document.getElementById('subjectDeptGroup');
        if (schoolType === 'senior') {
            deptGroup.style.display = 'block';
        } else {
            deptGroup.style.display = 'none';
        }
    };

    window.saveNewSubject = function() {
        const schoolType = document.getElementById('subjectSchoolType').value;
        const subjectName = document.getElementById('subjectNameInput').value.trim();

        if (!subjectName) {
            UI.toast('Please enter a subject name', 'error');
            return;
        }

        if (schoolType === 'junior') {
            addJuniorSubject(subjectName);
            UI.toast('Junior subject added successfully!', 'success');
        } else if (schoolType === 'senior') {
            const department = document.getElementById('subjectDept').value;
            addSeniorSubject(subjectName, department);
            UI.toast('Senior subject added successfully!', 'success');
        }

        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        Router.go('admin-subjects');
    };

    window.filterSubjectTable = function() {
        const search = document.getElementById('subjectSearch').value.toLowerCase();
        const tbody = document.getElementById('subjectTableBody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    };

    window.downloadSubjectsPDF = function() {
        const subjectsData = getSubjects();
        const juniorSubjects = subjectsData.junior || [];
        const seniorSubjects = subjectsData.senior || {};
    const totalSubjects = juniorSubjects.length + (seniorSubjects.science?.length || 0) + (seniorSubjects.art?.length || 0) + (seniorSubjects.commercial?.length || 0) + (seniorSubjects.general?.length || 0);

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Subjects List - YEMS</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; background: #fff; }
                    h1 { color: #7B1D3C; border-bottom: 3px solid #7B1D3C; padding-bottom: 10px; }
                    h2 { color: #7B1D3C; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background: #7B1D3C; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                    .count { background: #7B1D3C; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> Yeshua Educational Platform</h1>
                <h2>Complete Subjects List</h2>
                <p><strong>Total Subjects:</strong> <span class="count">${totalSubjects}</span> | <strong>Generated:</strong> ${new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

                <h2>Junior Secondary Subjects (${juniorSubjects.length})</h2>
                <table>
                    <thead><tr><th>#</th><th>Subject Name</th></tr></thead>
                    <tbody>
                        ${juniorSubjects.length > 0 ? juniorSubjects.map((s, i) => `<tr><td>${i + 1}</td><td>${s}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;">No junior subjects added yet.</td></tr>'}
                    </tbody>
                </table>

                <h2>Senior Secondary - Science (${seniorSubjects.science?.length || 0})</h2>
                <table>
                    <thead><tr><th>#</th><th>Subject Name</th></tr></thead>
                    <tbody>
                        ${(seniorSubjects.science?.length || 0) > 0 ? seniorSubjects.science.map((s, i) => `<tr><td>${i + 1}</td><td>${s}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;">No science subjects added yet.</td></tr>'}
                    </tbody>
                </table>

                <h2>Senior Secondary - Art (${seniorSubjects.art?.length || 0})</h2>
                <table>
                    <thead><tr><th>#</th><th>Subject Name</th></tr></thead>
                    <tbody>
                        ${(seniorSubjects.art?.length || 0) > 0 ? seniorSubjects.art.map((s, i) => `<tr><td>${i + 1}</td><td>${s}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;">No art subjects added yet.</td></tr>'}
                    </tbody>
                </table>

                <h2>Senior Secondary - Commercial (${seniorSubjects.commercial?.length || 0})</h2>
                <table>
                    <thead><tr><th>#</th><th>Subject Name</th></tr></thead>
                    <tbody>
                        ${(seniorSubjects.commercial?.length || 0) > 0 ? seniorSubjects.commercial.map((s, i) => `<tr><td>${i + 1}</td><td>${s}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;">No commercial subjects added yet.</td></tr>'}
                    </tbody>
                </table>

                <h2>Senior Secondary - General (${seniorSubjects.general?.length || 0})</h2>
                <table>
                    <thead><tr><th>#</th><th>Subject Name</th></tr></thead>
                    <tbody>
                        ${(seniorSubjects.general?.length || 0) > 0 ? seniorSubjects.general.map((s, i) => `<tr><td>${i + 1}</td><td>${s}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;">No general subjects added yet.</td></tr>'}
                    </tbody>
                </table>

                <div class="footer">
                    <p><strong>Yeshua Educational Management System (YEMS)</strong></p>
                    <p>Generated on ${new Date().toLocaleString('en-NG')}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };

    window.deleteJuniorSubject = async function(subject) {
        try {
            const result = await API.subjects.getAll();
            const allSubjects = Array.isArray(result.data) ? result.data : [];
            const subjectToDelete = allSubjects.find(
                s => s && s.category === 'junior' && (s.name === subject || s === subject)
            );
            if (subjectToDelete?.id) {
                await API.subjects.delete(subjectToDelete.id);
                await window.DataSync?.refreshResource('subjects').catch(() => {});
            }
            UI.toast('Subject deleted successfully!', 'success');
            Router.go('admin-subjects');
        } catch (error) {
            console.error('Failed to delete junior subject:', error);
            UI.toast('Failed to delete subject: ' + (error.message || 'Unknown error'), 'error');
        }
    };

    window.deleteSeniorSubject = async function(subject, department) {
        try {
            const result = await API.subjects.getAll();
            const allSubjects = Array.isArray(result.data) ? result.data : [];
            const subjectToDelete = allSubjects.find(
                s => s &&
                    s.category === 'senior' &&
                    s.department === department &&
                    (s.name === subject || s === subject)
            );
            if (subjectToDelete?.id) {
                await API.subjects.delete(subjectToDelete.id);
                await window.DataSync?.refreshResource('subjects').catch(() => {});
            }
            UI.toast('Subject deleted successfully!', 'success');
            Router.go('admin-subjects');
        } catch (error) {
            console.error('Failed to delete senior subject:', error);
            UI.toast('Failed to delete subject: ' + (error.message || 'Unknown error'), 'error');
        }
    };
}

/* =============================================
   ROLES & PERMISSIONS
   ============================================= */
async function renderAdminRolesPermissions() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const allUsers = await fetchAllUsers();

    const roles = [
        { name: 'Admin', desc: 'Full system access', users: allUsers.filter(u => u.role === 'admin').length, perms: 'All permissions' },
        { name: 'Teacher', desc: 'Teaching and assessment', users: allUsers.filter(u => u.role === 'teacher').length, perms: 'Notes, Assignments, Exams, Results' },
        { name: 'Student', desc: 'Learning and assessments', users: allUsers.filter(u => u.role === 'student').length, perms: 'View notes, Submit assignments, Take exams' },
        { name: 'Principal', desc: 'School administration', users: allUsers.filter(u => u.role === 'principal').length, perms: 'View all, Approve schemes' },
        { name: 'HOD', desc: 'Department head', users: allUsers.filter(u => u.role === 'hod').length, perms: 'Department management' },
    ];

    const roleRows = roles.map(r => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:40px;height:40px;border-radius:8px;background:var(--maroon-bg);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-size:1.25rem;"></div>
                    <div>
                        <div style="font-weight:600;">${r.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${r.desc}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-primary">${r.users} users</span></td>
            <td style="color:var(--text-muted);font-size:0.875rem;max-width:300px;">${r.perms}</td>
            <td>
                <button class="btn btn-ghost btn-sm"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Roles & Permissions</h1>
        <p class="hero-sub">Manage user roles and system permissions</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);">
          <h3 style="font-size:1.1rem;font-weight:800;">System Roles</h3>
        </div>
        <table class="teacher-table">
            <thead>
                <tr>
                    <th>Role</th>
                    <th>Users</th>
                    <th>Permissions</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="rolesTableBody">
                ${roleRows || '<tr><td colspan="4" style="text-align:center;padding:3rem;color:var(--text-muted);">No roles found</td></tr>'}
            </tbody>
        </table>
      </div>
    </div>
    `;

    UI.buildPortal('admin-roles-permissions', content);
}

/* =============================================
   AUDIT LOGS
   ============================================= */
async function renderAdminAuditLogs() {
    if (!Auth.guard()) return;
    const user = Auth.current();

    const logs = await fetchAllAuditLogs();

    const logRows = logs.map(log => `
        <tr>
            <td style="font-family:monospace;font-size:0.875rem;">${log.timestamp}</td>
            <td>${log.userEmail || log.user}</td>
            <td><span class="badge badge-${log.action === 'login' ? 'success' : log.action === 'create' ? 'info' : log.action === 'update' ? 'warning' : log.action === 'delete' ? 'danger' : 'secondary'}">${log.action}</span></td>
            <td style="color:var(--text-muted);font-size:0.875rem;">${log.details}</td>
            <td style="font-family:monospace;font-size:0.75rem;color:var(--text-muted);">${log.ipAddress || '-'}</td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Audit Logs</h1>
        <p class="hero-sub">System activity and user actions log</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:1.1rem;font-weight:800;">System Logs</h3>
          <div style="display:flex;gap:0.5rem;">
            <select class="form-input" style="padding:0.5rem 1rem;">
                <option>All Types</option>
                <option>Login</option>
                <option>Create</option>
                <option>Update</option>
                <option>Delete</option>
            </select>
            <button class="btn btn-outline">Export</button>
          </div>
        </div>
        <div style="padding:1rem 2rem;border-bottom:1px solid var(--border);">
          <input type="text" id="logSearch" placeholder="Search logs..." class="form-input" style="width:100%;padding:0.75rem 1rem;" onkeyup="filterLogTable()" />
        </div>
        <table class="teacher-table">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>IP Address</th>
                </tr>
            </thead>
            <tbody id="logTableBody">
                ${logRows || '<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--text-muted);">No audit logs found</td></tr>'}
            </tbody>
        </table>
      </div>
    </div>
    `;

    UI.buildPortal('admin-audit-logs', content);

    window.filterLogTable = function() {
        const search = document.getElementById('logSearch').value.toLowerCase();
        const tbody = document.getElementById('logTableBody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    };
}

/* =============================================
   ADMIN SETTINGS
   ============================================= */
async function renderAdminSettings() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const allUsers = await fetchAllUsers();
    const currentSession = allUsers[0]?.session || '2024/2025';
    const currentTerm = allUsers[0]?.term || 'Second Term';
    const subjectsData = await fetchAllSubjects();
    const juniorSubjects = subjectsData.junior || [];
    const seniorSubjects = subjectsData.senior || {};
    
    const adminUsers = allUsers.filter(u => ['admin', 'superadmin', 'principal', 'hod'].includes(u.role));
    
    const adminRows = adminUsers.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><span class="badge" style="background:#E3F2FD; color:#1565C0;">${u.role.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="editAdminUser('${u.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Admin Settings</h1>
        <p class="hero-sub">Platform configuration, role management, and academic settings</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem; padding: 2rem;">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">Create Admin/Principal/HOD</h3>
        </div>
        <form id="admin-user-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="admin-name" class="form-input" style="padding-left:1rem;" placeholder="e.g. John Smith" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="admin-email" class="form-input" style="padding-left:1rem;" placeholder="e.g. john@yems.local" required />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select id="admin-role" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Role</option>
                        <option value="superadmin">Super Admin</option>
                        <option value="principal">Principal</option>
                        <option value="hod">Head of Department (HOD)</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="admin-password" class="form-input" style="padding-left:1rem;" placeholder="Default: admin123" />
                </div>
            </div>
            <input type="hidden" id="admin-edit-id" value="" />
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-ghost" onclick="clearAdminUserForm()">Clear</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;">Save User</button>
            </div>
        </form>
      </div>

      <div class="section-card" style="margin-top:2rem;">
        <div style="padding:1.5rem 2rem; border-bottom:1px solid var(--border);">
          <h3 style="font-size:1.1rem; font-weight:800;">Admin Users (${adminUsers.length})</h3>
        </div>
        <table class="teacher-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${adminRows || '<tr><td colspan="4" style="text-align:center;padding:2rem;">No admin users yet</td></tr>'}
            </tbody>
        </table>
      </div>

      <div class="section-card" style="margin-top:2rem; padding: 2rem;">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>️</span>
          <h3 style="font-size:1.1rem; font-weight:800;">Academic Settings</h3>
        </div>
        <form id="academic-settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Current Session</label>
                    <select id="academic-session" class="form-input" style="padding-left:1rem;">
                        <option value="2024/2025" ${currentSession === '2024/2025' ? 'selected' : ''}>2024/2025</option>
                        <option value="2025/2026" ${currentSession === '2025/2026' ? 'selected' : ''}>2025/2026</option>
                        <option value="2026/2027" ${currentSession === '2026/2027' ? 'selected' : ''}>2026/2027</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Current Term</label>
                    <select id="academic-term" class="form-input" style="padding-left:1rem;">
                        <option value="First Term" ${currentTerm === 'First Term' ? 'selected' : ''}>First Term</option>
                        <option value="Second Term" ${currentTerm === 'Second Term' ? 'selected' : ''}>Second Term</option>
                        <option value="Third Term" ${currentTerm === 'Third Term' ? 'selected' : ''}>Third Term</option>
                    </select>
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
                <button type="submit" class="btn btn-primary" style="background:#1565C0;">Update Academic Settings</button>
            </div>
        </form>
      </div>

      <div class="section-card" style="margin-top:2rem; padding: 2rem;">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">Subject Management</h3>
        </div>
        
        <div style="margin-bottom:2rem;">
            <h4 style="font-size:1rem; font-weight:700; margin-bottom:1rem; color:#7B1D3C;">Junior Secondary School (JSS)</h4>
            <form id="junior-subject-form">
                <div class="form-row">
                    <div class="form-group" style="flex:1;">
                        <input type="text" id="new-junior-subject" class="form-input" style="padding-left:1rem;" placeholder="Add Junior subject" />
                    </div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <button type="submit" class="btn btn-primary" style="background:#1565C0; height:42px;">Add</button>
                    </div>
                </div>
            </form>
            <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1rem;">
                ${getJuniorSubjects().map(subject => `
                <span style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; background:#E3F2FD; border-radius:8px; font-size:0.9rem;">
                    ${subject}
                    <button type="button" onclick="deleteJuniorSubject('${subject}'); Router.go('admin-settings');" style="background:none; border:none; cursor:pointer; color:#DC2626; font-size:1rem;">&times;</button>
                </span>
                `).join('')}
            </div>
        </div>
        
        <div style="border-top:2px dashed var(--border); padding-top:2rem;">
            <h4 style="font-size:1rem; font-weight:700; margin-bottom:1rem; color:#7B1D3C;">Senior Secondary School (SSS)</h4>
            
            <div style="margin-bottom:1.5rem;">
                <h5 style="font-size:0.9rem; font-weight:600; margin-bottom:0.75rem; color:#2E7D32;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4.5 3h15"/><path d="M6 3h12"/><path d="M6 8h12"/><path d="M6 21v-5"/><path d="M18 21v-5"/><path d="M6 13h12"/></svg> Science Department</h5>
                <form class="senior-subject-form" data-dept="science">
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <input type="text" class="form-input new-senior-subject" data-dept="science" style="padding-left:1rem;" placeholder="Add Science subject" />
                        </div>
                        <div class="form-group" style="display:flex; align-items:flex-end;">
                            <button type="button" class="btn btn-primary add-senior-subject" data-dept="science" style="background:#2E7D32; height:42px;">Add</button>
                        </div>
                    </div>
                </form>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                    ${(seniorSubjects.science || []).map(subject => `
                    <span style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.8rem; background:#E8F5E9; border-radius:8px; font-size:0.85rem;">
                        ${subject}
                        <button type="button" onclick="deleteSeniorSubject('${subject}', 'science'); Router.go('admin-settings');" style="background:none; border:none; cursor:pointer; color:#DC2626; font-size:1rem;">&times;</button>
                    </span>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom:1.5rem;">
                <h5 style="font-size:0.9rem; font-weight:600; margin-bottom:0.75rem; color:#7B1D3C;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 2a10 10 0 0 0-6.88 16.88L12 22l6.88-6.88A10 10 0 0 0 12 2z"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="8" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="12" cy="14" r="1.5"/></svg> Art Department</h5>
                <form class="senior-subject-form" data-dept="art">
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <input type="text" class="form-input new-senior-subject" data-dept="art" style="padding-left:1rem;" placeholder="Add Art subject" />
                        </div>
                        <div class="form-group" style="display:flex; align-items:flex-end;">
                            <button type="button" class="btn btn-primary add-senior-subject" data-dept="art" style="background:#7B1D3C; height:42px;">Add</button>
                        </div>
                    </div>
                </form>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                    ${(seniorSubjects.art || []).map(subject => `
                    <span style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.8rem; background:#FCE4EC; border-radius:8px; font-size:0.85rem;">
                        ${subject}
                        <button type="button" onclick="deleteSeniorSubject('${subject}', 'art'); Router.go('admin-settings');" style="background:none; border:none; cursor:pointer; color:#DC2626; font-size:1rem;">&times;</button>
                    </span>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <h5 style="font-size:0.9rem; font-weight:600; margin-bottom:0.75rem; color:#F59E0B;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Commercial Department</h5>
                <form class="senior-subject-form" data-dept="commercial">
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <input type="text" class="form-input new-senior-subject" data-dept="commercial" style="padding-left:1rem;" placeholder="Add Commercial subject" />
                        </div>
                        <div class="form-group" style="display:flex; align-items:flex-end;">
                            <button type="button" class="btn btn-primary add-senior-subject" data-dept="commercial" style="background:#F59E0B; height:42px;">Add</button>
                        </div>
                    </div>
                </form>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                    ${(seniorSubjects.commercial || []).map(subject => `
                    <span style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.8rem; background:#FFF3E0; border-radius:8px; font-size:0.85rem;">
                        ${subject}
                        <button type="button" onclick="deleteSeniorSubject('${subject}', 'commercial'); Router.go('admin-settings');" style="background:none; border:none; cursor:pointer; color:#DC2626; font-size:1rem;">&times;</button>
                    </span>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top:1.5rem;">
                <h5 style="font-size:0.9rem; font-weight:600; margin-bottom:0.75rem; color:#6B7280;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> General Subjects (All Senior Students)</h5>
                <form class="senior-subject-form" data-dept="general">
                    <div class="form-row">
                        <div class="form-group" style="flex:1;">
                            <input type="text" class="form-input new-senior-subject" data-dept="general" style="padding-left:1rem;" placeholder="Add General subject" />
                        </div>
                        <div class="form-group" style="display:flex; align-items:flex-end;">
                            <button type="button" class="btn btn-primary add-senior-subject" data-dept="general" style="background:#6B7280; height:42px;">Add</button>
                        </div>
                    </div>
                </form>
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.75rem;">
                    ${(seniorSubjects.general || []).map(subject => `
                    <span style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.4rem 0.8rem; background:#F3F4F6; border-radius:8px; font-size:0.85rem;">
                        ${subject}
                        <button type="button" onclick="deleteSeniorSubject('${subject}', 'general'); Router.go('admin-settings');" style="background:none; border:none; cursor:pointer; color:#DC2626; font-size:1rem;">&times;</button>
                    </span>
                    `).join('')}
                </div>
            </div>
        </div>
      </div>

      <div class="section-card" style="margin-top:2rem;">
        <div style="padding:1.5rem 2rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1.1rem; font-weight:800;">Reports & Issues (${getReports().length})</h3>
          <button class="btn btn-ghost btn-sm" onclick="Router.go('admin-settings')">Refresh</button>
        </div>
        <div style="max-height:400px; overflow-y:auto;">
          ${getReports().length > 0 ? getReports().map(r => `
            <div style="padding:1rem 2rem; border-bottom:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
                <div>
                  <strong>${r.userName}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">(${r.userRole})</span>
                  <span style="background:${r.read ? '#E8F5E9' : '#FFF3E0'}; color:${r.read ? '#2E7D32' : '#B87A00'}; padding:0.15rem 0.5rem; border-radius:4px; font-size:0.7rem; margin-left:0.5rem;">${r.read ? 'Read' : 'New'}</span>
                </div>
                <span style="font-size:0.75rem; color:var(--text-muted);">${r.date}</span>
              </div>
              <div style="font-size:0.75rem; color:#F59E0B; margin-bottom:0.25rem;">${r.category}</div>
              <p style="margin:0; font-size:0.85rem; color:var(--text-sec);">${r.description}</p>
              <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                <button class="btn btn-ghost btn-sm" onclick="markReportRead('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Mark as Read</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteReport('${r.id}'); Router.go('admin-settings');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Delete</button>
              </div>
            </div>
          `).join('') : '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No reports yet</div>'}
        </div>
      </div>

      <div class="section-card" style="margin-top:2rem;">
        <div class="section-header">
           <h3>Platform Information</h3>
        </div>
        <div style="padding:1rem 0;">
           <div class="form-group">
                <label class="form-label">Admin Name</label>
                <input type="text" class="form-input" value="${user.name}" style="padding-left:1rem;" readonly />
           </div>
           <div class="form-group">
               <label class="form-label">Email Address</label>
               <input type="email" class="form-input" value="${user.email}" style="padding-left:1rem;" readonly />
           </div>
           <div class="form-group">
               <label class="form-label">Role</label>
               <input type="text" class="form-input" value="${user.role.toUpperCase()}" style="padding-left:1rem;" readonly />
           </div>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('admin-settings', content);

    window.editAdminUser = function(userId) {
        const editUser = adminUsers.find(u => u.id === userId);
        if (!editUser) return;
        
        document.getElementById('admin-name').value = editUser.name;
        document.getElementById('admin-email').value = editUser.email;
        document.getElementById('admin-role').value = editUser.role;
        document.getElementById('admin-edit-id').value = userId;
        
        window.scrollTo(0, 0);
        UI.toast('Editing admin user...', 'info');
    };

    window.clearAdminUserForm = function() {
        document.getElementById('admin-user-form').reset();
        document.getElementById('admin-edit-id').value = '';
    };

    document.getElementById('admin-user-form').addEventListener('submit', async e => {
        e.preventDefault();
        
        const editId = document.getElementById('admin-edit-id').value;
        const name = document.getElementById('admin-name').value;
        const email = document.getElementById('admin-email').value;
        const role = document.getElementById('admin-role').value;
        const password = document.getElementById('admin-password').value || 'admin123';
        
        if (!name || !email || !role) {
            UI.toast('Please fill in all required fields', 'error');
            return;
        }

        const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
        
            if (editId) {
                const updateData = { name, email, role };
                
                try {
                    const result = await API.admin.updateUser(editId, updateData);
                    if (result.success) {
                        await window.DataSync?.refreshResource('users');
                        UI.toast('User updated successfully!', 'success');
                    } else {
                        UI.toast('Failed to update user: ' + (result.message || 'Unknown error'), 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Update admin user error:', error);
                    UI.toast('Error updating user: ' + error.message, 'error');
                    return;
                }
            } else {
            const existingUser = adminUsers.find(u => u.email === email);
            if (existingUser) {
                UI.toast('User with this email already exists', 'error');
                return;
            }
            
            // Create admin/principal/HOD via backend API
            const createData = {
                name,
                email,
                password,
                role,
                initials,
                // For admin roles, set specific IDs
                ...(role === 'admin' && { adminId: 'A' + Date.now() }),
                ...(role === 'principal' && { adminId: 'P' + Date.now() }),
                ...(role === 'hod' && { adminId: 'H' + Date.now() }),
                session: '2024/2025',
                term: 'Second Term'
            };
            try {
                const result = await API.admin.createUser(createData);
                if (result.success) {
                    UI.toast('User created successfully!', 'success');
                } else {
                    UI.toast('Failed to create user: ' + (result.message || 'Unknown error'), 'error');
                    return;
                }
            } catch (error) {
                console.error('Create admin user error:', error);
                UI.toast('Error creating user: ' + error.message, 'error');
                return;
            }
        }
        
        clearAdminUserForm();
        Router.go('admin-settings');
    });

    document.getElementById('academic-settings-form').addEventListener('submit', e => {
        e.preventDefault();
        
        const newSession = document.getElementById('academic-session').value;
        const newTerm = document.getElementById('academic-term').value;
        
        const allUsersList = getAppUsers();
        allUsersList.forEach(u => {
            u.session = newSession;
            u.term = newTerm;
        });
        saveAppUsers(allUsersList);
        
        UI.toast('Academic settings updated for all users!', 'success');
        Router.go('admin-settings');
    });

    window.deleteSubject = async function(subject) {
        if (!confirm(`Delete "${subject}" from subjects?`)) return;
        
        try {
            // First, find the subject ID from the cached full data
            const result = await API.admin.getSubjects();
            if (result.success && result.data) {
                const subjectData = result.data.find(s => s.name === subject);
                if (subjectData && subjectData.id) {
                    // Delete from backend
                    await API.subjects.delete(subjectData.id);
                }
            }
        } catch (error) {
            console.error('[Admin] API delete failed, deleting locally:', error.message);
        }
        
        // Always update localStorage for immediate feedback
        const subjects = getSubjects().filter(s => s !== subject);
        saveSubjects(subjects);
        
        UI.toast('Subject deleted!', 'success');
        Router.go('admin-settings');
    };

    document.getElementById('junior-subject-form').addEventListener('submit', e => {
        e.preventDefault();
        const newSubject = document.getElementById('new-junior-subject').value.trim();
        if (!newSubject) {
            UI.toast('Please enter a subject name', 'error');
            return;
        }
        addJuniorSubject(newSubject);
        document.getElementById('new-junior-subject').value = '';
        UI.toast('Junior subject added!', 'success');
        Router.go('admin-settings');
    });
    
    document.querySelectorAll('.add-senior-subject').forEach(btn => {
        btn.addEventListener('click', function() {
            const dept = this.dataset.dept;
            const input = document.querySelector(`.new-senior-subject[data-dept="${dept}"]`);
            const newSubject = input.value.trim();
            if (!newSubject) {
                UI.toast('Please enter a subject name', 'error');
                return;
            }
            addSeniorSubject(newSubject, dept);
            input.value = '';
            UI.toast('Senior subject added to ' + dept + '!', 'success');
            Router.go('admin-settings');
        });
    });
}

async function renderAdminResults() {
    if (!Auth.guard()) return;
    const users = await fetchAllUsers();
    const students = users.filter(u => u.role === 'student');
    const allResults = getResults().filter(r => r.status === 'published');
    const midtermResults = getMidTermResults().filter(r => r.status === 'submitted');

    const allClassStreams = getClasses().map(c => c.displayName);
    // Fall back to any class values found on students that aren't in getClasses()
    const dynamicClassOrder = allClassStreams.length > 0
        ? allClassStreams
        : [...new Set(students.map(s => s.class).filter(Boolean))].sort();

    // Build subject summary data
    const allExamResults = allResults;
    const allMidtermResults = midtermResults;
    const subjectMap = {};
    [...allExamResults, ...allMidtermResults].forEach(r => {
        const subj = r.subject || 'Unknown';
        if (!subjectMap[subj]) subjectMap[subj] = { scores: [], count: 0, grades: [] };
        subjectMap[subj].count++;
        if (r.totalScore) subjectMap[subj].scores.push((r.score / r.totalScore) * 100);
        else if (r.total) subjectMap[subj].scores.push((r.total / 50) * 100);
        if (r.grade) subjectMap[subj].grades.push(r.grade);
    });
    const subjectSummary = Object.entries(subjectMap).map(([name, data]) => {
        const avg = data.scores.length ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0;
        const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
        const bestGrade = data.grades.length ? data.grades.sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b))[0] : '—';
        return { name, count: data.count, avg, bestGrade };
    }).sort((a, b) => b.count - a.count);

    const subjectOptions = `<option value="">All Subjects</option>${subjectSummary.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}`;

    // Store on window so filter handlers can access
    window.__adminResultsData = { students, allResults, midtermResults, classOrder: dynamicClassOrder, sn, sc, subjectSummary, subjectOptions };

    function sn(id) {
        const s = students.find(u => u.id === id);
        return s?.name || id?.slice(0, 8) || 'Unknown';
    }

    function sc(id) {
        const s = students.find(u => u.id === id);
        return s?.class || '-';
    }

    // Build class options
    const classOptions = `<option value="">All Classes</option>${dynamicClassOrder.map(c => `<option value="${c}">${c}</option>`).join('')}`;

    // Build student options
    const studentOptions = `<option value="">All Students</option>${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;

    // Build class summary cards
    let classSummaryCards = '';
    dynamicClassOrder.forEach(cls => {
        const clsStudents = students.filter(s => s.class === cls);
        const clsExam = allResults.filter(r => clsStudents.some(s => s.id === r.studentId));
        const clsMid = midtermResults.filter(r => clsStudents.some(s => s.id === r.studentId));
        if (clsExam.length === 0 && clsMid.length === 0) return;
        const avgScore = clsExam.length ? Math.round(clsExam.reduce((a, r) => a + (r.score / r.totalScore) * 100, 0) / clsExam.length) : 0;
        classSummaryCards += `
            <div class="stat-card" style="cursor:pointer;" onclick="document.getElementById('admin-filter-class').value='${cls}'; adminFilterResults()">
                <div style="font-size:1.5rem; font-weight:800; color:#7B1D3C;">${cls}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${clsStudents.length} students</div>
                <div style="display:flex; gap:1rem; margin-top:0.5rem; font-size:0.8rem;">
                    <span><strong>${clsExam.length}</strong> exams</span>
                    <span><strong>${clsMid.length}</strong> mid-terms</span>
                </div>
                <div style="font-size:0.8rem; color:#2D9B6F; margin-top:0.25rem;">Avg: ${avgScore}%</div>
            </div>
        `;
    });
    if (!classSummaryCards) classSummaryCards = '<div style="padding:2rem; text-align:center; color:var(--text-muted);">No results data for any class yet.</div>';

    const content = `
    <div class="page">
      <div class="hero-banner" style="padding: 3rem 2rem;">
        <h1 class="hero-title">Results Overview</h1>
        <p class="hero-sub">View and filter published exam results and submitted mid-term results by class or individual student.</p>
      </div>

      <!-- Class Summary Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
        ${classSummaryCards}
      </div>

      <!-- Filters -->
      <div class="section-card" style="padding:1.25rem 1.5rem; margin-bottom:1.5rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:end;">
          <div class="form-group" style="min-width:180px;">
            <label class="form-label">Class</label>
            <select id="admin-filter-class" class="form-input" style="padding-left:1rem;" onchange="adminUpdateStudents(); adminFilterResults();">
              ${classOptions}
            </select>
          </div>
          <div class="form-group" style="min-width:220px;">
            <label class="form-label">Student</label>
            <select id="admin-filter-student" class="form-input" style="padding-left:1rem;" onchange="adminFilterResults()">
              ${studentOptions}
            </select>
          </div>
          <div class="form-group" style="min-width:160px;">
            <label class="form-label">Subject</label>
            <select id="admin-filter-subject" class="form-input" style="padding-left:1rem;" onchange="adminFilterResults()">
              ${subjectOptions}
            </select>
          </div>
          <div class="form-group" style="min-width:140px;">
            <label class="form-label">Result Type</label>
            <select id="admin-filter-type" class="form-input" style="padding-left:1rem;" onchange="adminFilterResults()">
              <option value="exam">Exam Results</option>
              <option value="midterm">Mid-Term Results</option>
              <option value="all">All Results</option>
            </select>
          </div>
          <button class="btn btn-ghost" style="padding:0.5rem 1rem;" onclick="adminClearFilters()">Clear Filters</button>
        </div>
      </div>

      <!-- Subject Summary Cards -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:1rem; font-weight:800; margin-bottom:0.75rem; color:var(--text);">Subject Performance</h3>
        <div id="admin-subject-cards" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
          ${subjectSummary.map(s => `
            <div class="stat-card" style="cursor:pointer; text-align:center; padding:1rem;" onclick="document.getElementById('admin-filter-subject').value='${s.name}'; adminFilterResults()">
              <div style="font-size:1.1rem; font-weight:700; color:#7B1D3C;">${s.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${s.count} result${s.count !== 1 ? 's' : ''}</div>
              <div style="display:flex; justify-content:center; gap:1rem; margin-top:0.5rem; font-size:0.8rem;">
                <span><strong>${s.avg}%</strong> avg</span>
                <span style="color:#2D9B6F;"><strong>${s.bestGrade}</strong> best</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; margin-bottom:1.5rem;">
        <div class="stat-card" style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800;" id="admin-stat-count">${allResults.length + midtermResults.length}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Total Results</div>
        </div>
        <div class="stat-card" style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800;" id="admin-stat-avg">—</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Avg Score</div>
        </div>
        <div class="stat-card" style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800;" id="admin-stat-top">—</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Top Student</div>
        </div>
        <div class="stat-card" style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:800;" id="admin-stat-best">—</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Best Grade</div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="section-card" style="padding:0;">
        <div style="padding:1rem 1.5rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <h3 style="margin:0; font-size:1rem; font-weight:800;">Results</h3>
          <span style="font-size:0.85rem; color:var(--text-muted);" id="admin-results-subtitle">Showing all results</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="teacher-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th>S/N</th>
                <th>Student</th>
                <th>Class</th>
                <th>Subject</th>
                <th id="admin-col1-header">Obj</th>
                <th id="admin-col2-header">Theory</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="admin-results-body">
              <tr><td colspan="9" style="padding:2rem; text-align:center;">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('admin-results', content);
    adminFilterResults();
}

// --- Admin results filter helpers ---

window.adminUpdateStudents = function () {
    const data = window.__adminResultsData;
    if (!data) return;
    const cls = document.getElementById('admin-filter-class').value;
    const sel = document.getElementById('admin-filter-student');
    const filtered = cls ? data.students.filter(s => s.class === cls) : data.students;
    sel.innerHTML = '<option value="">All Students</option>' + filtered.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
};

window.adminClearFilters = function () {
    document.getElementById('admin-filter-class').value = '';
    document.getElementById('admin-filter-student').value = '';
    document.getElementById('admin-filter-subject').value = '';
    document.getElementById('admin-filter-type').value = 'exam';
    adminUpdateStudents();
    adminFilterResults();
};

window.adminFilterResults = function () {
    const data = window.__adminResultsData;
    if (!data) return;
    const { students, allResults, midtermResults, classOrder, sn, sc, subjectSummary } = data;

    const cls = document.getElementById('admin-filter-class').value;
    const studentId = document.getElementById('admin-filter-student').value;
    const subjectFilter = document.getElementById('admin-filter-subject').value;
    const type = document.getElementById('admin-filter-type').value;

    // Determine which data set(s) to filter
    let examFiltered = [];
    let midtermFiltered = [];

    if (type === 'exam' || type === 'all') {
        examFiltered = [...allResults];
        if (cls) {
            const clsStudentIds = students.filter(s => s.class === cls).map(s => s.id);
            examFiltered = examFiltered.filter(r => clsStudentIds.includes(r.studentId));
        }
        if (studentId) {
            examFiltered = examFiltered.filter(r => r.studentId === studentId);
        }
        if (subjectFilter) {
            examFiltered = examFiltered.filter(r => r.subject === subjectFilter);
        }
    }

    if (type === 'midterm' || type === 'all') {
        midtermFiltered = [...midtermResults];
        if (cls) {
            const clsStudentIds = students.filter(s => s.class === cls).map(s => s.id);
            midtermFiltered = midtermFiltered.filter(r => clsStudentIds.includes(r.studentId));
        }
        if (studentId) {
            midtermFiltered = midtermFiltered.filter(r => r.studentId === studentId);
        }
        if (subjectFilter) {
            midtermFiltered = midtermFiltered.filter(r => r.subject === subjectFilter);
        }
    }

    // Build table rows
    let rows = '';
    let combined = [];

    if (type === 'exam' || type === 'all') {
        examFiltered.forEach((r, idx) => {
            const objScore = r.objectiveScore != null ? r.objectiveScore : '\u2014';
            const theoryScore = r.theoryScore != null ? r.theoryScore : '\u2014';
            const pct = r.totalScore ? Math.round((r.score / r.totalScore) * 100) + '%' : '\u2014';
            combined.push({ ...r, _type: 'exam' });
            rows += `
                <tr>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${combined.length}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${sn(r.studentId)}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${sc(r.studentId)}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.subject}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${objScore}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${theoryScore}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.score}/${r.totalScore} (${pct})</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.grade}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.date}</td>
                </tr>
            `;
        });
    }

    if (type === 'midterm' || type === 'all') {
        if (type === 'all' && examFiltered.length > 0) {
            rows += `<tr style="background:#f0f4f8;"><td colspan="9" style="padding:0.75rem; font-weight:700; color:#1565C0;">Mid-Term Results</td></tr>`;
        }
        midtermFiltered.forEach((r) => {
            combined.push({ ...r, _type: 'midterm' });
            rows += `
                <tr>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${combined.length}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${sn(r.studentId)}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${sc(r.studentId)}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.subject}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.ca}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.midterm}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.total}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.grade}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.date || '\u2014'}</td>
                </tr>
            `;
        });
    }

    // Update column headers based on type
    const col1 = document.getElementById('admin-col1-header');
    const col2 = document.getElementById('admin-col2-header');
    if (col1 && col2) {
        if (type === 'midterm') {
            col1.textContent = 'C.A(20)';
            col2.textContent = 'Score(30)';
        } else {
            col1.textContent = 'Obj';
            col2.textContent = 'Theory';
        }
    }

    document.getElementById('admin-results-body').innerHTML = rows || '<tr><td colspan="9" style="padding:2rem; text-align:center;">No results match the current filters.</td></tr>';

    // Update stats
    let totalCount = examFiltered.length + midtermFiltered.length;
    document.getElementById('admin-stat-count').textContent = totalCount;

    // Average score
    let scoreSum = 0;
    let scoreCount = 0;
    examFiltered.forEach(r => { if (r.totalScore) { scoreSum += (r.score / r.totalScore) * 100; scoreCount++; } });
    midtermFiltered.forEach(r => { scoreSum += (r.total / 50) * 100; scoreCount++; });
    document.getElementById('admin-stat-avg').textContent = scoreCount ? Math.round(scoreSum / scoreCount) + '%' : '—';

    // Top student
    let bestPct = 0;
    let bestStudentName = '—';
    examFiltered.forEach(r => {
        if (r.totalScore) {
            const p = (r.score / r.totalScore) * 100;
            if (p > bestPct) { bestPct = p; bestStudentName = sn(r.studentId); }
        }
    });
    midtermFiltered.forEach(r => {
        const p = (r.total / 50) * 100;
        if (p > bestPct) { bestPct = p; bestStudentName = sn(r.studentId); }
    });
    document.getElementById('admin-stat-top').textContent = bestStudentName;

    // Best grade
    const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
    let bestGrade = '—';
    [...examFiltered, ...midtermFiltered].forEach(r => {
        const g = r.grade || 'F';
        if (bestGrade === '—' || gradeOrder.indexOf(g) < gradeOrder.indexOf(bestGrade)) bestGrade = g;
    });
    document.getElementById('admin-stat-best').textContent = bestGrade;

    // Subtitle
    let subtitle = 'Showing ';
    if (cls) subtitle += cls + ' class';
    if (studentId) subtitle += (cls ? ', ' : '') + sn(studentId);
    if (!cls && !studentId) subtitle += 'all students';
    subtitle += ' — ' + (type === 'all' ? 'Exam + Mid-Term' : type === 'exam' ? 'Exam Results' : 'Mid-Term Results');
    document.getElementById('admin-results-subtitle').textContent = subtitle;

    // Update subject summary cards based on filtered data
    const combinedFiltered = [...examFiltered, ...midtermFiltered];
    const subjMap = {};
    combinedFiltered.forEach(r => {
        const subj = r.subject || 'Unknown';
        if (!subjMap[subj]) subjMap[subj] = { scores: [], grades: [] };
        if (r.totalScore) subjMap[subj].scores.push((r.score / r.totalScore) * 100);
        else if (r.total) subjMap[subj].scores.push((r.total / 50) * 100);
        if (r.grade) subjMap[subj].grades.push(r.grade);
    });
    const container = document.getElementById('admin-subject-cards');
    if (container) {
        const entries = Object.entries(subjMap);
        container.innerHTML = entries.length
            ? entries.map(([name, d]) => {
                const avg = d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0;
                const bestG = d.grades.length ? d.grades.sort((a, b) => ['A','B','C','D','F'].indexOf(a) - ['A','B','C','D','F'].indexOf(b))[0] : '—';
                return `
                    <div class="stat-card" style="cursor:pointer; text-align:center; padding:1rem;" onclick="document.getElementById('admin-filter-subject').value='${name}'; adminFilterResults()">
                      <div style="font-size:1.1rem; font-weight:700; color:#7B1D3C;">${name}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${d.scores.length} result${d.scores.length !== 1 ? 's' : ''}</div>
                      <div style="display:flex; justify-content:center; gap:1rem; margin-top:0.5rem; font-size:0.8rem;">
                        <span><strong>${avg}%</strong> avg</span>
                        <span style="color:#2D9B6F;"><strong>${bestG}</strong> best</span>
                      </div>
                    </div>
                `;
            }).join('')
            : '<div style="color:var(--text-muted); text-align:center; padding:1rem;">No results match the current filters.</div>';
    }
};

/* =============================================
   CLASS STREAMS / ARMS MANAGEMENT
   ============================================= */
async function renderAdminClasses() {
    console.log('[DEBUG] renderAdminClasses CALLED');
    if (!Auth.guard()) { console.log('[DEBUG] renderAdminClasses - Auth.guard() FAILED'); return; }
    await window.DataSync?.refreshResource('classes').catch(() => {});
    const allClasses = getClasses();
    console.log('[DEBUG] renderAdminClasses - allClasses:', allClasses.length, allClasses.map ? allClasses.map(c => c.displayName) : 'NOT ARRAY');
    const classLevels = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

    // Group by level
    const grouped = {};
    classLevels.forEach(l => grouped[l] = []);
    allClasses.forEach(c => {
        if (!grouped[c.level]) grouped[c.level] = [];
        grouped[c.level].push(c);
    });

    const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title">Class Streams / Arms</h1>
        <p class="hero-sub">Create and manage class streams (e.g., JSS1 Faith, SS2 Science) across all class levels</p>
      </div>

      <div class="section-card" style="margin-top:1.5rem; padding: 2rem;" id="class-form-section">
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
          <span style="font-size:1.25rem;"><svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
          <h3 style="font-size:1.1rem; font-weight:800;">Add New Class Stream</h3>
        </div>
        <form id="class-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Class Level</label>
                    <select id="class-level" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Level</option>
                        <option value="JSS1">JSS1 — Junior Secondary 1</option>
                        <option value="JSS2">JSS2 — Junior Secondary 2</option>
                        <option value="JSS3">JSS3 — Junior Secondary 3</option>
                        <option value="SS1">SS1 — Senior Secondary 1</option>
                        <option value="SS2">SS2 — Senior Secondary 2</option>
                        <option value="SS3">SS3 — Senior Secondary 3</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Stream / Arm Name</label>
                    <input type="text" id="class-stream" class="form-input" style="padding-left:1rem;" placeholder="e.g. Faith, Joy, Peace, Science, Art" required />
                </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-ghost" onclick="clearClassForm()">Clear</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;">Add Stream</button>
            </div>
        </form>
      </div>

      <div class="section-card" style="margin-top:2rem;">
        <div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.1rem;font-weight:800;">All Class Streams (${allClasses.length})</h3>
            <p style="font-size:0.875rem;color:var(--text-muted);margin-top:0.25rem;">Total streams created across all levels</p>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="teacher-table">
              <thead>
                  <tr>
                      <th>Display Name</th>
                      <th>Level</th>
                      <th>Stream / Arm</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${classLevels.map(level => {
                      const levelClasses = grouped[level] || [];
                      if (levelClasses.length === 0) return '';
                      return `
                          <tr style="background:#7B1D3C; color:white;">
                              <td colspan="4" style="font-weight:700; padding:0.75rem;">
                                  ${level} (${levelClasses.length} stream${levelClasses.length !== 1 ? 's' : ''})
                              </td>
                          </tr>
                          ${levelClasses.map(c => `
                          <tr>
                              <td style="font-weight:600;">${c.displayName}</td>
                              <td><span class="badge badge-info">${c.level}</span></td>
                              <td>${c.stream}</td>
                              <td>
                                  <button class="btn btn-ghost btn-sm" onclick="deleteClassStream('${c.id}')">
                                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2">
                                          <polyline points="3 6 5 6 21 6"/>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                      </svg>
                                  </button>
                              </td>
                          </tr>
                          `).join('')}
                      `;
                  }).join('')}
                  ${allClasses.length === 0 ? `
                  <tr>
                      <td colspan="4" style="text-align:center;padding:3rem;color:var(--text-muted);">
                          No class streams created yet. Add a stream above to get started.
                      </td>
                  </tr>
                  ` : ''}
              </tbody>
          </table>
        </div>
      </div>
    </div>
    `;

    UI.buildPortal('admin-classes', content);

    window.clearClassForm = function() {
        document.getElementById('class-form').reset();
    };

    window.deleteClassStream = async function(id) {
        if (!confirm('Delete this class stream? This will not affect existing students.')) return;
        await deleteClass(id);
        UI.toast('Class stream deleted', 'success');
        Router.go('admin-classes');
    };

    setTimeout(() => {
        const form = document.getElementById('class-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const level = document.getElementById('class-level').value;
                const stream = document.getElementById('class-stream').value.trim();
                console.log('[DEBUG] class-form SUBMIT', { level, stream });
                if (!level || !stream) {
                    UI.toast('Please select a class level and enter a stream name', 'error');
                    return;
                }
                console.log('[DEBUG] about to call addClass');
                const added = await addClass(level, stream);
                console.log('[DEBUG] addClass returned:', added);
                if (!added) {
                    UI.toast('This stream already exists for this level', 'warning');
                    return;
                }
                UI.toast('Stream "' + level + ' ' + stream + '" created!', 'success');
                clearClassForm();
                console.log('[DEBUG] calling Router.go(admin-classes)');
                Router.go('admin-classes');
            });
        }
    }, 100);
}
