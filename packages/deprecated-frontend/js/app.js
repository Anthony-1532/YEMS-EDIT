/* =============================================
   APP.JS — Yoshua Educational Platform
   ============================================= */

// API Base URL - determined at runtime (matches config.js logic)
const API_BASE = window.YEMS_API_BASE_URL || ((!window.location.port || window.location.port === '80' || window.location.port === '443' || window.location.port === '8080') ? '/api' : 'http://localhost:4000/api');
const RUNTIME_STATE = window.__YEMS_RUNTIME_STATE || (window.__YEMS_RUNTIME_STATE = { examSessions: Object.create(null) });

/* ---- INIT ---- */
(function boot() {
  UI.initTheme();

  // Auto-redirect logged-in users to their dedicated portal
  if (Auth.isLoggedIn()) {
    const user = Auth.current();
    const role = user?.role;
    const portalMap = {
      teacher: 'teacher.html',
      admin: 'admin.html',
      superadmin: 'superadmin.html',
      platform_admin: 'superadmin.html',
      principal: 'principal.html',
      hod: 'hod.html',
      accountant: 'accountant.html',
      account: 'accountant.html',
    };
    if (portalMap[role]) {
      window.location.replace(portalMap[role]);
      return;
    }
  }

  Router.register('login', renderLogin);
  Router.register('signup', renderSignup);
  Router.register('home', renderHome);
  Router.register('tests', renderTests);
  Router.register('exams', renderExamType);
  Router.register('mcq', renderMCQ);
  Router.register('theory', renderTheory);
  Router.register('theory-session', renderTheorySession);
  // Assignment routes registered in assignment-quiz.js
  Router.register('live', renderLive);
  Router.register('notes', renderNotes);
  Router.register('assign', renderAssign);
  Router.register('results', renderResults);
  Router.register('settings', renderSettings);
  Router.register('exam-session', renderExamSession);
  Router.register('mcq-session', renderMCQSession);
  if (Auth.isLoggedIn()) {
    const waitForToken = () => {
      const token = Auth.getToken();
      if (token) {
        window.__APP_SYNC_PROMISE = window.DataSync?.refreshCore().catch(error => {
          console.error('[App] Background data sync failed:', error?.message || error);
        });
      } else {
        setTimeout(waitForToken, 200);
      }
    };
    waitForToken();
  }
  Router.init();
})();

window.addEventListener('yems:data-refreshed', (event) => {
  if (!event?.detail?.key) return;
  const page = window.location.hash.slice(1);
  if (page === 'home') {
    // Re-render home when any dashboard-relevant data refreshes
    const relevantKeys = ['yep_exams', 'yep_results', 'yep_notes', 'yep_assignments', 'yep_lessons'];
    if (relevantKeys.includes(event.detail.key)) {
      renderHome();
    }
    return;
  }
  if (event.detail.key === 'yep_exams') {
    if (page === 'tests') renderTests();
    if (page === 'exams') renderExamType();
  }
});

async function ensureStudentExamCache() {
  const user = Auth.current();
  if (!user || (user.role !== 'student' && user.role !== 'parent')) return;
  const existing = getExams();
  if (Array.isArray(existing) && existing.length > 0) return;
  const state = window.__YEMS_RUNTIME_STATE || (window.__YEMS_RUNTIME_STATE = {});
  if (state.directExamFetchInProgress) return;
  state.directExamFetchInProgress = true;
  try {
    await window.DataSync?.refreshResource('exams');
    const afterSync = getExams();
    if (Array.isArray(afterSync) && afterSync.length > 0) return;
    const response = await API.student.getExams();
    const raw = response?.data ?? response ?? [];
    if (Array.isArray(raw) && raw.length > 0) {
      saveExams(raw.map(normalizeExam));
    }
  } catch (error) {
    console.error('[App] Direct exam fetch failed:', error?.message || error);
  } finally {
    state.directExamFetchInProgress = false;
  }
}

window.deleteNote = async function (id) {
  await API.notes.delete(id);
  await window.DataSync?.refreshResource('notes').catch(() => {});
};
window.deleteAssignment = async function (id) {
  await API.assignments.delete(id);
  await window.DataSync?.refreshResource('assignments').catch(() => {});
};
window.deleteExam = async function (id) {
  await API.exams.delete(id);
  await window.DataSync?.refreshResource('exams').catch(() => {});
};

window.toggleNotifications = function() {
    const existing = document.getElementById('notif-dropdown');
    if (existing) {
        existing.remove();
        return;
    }
    
    const user = Auth.current();
    let notifContent = '';
    
    // Get system notifications
    const systemNotifications = getNotifications();
    const myNotifs = systemNotifications.filter(n => !n.read && (n.toUserId === user?.id || !n.toUserId));
    
    // Show system notifications first
    if (myNotifs.length > 0) {
        notifContent += myNotifs.slice(0, 10).map(n => {
            let icon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
            let route = 'home';
            if (n.type === 'exam') { icon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'; route = 'tests'; }
            if (n.type === 'note') { icon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'; route = 'notes'; }
            if (n.type === 'assignment') { icon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'; route = 'assign'; }
            if (n.type === 'result') { icon = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'; route = 'results'; }
            
            return `
                <div class="notif-item" onclick="Router.go('${route}'); markNotificationRead('${n.id}'); document.getElementById('notif-dropdown')?.remove();">
                    <div class="notif-icon">${icon}</div>
                    <div class="notif-text">
                        <strong>${n.title}</strong>
                        <p>${n.message}</p>
                        <span class="notif-time">${n.date}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Check if user is admin, superadmin, principal, or hod
    if (['admin', 'superadmin', 'principal', 'hod'].includes(user?.role)) {
        const reports = getReports();
        const newReports = reports.filter(r => !r.read);
        
        if (newReports.length > 0) {
            notifContent += newReports.slice(0, 5).map(r => `
                <div class="notif-item" onclick="Router.go('admin-settings')">
                    <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                    <div class="notif-text">
                        <strong>New Report from ${escapeHtml(r.userName)}</strong>
                        <p>${escapeHtml(r.category)}: ${escapeHtml((r.description || '').substring(0, 50))}...</p>
                        <span class="notif-time">${escapeHtml(r.date)}</span>
                    </div>
                </div>
            `).join('');
        }
        
        if (!notifContent) {
            notifContent = '<div class="notif-empty">No new notifications</div>';
        }
    } else if (user?.role === 'student') {
        const results = getResults().filter(r => r.studentId === user?.id && r.visibleToStudents !== false);
        
        if (results.length > 0) {
            notifContent += results.slice(0, 5).map(r => `
                <div class="notif-item" onclick="Router.go('results')">
                    <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                    <div class="notif-text">
                        <strong>New Result Published</strong>
                        <p>${r.examTitle || r.subject} - Score: ${r.score}/${r.totalScore}</p>
                        <span class="notif-time">${r.date}</span>
                    </div>
                </div>
            `).join('');
        }
        
        const assignments = getAssignments();
        if (assignments.length > 0) {
            notifContent += assignments.slice(0, 3).map(a => `
                <div class="notif-item" onclick="Router.go('assign')">
                    <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
                    <div class="notif-text">
                        <strong>New Assignment</strong>
                        <p>${a.title}</p>
                        <span class="notif-time">${a.dueLabel}</span>
                    </div>
                </div>
            `).join('');
        }
        
        const notes = getNotes();
        if (notes.length > 0) {
            notifContent += notes.slice(0, 3).map(n => `
                <div class="notif-item" onclick="Router.go('notes')">
                    <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
                    <div class="notif-text">
                        <strong>New Note Available</strong>
                        <p>${n.title}</p>
                        <span class="notif-time">${n.date}</span>
                    </div>
                </div>
            `).join('');
        }
        
        if (!notifContent) {
            notifContent = '<div class="notif-empty">No new notifications</div>';
        }
    } else if (user?.role === 'teacher') {
        // Teachers see reports submitted to them if any, or assignments submitted by students
        const assignments = getAssignments();
        if (assignments.length > 0) {
            notifContent += assignments.slice(0, 5).map(a => `
                <div class="notif-item" onclick="Router.go('teacher-assign')">
                    <div class="notif-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
                    <div class="notif-text">
                        <strong>Assignment</strong>
                        <p>${a.title}</p>
                        <span class="notif-time">${a.dueLabel}</span>
                    </div>
                </div>
            `).join('');
        }
        
        if (!notifContent) {
            notifContent = '<div class="notif-empty">No new notifications</div>';
        }
    } else {
        notifContent = '<div class="notif-empty">No new notifications</div>';
    }
    
    const dropdown = document.createElement('div');
    dropdown.id = 'notif-dropdown';
    dropdown.className = 'notif-dropdown';
    dropdown.innerHTML = `
        <div class="notif-header">
            <span>Notifications</span>
            <button onclick="clearNotifications(); location.reload();" style="background:none;border:none;color:var(--maroon);cursor:pointer;font-size:0.75rem;">Clear All</button>
        </div>
        <div class="notif-list">
            ${notifContent}
        </div>
    `;
    
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
        notifBtn.parentElement.style.position = 'relative';
        notifBtn.parentElement.appendChild(dropdown);
    }
    
    // Hide badge when opened
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
};

window.checkNotificationBadge = function() {
    const user = Auth.current();
    let hasNew = false;
    
    if (['admin', 'superadmin', 'principal', 'hod'].includes(user?.role)) {
        const reports = getReports();
        hasNew = reports.filter(r => !r.read).length > 0;
    } else if (user?.role === 'student') {
        const results = getResults().filter(r => r.studentId === user?.id && r.visibleToStudents !== false);
        const assignments = getAssignments();
        const notes = getNotes();
        hasNew = results.length > 0 || assignments.length > 0 || notes.length > 0;
    } else if (user?.role === 'teacher') {
        const assignments = getAssignments();
        hasNew = assignments.length > 0;
    }
    
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.display = hasNew ? 'block' : 'none';
    }
};

// Check badge on load
setTimeout(() => window.checkNotificationBadge(), 500);


/* =============================================
   LOGIN PAGE
   ============================================= */
 function renderLogin() {
   console.log('[renderLogin] API_BASE used:', API_BASE);
   if (Auth.isLoggedIn()) {
     const user = Auth.current();
     const role = user?.role;
     console.log('[renderLogin] Already logged in as:', role);
     
     if (role === 'admin') {
       window.location.href = 'admin.html';
     } else if (role === 'superadmin' || role === 'platform_admin') {
       window.location.href = 'superadmin.html';
     } else if (role === 'teacher') {
       window.location.href = 'teacher.html';
     } else if (role === 'accountant') {
       window.location.href = 'accountant.html';
     } else if (role === 'technician') {
       window.location.href = 'index.html#technician';
     } else if (role === 'student' || role === 'parent') {
       window.location.hash = 'home';
     } else {
       window.location.hash = 'home';
     }
     return;
   }

    document.getElementById('app').innerHTML = `
      <div id="server-down-banner" class="server-down-banner" style="display:none;">
        <div class="server-down-banner-inner">
          <span class="server-down-pulse"></span>
          <span>Server is down — reconnecting automatically...</span>
        </div>
      </div>
     <div class="auth-wrap" style="background: url('assets/background_login.jpg') center/130% no-repeat; position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg, rgba(123,29,60,0.92) 0%, rgba(80,20,45,0.88) 100%);"></div>
        <div class="auth-bg-blob"></div>
        <div class="auth-bg-blob"></div>
        <div class="auth-card glass" style="background:rgba(255,255,255,0.97); border-radius:20px; box-shadow:0 25px 50px rgba(0,0,0,0.3); max-width:420px; width:100%; padding:2.5rem;">
          <div class="auth-logo" style="justify-content:center; margin-bottom:1.5rem;">
            <img src="assets/logo.jpg" alt="YEMS Logo" style="height:70px;object-fit:contain; border-radius:12px;" />
          </div>

          <h1 class="auth-title" style="color:#1a1a1a;">Welcome Back</h1>
          <p class="auth-sub" style="color:#555;">Sign in to your YEMS account</p>

          <form id="login-form" novalidate>
           <div class="form-group">
             <label class="form-label">Email Address</label>
             <div class="input-wrap">
               <span class="input-icon">${UI.icon('mail')}</span>
               <input id="l-email" type="email" class="form-input" placeholder="email@yems.local" autocomplete="email" />
             </div>
           </div>
           <div class="form-group">
             <label class="form-label">Password</label>
             <div class="input-wrap">
               <span class="input-icon">${UI.icon('key')}</span>
               <input id="l-pass" type="password" class="form-input" placeholder="••••••••" autocomplete="current-password" />
               <button type="button" class="pw-toggle" id="pw-toggle">
                 ${UI.icon('eye')}
               </button>
             </div>
           </div>
           <div class="form-group" style="display:flex;align-items:center;gap:0.5rem;">
             <input type="checkbox" id="remember" style="width:auto;accent-color:var(--maroon);cursor:pointer;width:15px;height:15px;" />
             <label for="remember" style="font-size:0.8125rem;color:var(--text-sec);cursor:pointer;margin:0;">Remember me</label>
           </div>
           <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn" style="margin-top:0.5rem;">
             Sign In →
           </button>
         </form>

         
         
         <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px dashed var(--border); text-align:center;">
           <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">New Student?</p>
           <a href="admin.html#admin-admission" style="font-size:0.9rem; font-weight:600; color:#7B1D3C; text-decoration:none;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Apply for Admission</a>
         </div>

         <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border); text-align:center;">
           <a href="superadmin.html" style="font-size:0.75rem; color:var(--text-muted); text-decoration:none; opacity:0.5;">Super Admin Access</a>
         </div>
       </div>
     </div>
   `;

   // Wire server-down banner on login page
   (function wireLoginBanner() {
     const loginBanner = document.getElementById('server-down-banner');
     if (!loginBanner) return;

     const show = () => { loginBanner.style.display = ''; };
     const hide = () => { loginBanner.style.display = 'none'; };

     if (window.API && typeof API.isServerOnline === 'function' && !API.isServerOnline()) {
       show();
     }

     window.addEventListener('yems:server-down', show);
     window.addEventListener('yems:server-up', hide);
   })();

  /* Password toggle */
  let visible = false;
  document.getElementById('pw-toggle').addEventListener('click', () => {
    visible = !visible;
    document.getElementById('l-pass').type = visible ? 'text' : 'password';
    document.getElementById('pw-toggle').innerHTML = UI.icon(visible ? 'eyeoff' : 'eye');
  });

   document.getElementById('login-form').addEventListener('submit', async e => {
     e.preventDefault();
     const email = document.getElementById('l-email').value.trim();
     const pass = document.getElementById('l-pass').value;
     const rem = document.getElementById('remember').checked;
     const btn = document.getElementById('login-btn');
     if (!email || !pass) { UI.toast('Please fill in all fields.', 'warning'); return; }

     btn.disabled = true; 
     btn.textContent = 'Signing in...';

     try {
       const result = await Auth.login(email, pass, rem);
       
       if (!result.ok) {
         // Error already shown by Auth.login()
         console.warn('[Login] Failed:', result.error);
         return;
       }

       // Success - redirect based on role
       const role = result.user.role;
       console.log('[Login] Success, role:', role);

       if (role === 'admin') {
        window.location.href = 'admin.html';
      } else if (role === 'superadmin' || role === 'platform_admin') {
        window.location.href = 'superadmin.html';
      } else if (role === 'teacher') {
        window.location.href = 'teacher.html';
      } else if (role === 'accountant') {
        window.location.href = 'accountant.html';
      } else if (role === 'principal') {
        window.location.href = 'principal.html';
      } else if (role === 'hod') {
        window.location.href = 'hod.html';
      } else if (role === 'technician') {
        window.location.href = 'technician.html';
      } else if (role === 'student' || role === 'parent') {
         window.location.hash = 'home';
         renderHome();
       } else {
         window.location.reload();
       }
     } catch (error) {
       console.error('[Login] Unexpected error:', error);
       UI.toast('Login failed: ' + (error.message || error), 'error');
     } finally {
       btn.disabled = false;
       btn.textContent = 'Sign In →';
     }
   });
}

/* =============================================
   SIGNUP PAGE
   ============================================= */
function renderSignup() {
  if (Auth.isLoggedIn()) return Router.go('home');
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-bg-blob"></div>
      <div class="auth-bg-blob"></div>
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
          <div class="auth-logo-text">
            <strong>Yeshua Educational Platform</strong>
            <span>CREATE ACCOUNT</span>
          </div>
        </div>
        <h1 class="auth-title">Create account</h1>
        <p class="auth-sub">Join the Yeshua student portal today.</p>
        <form id="reg-form" novalidate>
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <div class="input-wrap">
              <span class="input-icon">${UI.icon('user')}</span>
              <input id="r-name" type="text" class="form-input" placeholder="Your full name" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <div class="input-wrap">
              <span class="input-icon">${UI.icon('mail')}</span>
              <input id="r-email" type="email" class="form-input" placeholder="you@example.com" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-wrap">
              <span class="input-icon">${UI.icon('key')}</span>
              <input id="r-pass" type="password" class="form-input" placeholder="Min. 6 characters" />
              <button type="button" class="pw-toggle" id="r-pw-toggle">${UI.icon('eye')}</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="reg-btn" style="margin-top:0.5rem;">
            Create Account
          </button>
        </form>
        <div class="auth-switch">
          Already have an account? <a href="#login" id="go-login">Sign in</a>
        </div>
      </div>
    </div>
  `;
  let vis = false;
  document.getElementById('r-pw-toggle').addEventListener('click', () => {
    vis = !vis;
    document.getElementById('r-pass').type = vis ? 'text' : 'password';
    document.getElementById('r-pw-toggle').innerHTML = UI.icon(vis ? 'eyeoff' : 'eye');
  });
  document.getElementById('go-login').addEventListener('click', e => { e.preventDefault(); Router.go('login'); });
  document.getElementById('reg-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value;
    const btn = document.getElementById('reg-btn');
    if (!name || !email || !pass) { UI.toast('Please fill in all fields.', 'warning'); return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    const r = await Auth.register(name, email, pass);
    btn.disabled = false; btn.textContent = 'Create Account';
    if (r.ok) {
      UI.toast('Account created! Welcome <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', 'success');
      if (r.user.role === 'teacher') {
        window.location.href = 'teacher.html';
      } else {
        Router.go('home');
      }
    }
    else UI.toast(r.err, 'error');
  });
}

/* =============================================
   HOME / DASHBOARD - Premium Teacher Style
   ============================================= */

function renderHomeSkeleton(user) {
  return `
    <div class="page" style="padding:0; max-width: none; animation: fadeIn 0.4s ease;">
      <div class="home-hero" style="background: linear-gradient(135deg, #7B1D3C 0%, #3D0920 100%); padding: 6rem 2rem 9rem 2rem;">
        <div class="home-session-badge" style="height:1.2rem;width:12rem;background:rgba(255,255,255,0.15);border-radius:6px;margin:0 auto 1rem;"></div>
        <h1 class="home-greeting" style="font-size: 3.5rem;text-align:center;">
          <span style="display:inline-block;height:3rem;width:22rem;background:rgba(255,255,255,0.15);border-radius:8px;vertical-align:middle;"></span>
        </h1>
        <p class="home-subtitle" style="font-size: 1.1rem; opacity: 0.75; font-weight: 400; text-align:center;margin-top:1rem;">
          <span style="display:inline-block;height:1rem;width:18rem;background:rgba(255,255,255,0.1);border-radius:4px;"></span>
        </p>
      </div>
      <div class="home-content-wrap" style="margin-top: -4rem;">
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.5rem; margin-bottom: 2.5rem;">
          ${Array(6).fill(0).map(() => `
            <div class="premium-card stat-item" style="padding:1.25rem;pointer-events:none;">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div class="skeleton-box" style="width:40px;height:40px;border-radius:12px;"></div>
                <div style="flex:1;">
                  <div class="skeleton-box skeleton-text" style="width:60%;height:10px;margin-bottom:8px;"></div>
                  <div class="skeleton-box skeleton-text" style="width:30%;height:22px;"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="text-align:center;padding:2rem 0 4rem;">
        <div style="width:2rem;height:2rem;border:3px solid var(--border);border-top-color:var(--maroon);border-radius:50%;margin:0 auto 0.5rem;animation:spinner-spin 1s linear infinite;"></div>
        <div style="color:var(--text-muted);font-size:0.9rem;opacity:0.6;">Loading your dashboard...</div>
      </div>
    </div>
  `;
}

async function renderHome() {
  if (!Auth.guard()) return;
  const user = Auth.current();

  // Check if exam data is already hydrated (e.g. returning from exams/tests page)
  const exams = getExams();
  if (!exams || exams.length === 0) {
    // Show loading skeleton while data is fetched
    UI.buildPortal('home', renderHomeSkeleton(user));
    // Await exam data hydration — same pattern used by renderExamType() and renderTests()
    await ensureStudentExamCache().catch(() => {});
  }

  // === Render with real data ===
  const academic = getAcademicInfo();

  const stats = [
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', label: 'My Results', val: getResults().filter(r => r.studentId === user?.id && r.visibleToStudents !== false).length, color: '#7B1D3C', page: 'results' },
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', label: 'Exams', val: getExams().length, color: '#C0476A', page: 'exams' },
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>', label: 'Live Classes', val: PORTAL_DATA.lessons?.length || 0, color: '#2D9B6F', page: 'live' },
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', label: 'Notes', val: getNotes().length, color: '#1A6FA8', page: 'notes' },
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', label: 'Assignments', val: getAssignments().filter(a => a.dueDate).length, color: '#B45309', page: 'assign' },
    { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', label: 'Tests', val: PORTAL_DATA.tests?.length || 0, color: '#6B21A8', page: 'tests' }
  ].map(s => `
    <div class="premium-card stat-item" onclick="Router.go('${s.page}')" style="cursor: pointer;">
      <div class="stat-icon-box" style="background: ${s.color}15; color: ${s.color};">
        ${s.icon}
      </div>
      <div>
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${s.label}</div>
        <div style="font-size: 1.5rem; font-weight: 900; color: var(--text);">${s.val}</div>
      </div>
    </div>
  `).join('');

  const deadlineList = (() => {
    try {
      const assignments = getAssignments();
      if (!assignments || assignments.length === 0) {
        return '<div style="padding:1rem;text-align:center;color:var(--text-muted);">No upcoming deadlines</div>';
      }
      return assignments.slice(0, 5).map(a => {
        const color = a.iconColor || '#7B1D3C';
        return `<div class="deadline-item" onclick="Router.go('assign')">
          <div class="deadline-dot" style="background:${color}"></div>
          <div class="deadline-info">
            <div class="deadline-name">${a.title}</div>
            <div class="deadline-due">${a.dueLabel || 'Due soon'}</div>
          </div>
          <span class="deadline-arrow">›</span>
        </div>`;
      }).join('');
    } catch(e) {
      return '<div style="padding:1rem;text-align:center;color:var(--text-muted);">No upcoming deadlines</div>';
    }
  })();

  const content = `
    <div class="page" style="padding:0; max-width: none; animation: fadeIn 0.4s ease;">
      <div class="home-hero" style="background: linear-gradient(135deg, #7B1D3C 0%, #3D0920 100%); padding: 6rem 2rem 9rem 2rem;">
        <div class="home-session-badge">Session: ${academic.session} • ${academic.term}</div>
        <h1 class="home-greeting" style="font-size: 3.5rem;">Welcome Back, <span class="text-gradient" style="background: linear-gradient(135deg, #FFF 0%, #FFC1D6 100%); -webkit-background-clip: text;">${user.name.split(' ')[0]}</span></h1>
        <p class="home-subtitle" style="font-size: 1.1rem; opacity: 0.75; font-weight: 400;">Your educational dashboard is up to date. Ready to learn today?</p>
      </div>

      <div class="home-content-wrap" style="margin-top: -4rem;">
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.5rem; margin-bottom: 2.5rem;">
          ${stats}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 2rem;">
          <div class="left-pane">
            ${TeacherPageBuilder?.section ? TeacherPageBuilder.section('Quick Actions', '⚡', `
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem;">
                <div class="premium-card" onclick="Router.go('results')" style="padding: 2rem; text-align: center; cursor: pointer;">
                  <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
                  <div style="font-weight: 800; font-size: 1rem;">Results</div>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">View grades</p>
                </div>
                <div class="premium-card" onclick="Router.go('exams')" style="padding: 2rem; text-align: center; cursor: pointer;">
                  <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                  <div style="font-weight: 800; font-size: 1rem;">Exams</div>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Start exam</p>
                </div>
                <div class="premium-card" onclick="Router.go('live')" style="padding: 2rem; text-align: center; cursor: pointer;">
                  <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div>
                  <div style="font-weight: 800; font-size: 1rem;">Live Class</div>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Join virtual</p>
                </div>
                <div class="premium-card" onclick="Router.go('notes')" style="padding: 2rem; text-align: center; cursor: pointer;">
                  <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
                  <div style="font-weight: 800; font-size: 1rem;">Notes</div>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Study materials</p>
                </div>
              </div>
            `) : `<div class="premium-card"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;"><div onclick="Router.go('results')" style="padding:2rem;text-align:center;cursor:pointer;"><div style="font-size:2.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div style="font-weight:800;">Results</div></div><div onclick="Router.go('exams')" style="padding:2rem;text-align:center;cursor:pointer;"><div style="font-size:2.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><div style="font-weight:800;">Exams</div></div><div onclick="Router.go('live')" style="padding:2rem;text-align:center;cursor:pointer;"><div style="font-size:2.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div><div style="font-weight:800;">Live Class</div></div><div onclick="Router.go('notes')" style="padding:2rem;text-align:center;cursor:pointer;"><div style="font-size:2.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div><div style="font-weight:800;">Notes</div></div></div></div>`}

            ${TeacherPageBuilder?.section ? TeacherPageBuilder.section('School News', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 11a2 2 0 0 1-2-2V7m-4 11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 1-2 2Z"/></svg>', `
              <div class="empty-state" style="padding: 5rem 0; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--text);">No New Announcements</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Check back later for updates from administration.</p>
              </div>
            `, `<button class="btn btn-ghost btn-sm" onclick="UI.toast('Refreshing...', 'info')">${UI.icon('refresh')}</button>`) : ''}
          </div>

          <div class="right-pane">
            <div class="premium-card glass-panel" style="padding: 2.5rem 1.5rem; margin-bottom: 1.5rem; text-align: center; background: linear-gradient(135deg, rgba(123, 29, 60, 0.05) 0%, rgba(123, 29, 60, 0.1) 100%);">
              <div style="font-size: 2rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <div id="s-clock-date" style="font-weight: 700; font-size: 0.9rem; color: var(--maroon); margin-bottom: 0.25rem;">--</div>
              <div id="s-clock-time" style="font-weight: 900; font-size: 2.5rem; color: var(--text); letter-spacing: -2px;">--:--</div>
            </div>

            <div class="premium-card" style="padding: 1.5rem;">
              <h4 style="font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Upcoming Deadlines
              </h4>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${deadlineList}
              </div>
              <button class="btn btn-primary btn-block" style="margin-top: 1.5rem; border-radius: 12px;" onclick="Router.go('assign')">VIEW ALL</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('home', content);

  const updateSClock = () => {
    const timeEl = document.getElementById('s-clock-time');
    const dateEl = document.getElementById('s-clock-date');
    if (timeEl && dateEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    }
  };
  updateSClock();
  const sInterval = setInterval(() => {
    if (!document.getElementById('s-clock-time')) { clearInterval(sInterval); return; }
    updateSClock();
  }, 1000);
}

/* =============================================
   EXAM TYPE SELECTION PAGE
   ============================================= */
async function renderExamType() {
  if (!Auth.guard()) return;
  await ensureStudentExamCache();
  const user = Auth.current();

  function examStatusBadge(status, isSubmitted) {
    if (isSubmitted) return '<span class="status-badge" style="background:#10B981;">ANSWERED</span>';
    if (status === 'upcoming') return '<span class="status-badge status-upcoming">UPCOMING</span>';
    if (status === 'new') return '<span class="status-badge status-new">NEW</span>';
    return '<span class="status-badge status-not-started">NOT STARTED</span>';
  }

  function getExamMeta(exam) {
    const startTime = exam.startTime ? new Date(exam.startTime).getTime() : null;
    const now = Date.now();
    const isReady = exam.status === 'active' || ((exam.status === 'scheduled' || exam.status === 'upcoming') && startTime && now >= startTime);
    const isTheory = exam.format === 'theory';
    const isSubmitted = hasStudentSubmitted(exam.id, user.id);

    return {
      isTheory,
      isReady,
      isSubmitted,
      startTime,
      questionCount: exam.questionsList?.length || exam.questions || 0,
      formatLabel: isTheory ? 'Theory' : 'Objective',
      formatIcon: isTheory ? UI.icon('theory') : UI.icon('mcq'),
      formatColor: isTheory ? '#B87A00' : '#7B1D3C',
      formatBg: isTheory ? '#FFF7E6' : '#FDF0F3'
    };
  }

  function buildButton(exam, meta) {
    if (meta.isSubmitted) {
      return `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Submitted</button>`;
    }

    if (!meta.isReady) {
      const startStr = meta.startTime ? new Date(meta.startTime).toLocaleString() : 'later';
      return `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${startStr}</button>`;
    }

    return `<button class="btn btn-primary btn-block btn-sm" onclick="viewExam('${exam.id}')">${meta.isTheory && exam.fileData ? 'View Questions' : 'Start Exam'}</button>`;
  }

  function buildCards(list) {
    if (!list.length) {
      return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon">${UI.icon('exam')}</div><h4>No Exams Available</h4><p>There are no examinations in this view right now.</p></div>`;
    }

    return list.map((exam, i) => {
      const meta = getExamMeta(exam);
      const isSubmitted = hasStudentSubmitted(exam.id, user.id);
      return `
        <div class="ecg-card" style="animation-delay:${i * 0.06}s; opacity:${meta.isReady ? '1' : '0.78'};">
          <div class="ecg-card-top">
            <div class="ecg-icon" style="background:${exam.bg || meta.formatColor};">
              <span>${exam.icon || (meta.isTheory ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>')}</span>
            </div>
            ${examStatusBadge(exam.status, isSubmitted)}
          </div>
          <div class="ecg-title">${exam.title}</div>
          <div class="ecg-desc">${exam.desc}</div>
          <div class="ecg-meta">
            <div class="ecg-meta-row">${UI.icon('clock')} Duration: ${exam.duration} mins</div>
            <div class="ecg-meta-row">${UI.icon('question')} Questions: ${meta.questionCount}</div>
          </div>
          ${buildButton(exam, meta)}
        </div>
      `;
    }).join('');
  }

  const allExams = getExams().filter(e => e.type !== 'midterm');
  if (!allExams.length && !RUNTIME_STATE.examsRouteRefreshed) {
    RUNTIME_STATE.examsRouteRefreshed = true;
    window.DataSync?.refreshResource('exams')
      .then(() => renderExamType())
      .catch(() => {});
  }
  const filters = {
    all: allExams,
    objective: allExams.filter(e => e.format !== 'theory'),
    theory: allExams.filter(e => e.format === 'theory')
  };

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;">
        <div class="hero-eyebrow">Academic Session 2024/2025</div>
        <h1 class="hero-title">Examinations</h1>
        <p class="hero-sub">Objective and theory papers now live on one page. Filter the list when you need a narrower view.</p>
      </div>

      <div class="section-card" style="margin-top:1.25rem;">
        <div class="section-header">
          <div>
            <h3>Available Exams</h3>
            <p style="margin:0.3rem 0 0;color:var(--text-muted);font-size:0.84rem;">All active and scheduled examination formats in one queue.</p>
          </div>
          <div class="filter-tabs">
            <button class="filter-tab active" data-exam-filter="all">All (${filters.all.length})</button>
            <button class="filter-tab" data-exam-filter="objective">Objective (${filters.objective.length})</button>
            <button class="filter-tab" data-exam-filter="theory">Theory (${filters.theory.length})</button>
          </div>
        </div>
        <div style="padding:1rem 1.25rem;">
          <div class="exams-card-grid" id="exam-unified-grid">${buildCards(filters.all)}</div>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('exams', content);

  document.querySelectorAll('[data-exam-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-exam-filter]').forEach(tab => tab.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.examFilter;
      document.getElementById('exam-unified-grid').innerHTML = buildCards(filters[key] || filters.all);
    });
  });
}


/* =============================================
   LIVE LESSONS PAGE
   ============================================= */
function renderLive() {
  if (!Auth.guard()) return;
  const rows = PORTAL_DATA.lessons.map(l => `
    <div class="lesson-row">
      <div class="lesson-subject">
        <div class="lesson-subject-icon" style="background:${l.iconBg};color:${l.iconColor}">
          ${l.icon}
        </div>
        <span style="color:var(--text)">${l.subject}</span>
      </div>
      <div class="lesson-topic">
        ${l.isLink ? `<a href="#">${l.topic}</a>` : `<span style="color:var(--text-sec)">${l.topic}</span>`}
      </div>
      <div class="lesson-time">
        ${UI.icon('clock')} ${l.time}
      </div>
      <div>
        <button class="btn btn-primary btn-sm">Enter Class</button>
      </div>
    </div>
  `).join('');

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;padding:2.5rem 2rem;">
        <div style="position:absolute;left:-30px;top:50%;transform:translateY(-50%);width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06);pointer-events:none;"></div>
        <div style="position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06);pointer-events:none;"></div>
        <h1 style="font-size:2.5rem;font-weight:900;letter-spacing:-0.04em;margin-bottom:0.75rem;position:relative;">LIVE LESSONS</h1>
        <p class="hero-sub" style="margin:0 auto;position:relative;">Interactive sessions hosted by expert instructors. Join the conversation and learn in real-time.</p>
      </div>
      <div class="section-card" style="margin-top:1.25rem;">
        <div class="lessons-table">
          <div class="lessons-table-header">
            <span>Subject</span>
            <span>Topic</span>
            <span>Time</span>
            <span>Action</span>
          </div>
          ${rows}
          <div class="lessons-footer">
            <div class="flex items-center gap-2">
              <span class="pulse-dot"></span>
              <strong style="color:var(--text);font-size:0.8125rem;">${PORTAL_DATA.lessons.length} Lessons Live Today</strong>
            </div>
            <div class="lessons-nav-btns">
              <button class="lessons-nav-btn">${UI.icon('chevron_l')}</button>
              <button class="lessons-nav-btn">${UI.icon('chevron_r')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('live', content);

  document.querySelectorAll('.btn-primary.btn-sm').forEach(btn => {
    btn.addEventListener('click', () => UI.toast('Joining class… Please wait.', 'info'));
  });
}

/* =============================================
   CLASS NOTES PAGE
   ============================================= */
async function renderNotes() {
  if (!Auth.guard()) return;

  let notes = getNotes();
  if (notes.length === 0) {
    try {
      const result = await API.notes.getAll();
      const fetched = result.data || result.notes || [];
      if (fetched.length > 0) {
        writeJson(DATA_KEYS.notes, fetched);
        notes = getNotes();
      }
    } catch (e) {
      console.error('[App] Failed to fetch notes:', e);
    }
  }

  function buildRows(notes) {
    if (!notes.length) return '<tr><td colspan="6" style="text-align:center;padding:2rem;">No notes available</td></tr>';
    return notes.map((n, i) => `
      <tr style="animation-delay:${i * 0.05}s">
        <td>
          <div class="subject-cell" style="color:${n.iconColor}">
            <span style="font-size:1rem">${n.icon}</span>
            ${n.subject}
          </div>
        </td>
        <td style="font-size:0.8rem;color:var(--text-muted);text-align:center;">${String(n.week).padStart(2, '0')}</td>
        <td>
          <div class="note-title">${n.title}</div>
          <div class="note-desc">${n.desc}</div>
        </td>
        <td><span class="term-badge">${n.term || 'Second Term'}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted);">${n.date}</td>
        <td>
          ${n.fileData ? `
            <a href="${n.fileData}" download="${n.fileName || 'note.pdf'}" class="dl-btn" title="Download" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:var(--maroon-bg);color:var(--maroon);border-radius:8px;text-decoration:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
          ` : `<button class="dl-btn" title="No file">-</button>`}
        </td>
      </tr>
    `).join('');
  }

  let currentNotes = getNotes();

  const content = `
    <div class="page">
      <div class="hero-banner">
        <h1 class="hero-title"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> My Class Notes</h1>
        <p class="hero-sub">Access your study materials anytime. Click on a note to view details or download the PDF for offline study.</p>
      </div>

      <div class="section-card" style="margin-top:1.25rem;">
        <div class="section-header">
          <div>
            <h3 style="display:flex;align-items:center;gap:0.5rem;">
              Available Notes
              <span style="font-size:0.68rem;font-weight:700;color:var(--maroon);background:var(--maroon-bg);padding:0.15rem 0.5rem;border-radius:99px;letter-spacing:0.06em;">${currentNotes.length} NOTES</span>
            </h3>
          </div>
          <div class="notes-filters">
            <select class="select-inp" id="term-filter">
              <option value="all">All Terms</option>
              <option value="First Term">First Term</option>
              <option value="Second Term" selected>Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
            <div class="search-inp-wrap">
              ${UI.icon('search')}
              <input type="text" class="search-inp" id="note-search" placeholder="Search notes…" />
            </div>
          </div>
        </div>
        <div class="notes-table">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th style="text-align:center">Week</th>
                <th>Classnote Title</th>
                <th>Term</th>
                <th>Date</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody id="notes-body">${buildRows(currentNotes)}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('notes', content);

  document.getElementById('term-filter').addEventListener('change', function () {
    const term = this.value;
    let filtered = term === 'all' ? getNotes() : getNotes().filter(n => n.term === term);
    document.getElementById('notes-body').innerHTML = buildRows(filtered);
  });

  document.getElementById('note-search').addEventListener('input', function () {
    const search = this.value.toLowerCase();
    const filtered = getNotes().filter(n =>
      n.title.toLowerCase().includes(search) ||
      n.subject.toLowerCase().includes(search) ||
      n.desc.toLowerCase().includes(search)
    );
    document.getElementById('notes-body').innerHTML = buildRows(filtered);
  });
}

/* =============================================
   MCQ EXAMS PAGE
   ============================================= */
function renderMCQ() {
  if (!Auth.guard()) return;
  const user = Auth.current();

  function examStatusBadge(status, startTime) {
    if (status === 'active') return `<span class="status-badge" style="background:#10B981;">READY</span>`;
    if (status === 'scheduled' || status === 'upcoming') return `<span class="status-badge" style="background:#F59E0B;">SCHEDULED</span>`;
    return `<span class="status-badge" style="background:#6B7280;">NOT AVAILABLE</span>`;
  }

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><h4>No MCQ Exams</h4><p>No multiple choice exams available at the moment.</p></div>`;
    
    return list.map((e, i) => {
      const isActive = e.status === 'active';
      const isScheduled = e.status === 'scheduled' || e.status === 'upcoming';
      const startTime = e.startTime ? new Date(e.startTime).getTime() : null;
      const now = Date.now();
      const isReady = isActive || (isScheduled && startTime && now >= startTime);
      const isSubmitted = hasStudentSubmitted(e.id, user.id);

      let buttonHtml = '';
      if (isSubmitted) {
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Submitted</button>`;
      } else if (!isReady) {
        const startStr = startTime ? new Date(startTime).toLocaleString() : 'later';
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${startStr}</button>`;
      } else {
        buttonHtml = `<button class="btn btn-primary btn-block btn-sm" onclick="viewExam('${e.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Start Exam</button>`;
      }

      return `
      <div class="ecg-card" style="animation-delay:${i * 0.06}s; opacity: ${isReady ? '1' : '0.7'};">
        <div class="ecg-card-top">
          <div class="ecg-icon" style="background:${e.bg || '#7B1D3C'};">
            <span>${e.icon || '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'}</span>
          </div>
          ${examStatusBadge(e.status, e.startTime)}
        </div>
        <div class="ecg-title">${e.title}</div>
        <div class="ecg-desc">${e.desc}</div>
        <div class="ecg-meta">
          <div class="ecg-meta-row">${UI.icon('clock')} Duration: ${e.duration} mins</div>
          <div class="ecg-meta-row">${UI.icon('question')} Questions: ${Array.isArray(e.questionsList) ? e.questionsList.length : (typeof e.questions === 'number' ? e.questions : (Array.isArray(e.questions) ? e.questions.length : 0))}</div>
          ${isScheduled && startTime ? `<div class="ecg-meta-row" style="color:#F59E0B;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${new Date(startTime).toLocaleString()}</div>` : ''}
        </div>
        ${buttonHtml}
      </div>
    `}).join('');
  }

  let currentList = getExams().filter(e => (e.format === 'mcq' || !e.format) && (e.category === 'exam' || !e.category));

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;">
        <div class="hero-eyebrow">Academic Session 2024/2025</div>
        <h1 class="hero-title">Multiple Choice Exams</h1>
        <p class="hero-sub">View and manage your scheduled MCQ assessments.</p>
      </div>
      <div class="section-card" style="margin-top:1.25rem;">
        <div class="section-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="font-size:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
            <h3>Available MCQ Exams</h3>
          </div>
        </div>
        <div style="padding:1rem 1.25rem;">
          <div class="exams-card-grid" id="mcq-grid">${buildCards(currentList)}</div>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('mcq', content);
}

/* =============================================
   THEORY EXAMS PAGE
   ============================================= */
function renderTheory() {
  if (!Auth.guard()) return;
  const user = Auth.current();

  function examStatusBadge(status) {
    if (status === 'upcoming') return `<span class="status-badge status-upcoming">UPCOMING</span>`;
    if (status === 'new') return `<span class="status-badge status-new">NEW</span>`;
    if (status === 'active') return `<span class="status-badge status-active" style="background:#10B981;">ACTIVE</span>`;
    return `<span class="status-badge status-not-started">NOT STARTED</span>`;
  }

  function buildCards(list) {
    if (!list.length) return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️</div><h4>No Theory Exams</h4><p>No theory exams available at the moment.</p></div>`;
    return list.map((e, i) => {
      const now = Date.now();
      const startTime = e.startTime ? new Date(e.startTime).getTime() : 0;
      const isReady = e.status === 'active' || ((e.status === 'scheduled' || e.status === 'upcoming') && startTime && now >= startTime);
      const isSubmitted = hasStudentSubmitted(e.id, user.id);
      
      let buttonHtml = '';
      if (isSubmitted) {
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Submitted</button>`;
      } else if (!isReady) {
        const startStr = startTime ? new Date(startTime).toLocaleString() : 'later';
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6; cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${startStr}</button>`;
      } else if (e.fileData) {
        buttonHtml = `<button class="btn btn-primary btn-block btn-sm" onclick="viewExam('${e.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> View Questions</button>`;
      } else {
        buttonHtml = `<button class="btn btn-primary btn-block btn-sm start-theory-btn"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️ Start Exam</button>`;
      }
      
      return `
      <div class="ecg-card" style="animation-delay:${i * 0.06}s">
        <div class="ecg-card-top">
          <div class="ecg-icon" style="background:${e.bg || '#B87A00'};">
            <span>${e.icon || '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️'}</span>
          </div>
          ${examStatusBadge(e.status)}
        </div>
        <div class="ecg-title">${e.title}</div>
        <div class="ecg-desc">${e.desc}</div>
        <div class="ecg-meta">
          <div class="ecg-meta-row">${UI.icon('clock')} Duration: ${e.duration} mins</div>
          <div class="ecg-meta-row">${UI.icon('question')} Questions: ${e.questions || 0}</div>
        </div>
        ${buttonHtml}
      </div>
    `}).join('');
  }

  let currentList = getExams().filter(e => e.format === 'theory');

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;">
        <div class="hero-eyebrow">Academic Session 2024/2025</div>
        <h1 class="hero-title">Theory Examinations</h1>
        <p class="hero-sub">View and manage your scheduled theory assessments.</p>
      </div>
      <div class="section-card" style="margin-top:1.25rem;">
        <div class="section-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="font-size:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️</span>
            <h3>Available Theory Exams</h3>
          </div>
        </div>
        <div style="padding:1rem 1.25rem;">
          <div class="exams-card-grid" id="theory-grid">${buildCards(currentList)}</div>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('theory', content);

  document.querySelectorAll('.start-theory-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.ecg-card');
      const title = card.querySelector('.ecg-title')?.textContent;
      const exams = getExams();
      const exam = exams.find(e => e.title === title);
        if (exam) {
         if (isExamLocked(exam.id, user.id)) {
           UI.toast('You have already submitted this exam! You cannot re-enter.', 'error');
           return;
         }
        // Check if exam is ready
        const now = Date.now();
        const startTime = exam.startTime ? new Date(exam.startTime).getTime() : 0;
        const isReady = exam.status === 'active' || ((exam.status === 'scheduled' || exam.status === 'upcoming') && startTime && now >= startTime);
        if (!isReady) {
          const startStr = startTime ? new Date(startTime).toLocaleString() : 'later';
          UI.toast('This exam starts at ' + startStr, 'info');
          return;
        }
        sessionStorage.setItem('currentTheoryExam', exam.id);
        Router.go('theory-session');
      }
    });
  });
}

/* =============================================
   THEORY SESSION PAGE (TIMED EXAM)
   ============================================= */
function renderTheorySession() {
  try {
    if (!Auth.guard()) {
      UI.toast('Please login first', 'error');
      Router.go('login');
      return;
    }
    
    const user = Auth.current();
    const examId = sessionStorage.getItem('currentTheoryExam');
    
    if (!examId) {
      UI.toast('No exam selected', 'error');
      Router.go('theory');
      return;
    }
    
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);

    if (!exam) {
      UI.toast('Exam not found!', 'error');
      Router.go('theory');
      return;
    }
    
    // Check format
    if (exam.format !== 'theory') {
      UI.toast('This is not a theory exam', 'error');
      Router.go('theory');
      return;
    }

    if (isExamLocked(examId, user.id)) {
      UI.toast('You have already submitted this exam! You cannot re-enter.', 'error');
      Router.go('theory');
      return;
    }

    const now = Date.now();
    const startTime = exam.startTime ? new Date(exam.startTime).getTime() : 0;
    if ((exam.status === 'scheduled' || exam.status === 'upcoming') && now < startTime) {
      UI.toast('Exam has not started yet! Starts at: ' + new Date(startTime).toLocaleString(), 'error');
      Router.go('theory');
      return;
    }

    const duration = parseInt(exam.duration) || 60;
    const questions = exam.questionsList || [];
    
    console.log('Theory Exam:', exam);
    console.log('Questions:', questions);
    console.log('Has file:', !!exam.fileData);

    const content = `
    <div class="exam-session-page" style="padding:0; max-width:none;">
      <div style="position:sticky; top:0; z-index:100; background:var(--bg); border-bottom:1px solid var(--border); padding:1rem 2rem; display:flex; flex-direction:column; gap:0.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div style="flex:1; min-width:200px;">
            <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin:0;">${exam.title}</h2>
            <p style="font-size:0.875rem; color:var(--text-secondary); margin:0.25rem 0 0 0;">Duration: ${duration} minutes | Questions: ${questions.length}${questions.length > 0 ? ' | Total Marks: ' + questions.reduce((sum, q) => sum + (q.marks || 5), 0) : ''}</p>
          </div>
          <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
            <div id="exam-timer" style="font-size:1.5rem; font-weight:800; color:var(--maroon); background:#FEF2F2; padding:0.5rem 1rem; border-radius:8px; font-variant-numeric:tabular-nums;">
              ${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}:00
            </div>
            <button id="theory-submit-btn" onclick="submitTheoryExam()" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px; font-weight:700; white-space:nowrap;">
              <i class="fas fa-paper-plane"></i> Submit
            </button>
          </div>
        </div>
        <div id="theory-offline-banner" style="display:none; background:#FEF2F2; border:2px solid #DC2626; border-radius:8px; padding:0.5rem 1rem; text-align:center; font-size:0.8rem; font-weight:600; color:#DC2626;">
          <span style="display:inline-block;width:8px;height:8px;background:#DC2626;border-radius:50%;margin-right:0.5rem;animation:pulse 1.5s ease-in-out infinite;"></span>
          Server is offline — do not submit. Your progress is saved locally. Wait until the server reconnects.
        </div>
      </div>

      <div style="padding:2rem; max-width:900px; margin:0 auto;">
        ${questions.length > 0 ? questions.map((q, idx) => `
          <div class="theory-question-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; margin-bottom:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1.5rem;">
              <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <span style="width:48px; height:48px; background:var(--maroon); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.25rem; flex-shrink:0;">Q${idx + 1}</span>
                <div style="flex:1; min-width:200px;">
                  <p style="font-size:1.05rem; font-weight:600; color:var(--text-primary); margin:0; line-height:1.5;">${q.text || q.question || 'No question text'}</p>
                  <span style="font-size:0.75rem; color:var(--text-muted);">Marks: ${q.marks || 5}</span>
                </div>
              </div>
            </div>
            <div style="margin-top:1.5rem;">
              <label style="display:block; font-size:0.875rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.75rem;">Your Answer:</label>
              <textarea
                class="theory-answer-input"
                data-question="${q.id || 'q' + idx}"
                rows="6"
                placeholder="Type your answer here..."
                style="width:100%; min-height:150px; font-family:'Inter', sans-serif; font-size:0.95rem; line-height:1.6; resize:vertical; padding:1rem; border:1px solid var(--border); border-radius:8px; background:var(--bg-card);"
              ></textarea>
            </div>
          </div>
        `).join('') : '<div style="text-align:center; padding:3rem; color:var(--text-muted); background:var(--bg-card); border-radius:16px; margin-bottom:1.5rem;"><p style="font-size:1.25rem; font-weight:600; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Question Paper Only</p><p>The teacher has uploaded a question paper. Please download it and write your answers on paper.</p></div>'}

        ${exam.fileData ? `
          <div style="background:var(--bg-card2); border:1px solid var(--border); border-radius:16px; padding:1.5rem; margin-bottom:1.5rem;">
            <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin:0 0 1rem 0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Question Paper</h3>
            <div style="background:white; border-radius:8px; padding:1rem; text-align:center;">
              <p style="color:var(--text-secondary); margin-bottom:1rem;">${exam.fileName || 'Download the question paper'}</p>
              ${exam.fileData.startsWith('data:') ? `<a href="${exam.fileData}" download="${exam.fileName || 'question.pdf'}" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px;"><i class="fas fa-download"></i> Download</a>` : '<p style="color:var(--text-muted); font-size:0.875rem;">File uploaded by teacher</p>'}
            </div>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:center; margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border);">
          <button onclick="submitTheoryExam()" class="btn btn-primary" style="padding:1rem 3rem; border-radius:12px; font-weight:800; font-size:1.125rem;">
            <i class="fas fa-check-circle"></i> SUBMIT EXAM
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = content;

  let timeRemaining = duration * 60;
  const timerEl = document.getElementById('exam-timer');

  window.theoryTimer = setInterval(() => {
    timeRemaining--;
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (timeRemaining < 300) {
      timerEl.style.background = '#FEF2F2';
      timerEl.style.color = '#DC2626';
    } else if (timeRemaining < 600) {
      timerEl.style.background = '#FFFBEB';
      timerEl.style.color = '#B45309';
    }

    if (timeRemaining <= 0) {
      clearInterval(window.theoryTimer);
      UI.toast('Time is up! Submitting your exam...', 'error');
      submitTheoryExam();
    }
  }, 1000);

  window.currentTheoryExam = exam;

  // ---- Offline detection for theory session ----
  function updateTheoryOfflineState() {
    const online = window.API && typeof API.isServerOnline === 'function' ? API.isServerOnline() : true;
    const banner = document.getElementById('theory-offline-banner');
    const btn = document.getElementById('theory-submit-btn');
    if (banner) banner.style.display = online ? 'none' : 'block';
    if (btn) {
      btn.disabled = !online;
      btn.style.opacity = online ? '1' : '0.5';
      btn.style.cursor = online ? 'pointer' : 'not-allowed';
    }
  }
  updateTheoryOfflineState();
  window.addEventListener('yems:server-down', updateTheoryOfflineState);
  window.addEventListener('yems:server-up', updateTheoryOfflineState);

  // Prevent leaving before time is up
  window.addEventListener('beforeunload', function handleBeforeUnload(e) {
    if (timeRemaining > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  
  } catch (error) {
    console.error('Error in renderTheorySession:', error);
    UI.toast('Error loading exam: ' + error.message, 'error');
    Router.go('theory');
  }
}

window.submitTheoryExam = async function() {
  if (window._submittingExam) return;
  if (window.API && typeof API.isServerOnline === 'function' && !API.isServerOnline()) {
    UI.toast('Cannot submit while server is offline. Please wait for reconnection.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;
  
  window._submittingExam = true;
  
  // Disable submit buttons
  document.querySelectorAll('[onclick="submitTheoryExam()"]').forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });

  try {
    const user = Auth.current();
    const exam = window.currentTheoryExam;
    if (!exam) return;
    
    // Set localStorage lockout flag IMMEDIATELY
    const lockoutKey = `yems_exam_locked_${exam.id}_${user?.id || 'unknown'}`;
    localStorage.setItem(lockoutKey, JSON.stringify({
      lockedAt: new Date().toISOString(),
      examId: exam.id,
      studentId: user?.id
    }));
    
    const answers = [];
    document.querySelectorAll('.theory-answer-input').forEach(textarea => {
      answers.push({ questionId: textarea.dataset.question, answer: textarea.value });
    });
    
    await addSubmission({
      examId: exam.id,
      studentId: user.id,
      answers: {
        type: 'theory',
        responses: answers
      }
    });
    
    if (window.theoryTimer) clearInterval(window.theoryTimer);
    
    // Show completion overlay instead of just navigating away
    showSubmissionOverlay({
      examTitle: exam.title || 'Exam',
      subject: exam.subject || '',
      success: true,
      message: 'Exam submitted successfully!'
    });
    
  } catch (error) {
    if (error.status === 409) {
      showSubmissionOverlay({
        examTitle: (window.currentTheoryExam?.title) || 'Exam',
        subject: (window.currentTheoryExam?.subject) || '',
        success: true,
        message: 'You have already submitted this exam.'
      });
    } else {
      UI.toast('Failed to submit: ' + error.message, 'error');
      document.querySelectorAll('[onclick="submitTheoryExam()"]').forEach(btn => {
        btn.disabled = false;
        btn.textContent = 'Submit Exam';
        btn.style.opacity = '';
        btn.style.cursor = '';
      });
    }
  } finally {
    window._submittingExam = false;
  }
};


/* =============================================
   ASSIGNMENTS PAGE
   ============================================= */
function renderAssign() {
  if (!Auth.guard()) return;
  let activeFilter = 'active';

  function buildCards(f) {
    const filtered = getAssignments().filter(a => {
      if (f === 'all') return true;
      // Default to 'active' if no status is set (for backward compatibility)
      return (a.status || 'active') === f;
    });
    if (!filtered.length) return `
      <div style="grid-column:1/-1;">
        <div class="empty-state" style="padding:3rem;">
          <div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h4>All Done!</h4>
          <p>No assignments found in this category.</p>
        </div>
      </div>`;
    return filtered.map(a => {
      const actionBtns = (a.actions || ['submit']).map(act => {
        if (act === 'continue') return `<button class="btn btn-outline btn-sm">Continue</button>`;
        if (act === 'quiz') return `<button class="btn btn-ghost btn-sm">Start Quiz</button>`;
        return `<button class="btn btn-primary btn-sm">Submit Now</button>`;
      }).join('');
      return `
        <div class="assign-card" data-assign-id="${a.id}">
          <div class="assign-card-header">
            <div class="assign-subject">
              <span class="assign-subject-icon">${a.icon}</span>
              <span style="color:${a.iconColor}">${a.subject}</span>
            </div>
            <span class="assign-due ${a.dueClass}">${a.dueLabel}</span>
          </div>
          <div class="assign-body">
            <div class="assign-title">${a.title}</div>
            <div class="assign-desc">${a.desc}</div>
            <div class="assign-footer">
              <div class="assign-time">${UI.icon('clock')} ${a.est} est.</div>
              ${actionBtns}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  const content = `
    <div class="page">
      <div class="assignments-top">
        <div class="search-wrap-wide">
          ${UI.icon('search')}
          <input type="text" class="search-wide" placeholder="Search assignments, topics…" />
        </div>
        <button class="topbar-icon-btn" title="Filter">${UI.icon('settings')}</button>
      </div>

      <div class="page-header-row">
        <div>
          <h2>My Assignments</h2>
          <p>Manage your pending tasks and track your progress.</p>
        </div>
        <div class="filter-tabs">
          <button class="filter-tab active" data-af="active">Active</button>
          <button class="filter-tab" data-af="completed">Completed</button>
        </div>
      </div>

      <div class="assign-filters">
        <select class="select-inp" style="width:auto;">
          <option>All Subjects</option>
          <option>Mathematics</option>
          <option>History</option>
          <option>Physics</option>
          <option>Chemistry</option>
        </select>
        <select class="select-inp" style="width:auto;">
          <option>Due Date: Earliest</option>
          <option>Due Date: Latest</option>
        </select>
      </div>

      <div class="assignments-grid" id="assign-grid">${buildCards('active')}</div>
    </div>
  `;

  UI.buildPortal('assign', content);

  document.querySelectorAll('.filter-tab[data-af]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab[data-af]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const f = tab.dataset.af;
      document.getElementById('assign-grid').innerHTML = buildCards(f === 'completed' ? 'completed' : 'active');
    });
  });

  document.querySelectorAll('.btn.btn-sm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.assign-card');
      const assignId = card.dataset.assignId;
      const title = card.querySelector('.assign-title').textContent;
      const subject = card.querySelector('.assign-subject').textContent.trim();
      showSubmitModal(assignId, title, subject);
    });
  });

  function showSubmitModal(assignId, title, subject) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-header">
          <h3>Submit Assignment</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:1rem;"><strong>${title}</strong></p>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1.5rem;">Subject: ${subject}</p>
          <div class="form-group">
            <label class="form-label">Your Answer / Upload File</label>
            <div id="student-drop-zone" class="drop-zone" style="border: 2px dashed var(--border); border-radius:12px; padding:2rem; text-align:center; cursor:pointer; transition:all 0.2s; background:#FDFDFD;">
              <input type="file" id="student-submit-file" class="file-input" style="display:none;" />
              <span style="font-size:2rem; display:block; margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>
              <p style="font-weight:600; margin-bottom:0.5rem;">Click to upload or drag and drop</p>
              <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">All file types supported (MAX. 25MB)</p>
              <div id="student-file-preview" style="display:none; margin-top:1rem; padding:0.75rem; background:#E8F7F1; border-radius:8px; color:#2D9B6F; font-weight:600;"></div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Comments (Optional)</label>
            <textarea class="form-input" id="submit-comments" style="height:80px; resize:none;" placeholder="Add any comments for your teacher..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" id="submit-assign-btn">Submit Assignment</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const dropZone = document.getElementById('student-drop-zone');
    const fileInput = document.getElementById('student-submit-file');
    const preview = document.getElementById('student-file-preview');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.style.borderColor = '#7B1D3C';
      dropZone.style.background = '#FDF0F3';
    });

    dropZone.addEventListener('dragleave', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      dropZone.style.background = '#FDFDFD';
    });

    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      dropZone.style.background = '#FDFDFD';
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        preview.textContent = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ' + e.dataTransfer.files[0].name;
        preview.style.display = 'block';
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        preview.textContent = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ' + fileInput.files[0].name;
        preview.style.display = 'block';
      }
    });

    document.getElementById('submit-assign-btn').addEventListener('click', async () => {
      if (window._submittingExam) return;
      window._submittingExam = true;
      
      const btn = document.getElementById('submit-assign-btn');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      btn.style.opacity = '0.5';

      try {
        const file = fileInput.files[0];
        const comments = document.getElementById('submit-comments').value;
        const user = Auth.current();
        
        let fileData = null;
        let fileName = null;
        if (file) {
          fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
          fileName = file.name;
        }

        await addSubmission({
          assignmentId: assignId,
          studentId: user.id,
          answers: {
            type: 'assignment-upload',
            fileData,
            fileName,
            comments
          }
        });
        
        UI.toast('Assignment submitted successfully!', 'success');
        modal.remove();
        renderAssign();
      } catch (error) {
        if (error.status === 409) {
          UI.toast('You have already submitted this assignment.', 'warning');
          modal.remove();
          renderAssign();
        } else {
          UI.toast('Failed to submit: ' + error.message, 'error');
          btn.disabled = false;
          btn.textContent = originalText;
          btn.style.opacity = '';
        }
      } finally {
        window._submittingExam = false;
      }
    });
  }
}

/* =============================================
   MID-TERM TESTS PAGE
   ============================================= */
async function renderTests() {
  if (!Auth.guard()) return;
  const user = Auth.current();
  await ensureStudentExamCache();

  function examStatusBadge(status, isSubmitted) {
    if (isSubmitted) return `<span class="status-badge" style="background:#10B981;">ANSWERED</span>`;
    if (status === 'upcoming') return `<span class="status-badge status-upcoming">UPCOMING</span>`;
    if (status === 'new') return `<span class="status-badge status-new">NEW</span>`;
    return `<span class="status-badge status-not-started">NOT STARTED</span>`;
  }

  function buildCards(list, user) {
    if (!list.length) return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><h4>No Mid-Term Tests</h4><p>No mid-term tests available at the moment.</p></div>`;
    return list.map((e, i) => {
      const isSubmitted = hasStudentSubmitted(e.id, user.id);
      const startTime = e.startTime ? new Date(e.startTime).getTime() : null;
      const now = Date.now();
      const isReady = e.status === 'active' || ((e.status === 'scheduled' || e.status === 'upcoming') && startTime && now >= startTime);

      let buttonHtml = '';
      if (isSubmitted) {
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6;cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Submitted</button>`;
      } else if (!isReady) {
        const startStr = startTime ? new Date(startTime).toLocaleString() : 'later';
        buttonHtml = `<button class="btn btn-secondary btn-block btn-sm" disabled style="opacity:0.6;cursor:not-allowed;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${startStr}</button>`;
      } else {
        buttonHtml = `<button class="btn btn-primary btn-block btn-sm start-test-btn" onclick="viewExam('${e.id}')">${e.questionsList && e.questionsList.length > 0 ? 'Start Test' : (e.fileData ? 'View Questions' : 'Start Test')}</button>`;
      }

      return `
      <div class="ecg-card" style="animation-delay:${i * 0.06}s">
        <div class="ecg-card-top">
          <div class="ecg-icon" style="background:${e.bg || '#7B1D3C'};">
            <span>${e.icon || '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'}</span>
          </div>
          ${examStatusBadge(e.status, isSubmitted)}
        </div>
        <div class="ecg-title">${e.title}</div>
        <div class="ecg-desc">${e.desc}</div>
        <div class="ecg-meta">
          <div class="ecg-meta-row">${UI.icon('clock')} Duration: ${e.duration} mins</div>
          <div class="ecg-meta-row">${UI.icon('question')} Questions: ${e.questions}</div>
        </div>
        ${buttonHtml}
      </div>
    `}).join('');
  }

  const currentList = getExams().filter(e => e.type === 'midterm');
  if (!currentList.length && !RUNTIME_STATE.testsRouteRefreshed) {
    RUNTIME_STATE.testsRouteRefreshed = true;
    window.DataSync?.refreshResource('exams')
      .then(() => renderTests())
      .catch(() => {});
  }

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;">
        <div class="hero-eyebrow">Academic Session 2024/2025</div>
        <h1 class="hero-title">Mid-Term Tests</h1>
        <p class="hero-sub">View your scheduled mid-term tests. Ensure you have a stable connection.</p>
      </div>
      <div class="section-card" style="margin-top:1.25rem;">
        <div class="section-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="font-size:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
            <h3>Your Tests</h3>
          </div>
        </div>
        <div style="padding:1rem 1.25rem;">
          ${currentList.length === 0 ? '<div style="text-align:center; padding:3rem; color:var(--text-muted);">No tests available right now. Check back later!</div>' : '<div class="exams-card-grid">' + buildCards(currentList, user) + '</div>'}
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('tests', content);
}

window.viewExam = function (examId) {
  const user = Auth.current();
  const exams = getExams();
  const exam = exams.find(e => e.id === examId);

  // Check if exam is active or scheduled and time has passed
  const now = Date.now();
  const startTime = exam.startTime ? new Date(exam.startTime).getTime() : null;
  const isReady = exam.status === 'active' || ((exam.status === 'scheduled' || exam.status === 'upcoming') && startTime && now >= startTime);

  if (!exam || !isReady) {
    const startStr = startTime ? new Date(startTime).toLocaleString() : 'later';
    UI.toast('This test starts at ' + startStr, 'info');
    return;
  }

  // Check if student already submitted this exam
  if (exam.format === 'theory') {
    if (isExamLocked(examId, user.id)) {
      UI.toast('You have already submitted this exam! You cannot re-enter.', 'error');
      return;
    }
    // Route theory exams to full-screen theory session
    sessionStorage.setItem('currentTheoryExam', examId);
    Router.go('theory-session');
    return;
  }
  
  if (isExamLocked(examId, user.id)) {
    UI.toast('You have already submitted this exam! You cannot re-enter.', 'error');
    return;
  }
  if (!exam) return;

  // MCQ exams continue with modal view
  if (exam.fileData || exam.questionsList) {
    const questions = exam.questionsList || [];
    const isPDF = exam.fileName && exam.fileName.toLowerCase().endsWith('.pdf');
    const user = Auth.current();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'exam-modal';

    const optionLabels = ['A', 'B', 'C', 'D'];
    
    let questionsHTML = '';
    if (questions.length > 0) {
      questionsHTML = questions.map((q, idx) => `
        <div class="test-question mcq-question" data-qindex="${idx}" style="background:white; padding:1.5rem; margin-bottom:1rem; border-radius:12px; border:1px solid var(--border); ${idx > 0 ? 'display:none;' : ''}">
          <p style="font-weight:700; font-size:1.1rem; margin-bottom:1.5rem; line-height:1.6; text-align:left;"><span style="color:#7B1D3C; background:#fef2f5; padding:0.25rem 0.75rem; border-radius:6px; margin-right:0.5rem;">Q${idx + 1}</span></p>
          <p style="font-weight:600; font-size:1.05rem; margin-bottom:1.25rem; line-height:1.6; text-align:left;">${q.text || q.question}</p>
          ${q.options ? `
            <div class="mcq-options-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              ${q.options.map((opt, oIdx) => `
                <label class="mcq-option-btn" data-q="${idx}" data-opt="${oIdx}" style="display:flex; align-items:center; padding:1.25rem 1.5rem; border-radius:12px; border:2px solid var(--border); cursor:pointer; transition:all 0.2s; background:white;">
                  <span class="opt-letter" style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; background:#7B1D3C; color:white; font-weight:900; font-size:1.25rem; border-radius:10px; margin-right:1rem;">${optionLabels[oIdx]}</span>
                  <span class="opt-text" style="flex:1; font-size:1rem; font-weight:500;">${opt}</span>
                  <input type="radio" name="q${idx}" value="${oIdx}" style="display:none;">
                </label>
              `).join('')}
            </div>
          ` : `<textarea class="form-input" name="q${idx}" rows="4" placeholder="Write your answer here..." style="width:100%;"></textarea>`}
        </div>
      `).join('');
    }

    modal.innerHTML = `
      <div class="modal" style="position:fixed; top:0; left:0; right:0; bottom:0; max-width:100%; max-height:100%; width:100%; height:100%; display:flex; flex-direction:column; border-radius:0; z-index:9999;">
        <!-- Header with student info -->
        <div style="background:linear-gradient(135deg, #7B1D3C 0%, #5E1530 100%); padding:0.75rem 1.5rem; color:white; flex-shrink:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
              <div style="background:rgba(255,255,255,0.2); padding:0.5rem 1rem; border-radius:8px;">
                <span style="font-weight:900; font-size:1.5rem;" id="timer">${exam.duration}:00</span>
              </div>
              <span style="font-size:0.8rem; opacity:0.9;">remaining</span>
            </div>
            <div style="text-align:center;">
              <div style="font-weight:800; font-size:1.1rem;">${exam.title}</div>
              <div style="font-size:0.75rem; opacity:0.85;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> ${exam.subject || 'General'} | ⏱️ ${exam.duration} mins | <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${questions.length} Questions</div>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:1rem;">
              <div>
                <div style="font-weight:700; font-size:0.95rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${user?.name || 'Student'}</div>
                <div style="font-size:0.75rem; opacity:0.85;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> ${user?.class || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Offline warning banner (hidden by default) -->
        <div id="exam-offline-banner" style="display:none; background:#FEF2F2; border-bottom:2px solid #DC2626; padding:0.5rem 1.5rem; text-align:center; font-size:0.85rem; font-weight:600; color:#DC2626;">
          <span class="server-down-pulse" style="display:inline-block;width:8px;height:8px;background:#DC2626;border-radius:50%;margin-right:0.5rem;animation:pulse 1.5s ease-in-out infinite;"></span>
          Server is offline — do not submit. Your progress is saved locally. Wait until the server reconnects.
        </div>
        
        <!-- Body: Left Sidebar + Main Content -->
        <div style="flex:1; display:flex; overflow:hidden;">
          <!-- Left Sidebar: Question Palette -->
          <aside class="cbt-sidebar" style="width:240px; min-width:200px; background:white; border-right:1px solid #e8e0e3; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0;">
            <!-- Stats -->
            <div style="padding:1rem 1.25rem; border-bottom:1px solid #f0e8eb;">
              <div style="font-size:0.8rem; color:#7B1D3C; font-weight:700; margin-bottom:0.75rem;">ATTEMPT</div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; color:#444;">Answered</span>
                <span style="font-weight:800; font-size:1.1rem; color:#2D232E;"><strong id="answered-count">0</strong> / ${questions.length}</span>
              </div>
              <div style="margin-top:0.5rem; height:4px; background:#f0e8eb; border-radius:2px; overflow:hidden;">
                <div class="cbt-progress-bar" style="height:100%; width:0%; background:#7B1D3C; border-radius:2px; transition:width 0.3s;"></div>
              </div>
            </div>
            <!-- Question Grid -->
            <div style="padding:0.75rem 1.25rem; flex:1;">
              <div style="font-size:0.8rem; color:#7B1D3C; font-weight:700; margin-bottom:0.75rem;">QUESTIONS</div>
              <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:0.5rem;" id="q-navigator">
                ${questions.map((_, idx) => `<button class="cbt-q-btn" data-q="${idx}" style="width:100%; aspect-ratio:1; border-radius:8px; border:2px solid #ddd; background:${idx === 0 ? 'white' : '#f9f7f5'}; color:#2D232E; font-weight:700; font-size:0.85rem; cursor:pointer; transition:all 0.15s; display:flex; align-items:center; justify-content:center; ${idx === 0 ? 'border-color:#7B1D3C; box-shadow:0 2px 8px rgba(123,29,60,0.15);' : ''}">${idx + 1}</button>`).join('')}
              </div>
            </div>
            <!-- Legend -->
            <div style="padding:0.75rem 1.25rem; border-top:1px solid #f0e8eb; font-size:0.7rem; color:#888;">
              <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                <span><span style="display:inline-block; width:10px; height:10px; background:#7B1D3C; border-radius:2px; margin-right:0.35rem; vertical-align:middle;"></span>Active</span>
                <span><span style="display:inline-block; width:10px; height:10px; background:#d4edda; border-radius:2px; margin-right:0.35rem; vertical-align:middle;"></span>Answered</span>
                <span><span style="display:inline-block; width:10px; height:10px; background:#f9f7f5; border:1px solid #ddd; border-radius:2px; margin-right:0.35rem; vertical-align:middle;"></span>Unanswered</span>
              </div>
            </div>
          </aside>

          <!-- Main Content Area -->
          <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            <!-- Question indicator -->
            <div style="padding:0.75rem 1.5rem; background:#faf8f9; border-bottom:1px solid #eee; flex-shrink:0;">
              <span style="font-size:0.85rem; color:#7B1D3C; font-weight:700;">Question <strong id="current-q">1</strong> of ${questions.length}</span>
            </div>
            <!-- Scrollable question content -->
            <div style="flex:1; overflow-y:auto; padding:1.5rem; background:#f5f5f5;" id="questions-container">
              ${exam.fileData ? `
                <div style="background:white; padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--border);">
                  <h4 style="margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Question Paper</h4>
                  ${isPDF ? `
                    <iframe src="${exam.fileData}" style="width:100%; height:300px; border:none; border-radius:8px;"></iframe>
                  ` : `
                    <div style="padding:1rem; background:#f9f9f9; border-radius:8px;">
                      <p style="margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> <strong>${exam.fileName}</strong></p>
                      <a href="${exam.fileData}" download="${exam.fileName}" class="btn btn-primary" style="display:inline-block; background:#7B1D3C; color:white; padding:0.5rem 1rem; text-decoration:none; border-radius:6px;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a>
                    </div>
                  `}
                </div>
              ` : ''}
              
              ${questionsHTML ? `
                <div id="questions-section">
                  ${questionsHTML}
                </div>
              ` : `
                <div style="background:white; padding:2rem; border-radius:12px; text-align:center; border:1px solid var(--border);">
                  <p style="margin-bottom:1rem; font-size:1.1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Answer Sheet</p>
                  <p style="color:#666; margin-bottom:1.5rem;">Write your answers on paper or download the question paper to answer.</p>
                  <textarea class="form-input" id="student-answers" rows="10" placeholder="Type your answers here or write them on paper..." style="width:100%;"></textarea>
                </div>
              `}
            </div>
            
            <!-- Footer Navigation -->
            <div style="background:white; padding:0.75rem 1.5rem; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
              <button class="btn btn-ghost" onclick="navigateQ(-1)" id="btn-prev" style="opacity:0.5;">← Previous</button>
              <button class="btn btn-primary" style="background:#7B1D3C; min-width:140px;" onclick="navigateQ(1)" id="btn-next">Next →</button>
            </div>
            <!-- Submit bar -->
            <div style="background:#fef2f5; padding:0.75rem 1.5rem; text-align:center; flex-shrink:0;">
              <button id="exam-submit-btn" class="btn btn-ghost btn-sm" onclick="confirmSubmit('${exam.id}')" style="background:#7B1D3C; color:white; padding:0.75rem 2rem; font-weight:700;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Submit Answers</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Prevent student from leaving the exam page
    window.examInProgress = true;
    
    // Prevent going back
    window.addEventListener('popstate', function(e) {
        if (window.examInProgress) {
            e.preventDefault();
            if (confirm('Are you sure you want to leave? Your progress will be saved but you can continue later.')) {
                window.examInProgress = false;
                history.back();
            } else {
                history.pushState(null, null, window.location.href);
            }
        }
    });
    
    // Prevent closing tab
    window.addEventListener('beforeunload', function(e) {
        if (window.examInProgress) {
            e.preventDefault();
            e.returnValue = 'You are in the middle of an exam. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    const sessionKey = 'yems_exam_' + examId;
    const savedProgress = RUNTIME_STATE.examSessions[sessionKey] || null;
    
    let timeLeft = savedProgress?.timeLeft || exam.duration * 60;
    const answered = savedProgress?.answers ? new Set(Object.keys(savedProgress.answers).map(k => parseInt(k))) : new Set();
    
    const timerEl = document.getElementById('timer');
    const timer = setInterval(() => {
      timeLeft--;
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      // Auto-save progress every 10 seconds
      if (timeLeft % 10 === 0) {
        const currentAnswers = {};
        document.querySelectorAll('.mcq-question').forEach((q, idx) => {
          const selected = q.querySelector(`input[type="radio"]:checked`);
          if (selected) currentAnswers[idx] = parseInt(selected.value);
        });
        RUNTIME_STATE.examSessions[sessionKey] = {
          examId,
          userId: user?.id || 'guest',
          timeLeft,
          answers: currentAnswers,
          lastSaved: Date.now()
        };
      }
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        delete RUNTIME_STATE.examSessions[sessionKey];
        UI.toast('Time is up! Submitting your answers...', 'error');
        submitTest(exam.id);
      }
    }, 1000);
    window.currentExamTimer = timer;

    // Restore saved answers
    if (savedProgress?.answers) {
      Object.entries(savedProgress.answers).forEach(([qIdx, optIdx]) => {
        const btn = document.querySelector(`.mcq-option-btn[data-q="${qIdx}"][data-opt="${optIdx}"]`);
        if (btn) {
          btn.style.borderColor = '#7B1D3C';
          btn.style.background = '#fef2f5';
          btn.querySelector('.opt-letter').style.background = '#10b981';
          btn.querySelector('input[type="radio"]').checked = true;
        }
        // Update sidebar button
        const sidebarBtn = document.querySelector(`.cbt-q-btn[data-q="${qIdx}"]`);
        if (sidebarBtn) {
          sidebarBtn.style.background = '#d4edda';
          sidebarBtn.style.borderColor = '#b7dfb9';
        }
      });
      // Update sidebar progress bar
      const progBar = document.querySelector('.cbt-progress-bar');
      if (progBar) progBar.style.width = Math.round((Object.keys(savedProgress.answers).length / questions.length) * 100) + '%';
    }

    // One question at a time navigation
    let currentQ = 0;
    const totalQ = questions.length;

    window.navigateQ = function(dir) {
      // Handle finish/submit
      if (dir === 'finish') {
        if (confirm('Are you sure you want to submit your answers?')) {
          submitTest(examId);
        }
        return;
      }
      
      const newQ = currentQ + dir;
      if (newQ < 0) return;
      if (newQ >= totalQ) {
        // On last question - submit
        if (confirm('You are on the last question. Submit now?')) {
          submitTest(examId);
        }
        return;
      }
      
      // Save current answer before navigating
      const currentRadio = document.querySelector(`input[name="q${currentQ}"]:checked`);
      if (currentRadio) answered.add(currentQ);
      
      currentQ = newQ;
      updateQuestionView();
    };

    function updateQuestionView() {
      // Hide all questions, show current
      document.querySelectorAll('.mcq-question').forEach((q, idx) => {
        q.style.display = idx === currentQ ? 'block' : 'none';
      });
      
      // Update counter
      document.getElementById('current-q').textContent = currentQ + 1;
      document.getElementById('answered-count').textContent = answered.size;
      
      // Update progress bar
      const progBar = document.querySelector('.cbt-progress-bar');
      if (progBar) progBar.style.width = Math.round((answered.size / totalQ) * 100) + '%';
      
      // Update sidebar question buttons
      document.querySelectorAll('.cbt-q-btn').forEach((btn, idx) => {
        btn.style.background = idx === currentQ ? 'white' : (answered.has(idx) ? '#d4edda' : '#f9f7f5');
        btn.style.borderColor = idx === currentQ ? '#7B1D3C' : (answered.has(idx) ? '#b7dfb9' : '#ddd');
        btn.style.boxShadow = idx === currentQ ? '0 2px 8px rgba(123,29,60,0.15)' : 'none';
      });
      
      // Update buttons
      const prevBtn = document.getElementById('btn-prev');
      const nextBtn = document.getElementById('btn-next');
      
      if (prevBtn) prevBtn.style.opacity = currentQ === 0 ? '0.5' : '1';
      if (nextBtn) {
        nextBtn.textContent = currentQ === totalQ - 1 ? 'Submit →' : 'Next →';
        nextBtn.setAttribute('onclick', currentQ === totalQ - 1 ? "navigateQ('finish')" : 'navigateQ(1)');
      }
    }

    // Option selection - big A,B,C,D buttons
    document.querySelectorAll('.mcq-option-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const qIdx = this.dataset.q;
        const optIdx = this.dataset.opt;
        
        // Remove selected from all options in this question
        document.querySelectorAll(`.mcq-option-btn[data-q="${qIdx}"]`).forEach(b => {
          b.style.borderColor = 'var(--border)';
          b.style.background = 'white';
          b.querySelector('.opt-letter').style.background = '#7B1D3C';
        });
        
        // Select this option
        this.style.borderColor = '#7B1D3C';
        this.style.background = '#fef2f5';
        this.querySelector('.opt-letter').style.background = '#10b981';
        this.querySelector('input[type="radio"]').checked = true;
        
        answered.add(parseInt(qIdx));
        document.getElementById('answered-count').textContent = answered.size;
        
        // Update sidebar button state
        document.querySelectorAll(`.cbt-q-btn[data-q="${qIdx}"]`).forEach(sideBtn => {
          sideBtn.style.background = '#d4edda';
          sideBtn.style.borderColor = '#b7dfb9';
        });
        
        // Update progress bar
        const progBar = document.querySelector('.cbt-progress-bar');
        if (progBar) progBar.style.width = Math.round((answered.size / totalQ) * 100) + '%';
      });
    });

    // Quick navigation buttons (sidebar palette)
    document.querySelectorAll('.cbt-q-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const qIdx = parseInt(this.dataset.q);
        const currentRadio = document.querySelector(`input[name="q${currentQ}"]:checked`);
        if (currentRadio) answered.add(currentQ);
        currentQ = qIdx;
        updateQuestionView();
      });
    });

    // Keyboard navigation (arrow keys, P/N, number keys for answers)
    document.addEventListener('keydown', function(e) {
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'TEXTAREA';
      
      // Number keys 1-4 or letters A-D for selecting MCQ options
      if (!isInput && /^[1-4]$/i.test(e.key)) {
        const optIdx = parseInt(e.key) - 1;
        const opts = document.querySelectorAll(`.mcq-option-btn[data-q="${currentQ}"]`);
        if (opts[optIdx]) {
          opts[optIdx].click();
          UI.toast(`Option ${e.key.toUpperCase()} selected`, 'info', 500);
        }
        e.preventDefault();
        return;
      }
      
      // Letter keys A-D for selecting options
      if (!isInput && /^[A-D]$/i.test(e.key)) {
        const optIdx = e.key.toUpperCase().charCodeAt(0) - 65;
        const opts = document.querySelectorAll(`.mcq-option-btn[data-q="${currentQ}"]`);
        if (opts[optIdx]) {
          opts[optIdx].click();
          UI.toast(`Option ${e.key.toUpperCase()} selected`, 'info', 500);
        }
        e.preventDefault();
        return;
      }
      
      // P or Left Arrow for Previous
      if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        navigateQ(-1);
        e.preventDefault();
        return;
      }
      
      // N or Right Arrow for Next
      if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        navigateQ(1);
        e.preventDefault();
        return;
      }
      
      // S for Submit
      if ((e.key === 's' || e.key === 'S') && !isInput) {
        if (confirm('Submit your answers now?')) {
          submitTest(examId);
        }
        e.preventDefault();
        return;
      }
    });

    // Add keyboard hints to the UI
    const hintBar = document.createElement('div');
    hintBar.id = 'keyboard-hints';
    hintBar.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(123,29,60,0.95); color:white; padding:8px 20px; border-radius:30px; font-size:12px; display:flex; gap:15px; z-index:10000; box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    hintBar.innerHTML = '<span><kbd style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; margin-right:4px;">P</kbd> Previous</span><span><kbd style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; margin-right:4px;">N</kbd> Next</span><span><kbd style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; margin-right:4px;">1-4</kbd> Select</span><span><kbd style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; margin-right:4px;">S</kbd> Submit</span>';
    document.body.appendChild(hintBar);

    // Hide hints after 5 seconds
    setTimeout(() => {
      if (hintBar) hintBar.style.opacity = '0';
      setTimeout(() => hintBar && hintBar.remove(), 500);
    }, 8000);

    // Initialize
    updateQuestionView();

    const banner = document.getElementById('exam-offline-banner');
    const submitBtn = document.getElementById('exam-submit-btn');
    function updateOfflineState() {
      const online = window.API && typeof API.isServerOnline === 'function' ? API.isServerOnline() : true;
      if (banner) banner.style.display = online ? 'none' : 'block';
      if (submitBtn) {
        submitBtn.disabled = !online;
        submitBtn.style.opacity = online ? '1' : '0.5';
        submitBtn.style.cursor = online ? 'pointer' : 'not-allowed';
      }
    }
    updateOfflineState();
    function onStatusChange() { updateOfflineState(); }
    window.addEventListener('yems:server-down', onStatusChange);
    window.addEventListener('yems:server-up', onStatusChange);
    const modalEl = document.getElementById('exam-modal');
    if (modalEl) {
      new MutationObserver((_, obs) => {
        if (!document.body.contains(modalEl)) {
          window.removeEventListener('yems:server-down', onStatusChange);
          window.removeEventListener('yems:server-up', onStatusChange);
          obs.disconnect();
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  } else {
    UI.toast('No question paper uploaded for this exam yet.', 'info');
  }
};

window.confirmSubmit = function(examId) {
  if (window._submittingExam) return;
  if (window.API && typeof API.isServerOnline === 'function' && !API.isServerOnline()) {
    UI.toast('Cannot submit while server is offline. Please wait for reconnection.', 'error');
    return;
  }
  if (confirm('Are you sure you want to submit your answers? You cannot change them after submission.')) {
    submitTest(examId);
  }
};

window.submitTest = async function (examId) {
  if (window._submittingExam) return;
  window._submittingExam = true;

  // Disable submit buttons
  document.querySelectorAll('#exam-modal [onclick*="confirmSubmit"], #exam-modal [onclick*="navigateQ"]').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });

  // Show submitting indicator on the submit button
  const submitBtn = document.querySelector('#exam-modal button[onclick*="confirmSubmit"]');
  if (submitBtn) {
    const originalHtml = submitBtn.innerHTML;
    submitBtn.dataset.originalHtml = originalHtml;
    submitBtn.innerHTML = '<span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spinner-spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span> Submitting...';
  }

  try {
    if (window.currentExamTimer) {
      clearInterval(window.currentExamTimer);
    }
    
    // Clear exam in progress flag
    window.examInProgress = false;
    window.removeEventListener('beforeunload', null);
    
    // Remove keyboard hints bar
    const hintBar = document.getElementById('keyboard-hints');
    if (hintBar) hintBar.remove();
    
    // Clear saved exam progress
    const sessionKey = 'yems_exam_' + examId;
    delete RUNTIME_STATE.examSessions[sessionKey];

    // Set localStorage lockout flag IMMEDIATELY (before API call)
    // This prevents re-entry even if the API submission fails
    const user = Auth.current();
    const lockoutKey = `yems_exam_locked_${examId}_${user?.id || 'unknown'}`;
    localStorage.setItem(lockoutKey, JSON.stringify({
      lockedAt: new Date().toISOString(),
      examId,
      studentId: user?.id
    }));

    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    window._currentSubmittingExam = exam;
    
    let studentAnswers = {};
    let answerText = '';
    let score = null;
    
    // Check if this is an MCQ exam with options
    if (exam && exam.questionsList && exam.questionsList.length > 0) {
      // Collect MCQ answers
      exam.questionsList.forEach((q, idx) => {
        const selected = document.querySelector(`input[name="q${idx}"]:checked`);
        if (selected) {
          studentAnswers[idx] = parseInt(selected.value);
        }
      });
      
      // Calculate score (but don't show to student)
      let correctCount = 0;
      exam.questionsList.forEach((q, idx) => {
        const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : q.correctAnswer);
        if (correctAns !== undefined && studentAnswers[idx] === correctAns) {
          correctCount++;
        }
      });
      
      score = exam.questionsList.length > 0 ? Math.round((correctCount / exam.questionsList.length) * 100) : 0;
      
      // Don't show score to students - only store it
      answerText = 'MCQ Answers submitted';
    } else {
      // Theory exam - get text answers
      const answersEl = document.getElementById('student-answers');
      answerText = answersEl ? answersEl.value : 'Answers submitted';
    }

    await addSubmission({
      examId,
      studentId: user.id,
      answers: {
        selectedAnswers: studentAnswers,
        answerText,
        score,
        totalQuestions: exam && exam.questionsList ? exam.questionsList.length : 0,
        showResultToStudent: false
      }
    });

    // Remove exam modal
    document.getElementById('exam-modal')?.remove();

    // Show completion overlay
    showSubmissionOverlay({
      examTitle: exam?.title || 'Exam',
      subject: exam?.subject || '',
      success: true,
      message: 'Exam submitted successfully! Your result will be available after teacher review.'
    });
    
  } catch (error) {
    const exam = window._currentSubmittingExam;
    if (error.status === 409) {
      // Already submitted - show appropriate message
      document.getElementById('exam-modal')?.remove();
      showSubmissionOverlay({
        examTitle: exam?.title || 'Exam',
        subject: exam?.subject || '',
        success: true,
        message: 'You have already submitted this exam.'
      });
    } else {
      UI.toast('Failed to submit exam: ' + error.message, 'error');
      // Re-enable submit buttons on network error
      document.querySelectorAll('#exam-modal [onclick*="confirmSubmit"], #exam-modal [onclick*="navigateQ"]').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
      });
      if (submitBtn && submitBtn.dataset.originalHtml) {
        submitBtn.innerHTML = submitBtn.dataset.originalHtml;
      }
    }
  } finally {
    window._submittingExam = false;
    window._currentSubmittingExam = null;
  }
};

/* =============================================
   SETTINGS PAGE
   ============================================= */
function renderSettings() {
  if (!Auth.guard()) return;
  const user = Auth.current();

  const content = `
    <div class="page">
      <div class="page-header-row" style="margin-bottom:1.5rem;">
        <div>
          <h2>Account Settings</h2>
          <p>Manage your student portal preferences and security.</p>
        </div>
      </div>
      
      <div class="settings-container">
        <!-- Profile Customization -->
        <div class="settings-card">
          <h3>Basic Customization</h3>
          <p class="sub">Update your personal information below.</p>
          <form class="settings-form" id="profile-form">
           <div class="form-group">
             <label class="form-label">Full Name</label>
             <input type="text" class="form-input" id="set-name" value="${user.name}" required readonly />
           </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" id="set-email" value="${user.email}" required />
            </div>
            <button type="submit" class="btn btn-primary" id="btn-save-profile" style="max-width:160px;">Save Changes</button>
          </form>
        </div>

        <!-- Password Change -->
        <div class="settings-card">
          <h3>Change Password</h3>
          <p class="sub">Ensure your account is using a long, random password to stay secure.</p>
          <form class="settings-form" id="pass-form">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-input" id="set-old-pass" required />
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="set-new-pass" placeholder="Min. 6 characters" required />
            </div>
            <button type="submit" class="btn btn-outline" id="btn-save-pass" style="max-width:180px;">Update Password</button>
          </form>
        </div>

        <!-- Report Issue -->
        <div class="settings-card" style="border-top: 2px solid #F59E0B;">
          <h3 style="color: #F59E0B;">Report an Issue</h3>
          <p class="sub">Having issues? Send a report to the admin for quick resolution.</p>
          <form class="settings-form" id="report-form">
            <div class="form-group">
              <label class="form-label">Issue Category</label>
              <select class="form-input" id="report-category" required>
                <option value="">Select Category</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Account Issue">Account Issue</option>
                <option value="Academic Issue">Academic Issue</option>
                <option value="Result Issue">Result Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-input" id="report-description" rows="4" placeholder="Describe your issue in detail..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-send-report" style="max-width:160px; background:#F59E0B;">Send Report</button>
          </form>
        </div>

        <!-- Session & Logout -->
        <div class="settings-card logout-card" style="border-top: 2px solid var(--danger-bg);">
          <h3 style="color: var(--danger);">Logout</h3>
          <p class="sub">Sign out of your account on this device. You will need to login again to access your portal.</p>
          <button class="btn btn-ghost" id="btn-logout" style="color: var(--danger); border-color: var(--danger-bg); margin-top: 1rem; width: 100%; max-width: 200px;">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              ${UI.icon('logout')}
              Logout from Portal
            </span>
          </button>
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('settings', content);

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      Auth.logout();
      UI.toast('Logged out successfully. See you soon!', 'info');
      Router.go('login');
    }
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('set-name').value;
    const email = document.getElementById('set-email').value;
    const btn = document.getElementById('btn-save-profile');

    btn.disabled = true; btn.textContent = 'Saving...';
    try {
      const r = await Auth.updateProfile(name, email);
      if (r.ok) {
        UI.toast('Profile updated successfully.', 'success');
        Router.go('settings');
      } else {
        UI.toast(r.err, 'error');
      }
    } catch {
      UI.toast('Failed to update profile', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });

  document.getElementById('pass-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldP = document.getElementById('set-old-pass').value;
    const newP = document.getElementById('set-new-pass').value;
    const btn = document.getElementById('btn-save-pass');

    btn.disabled = true; btn.textContent = 'Updating...';
    try {
      const r = await Auth.updatePassword(oldP, newP);
      if (r.ok) {
        UI.toast('Password updated successfully. You can now use your new password next time you login.', 'success');
        e.target.reset();
      } else {
        UI.toast(r.err, 'error');
      }
    } catch {
      UI.toast('Failed to update password', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  });

  if (document.getElementById('report-form')) {
    document.getElementById('report-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const categoryLabel = document.getElementById('report-category').value;
      const description = document.getElementById('report-description').value;
      const btn = document.getElementById('btn-send-report');

      const CATEGORY_MAP = {
        'Technical Issue': 'bug',
        'Account Issue': 'complaint',
        'Academic Issue': 'feedback',
        'Result Issue': 'feedback',
        'Other': 'suggestion'
      };
      const category = CATEGORY_MAP[categoryLabel] || 'feedback';
      
      btn.disabled = true; btn.textContent = 'Sending...';
      try {
        await addReport({
          id: 'rpt' + Date.now(),
          userId: user.id,
          userName: user.name,
          category,
          description,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
          status: 'pending',
          read: false
        });
        UI.toast('Report sent to admin successfully!', 'success');
        e.target.reset();
      } catch (err) {
        UI.toast('Failed to send report: ' + (err.message || 'unknown error'), 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Send Report';
      }
    });
  }
}

/* =============================================
   EXAM SESSION INTERFACE (TEMPLATE)
   ============================================= */
function renderExamSession() {
  if (!Auth.guard()) return;
  const user = Auth.current();
  const initials = user?.initials || 'U';

  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="exam-session">
      <!-- Exam Header -->
      <header class="exam-header">
        <div class="exam-header-left">
          <div class="exam-header-icon">${UI.icon('check_circle')}</div>
          <div class="exam-header-titles">
            <h1>Final Term: Computer Science</h1>
            <span>Section: Section B: Theory</span>
          </div>
        </div>
        
        <div class="exam-header-center">
          <img src="https://via.placeholder.com/40x40?text=Logo" alt="School Logo" class="exam-school-logo" />
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-left: 0.5rem;">School logo</span>
        </div>

        <div class="exam-header-right">
          <div class="exam-timer">
            <div class="timer-icon">${UI.icon('clock')}</div>
            <span class="timer-text">45:12 Remaining</span>
          </div>
          <div class="exam-user">
            <div class="exam-user-info">
              <div class="exam-user-name">${user.name}</div>
              <div class="exam-user-id">ID: ${user.studentId || '20210459'}</div>
            </div>
            <div class="exam-user-avatar">${initials}</div>
          </div>
        </div>
      </header>

      <div class="exam-layout">
        <!-- Sidebar Navigation -->
        <aside class="exam-sidebar">
          <div class="exam-sidebar-logo">
            <img src="https://via.placeholder.com/80x80?text=Crest" alt="Crest" />
          </div>

          <div class="exam-sidebar-sec">
            <div class="exam-sidebar-label">SECTIONS</div>
            <div class="exam-sec-item completed">
              <div class="exam-sec-header">
                <span class="exam-sec-icon">${UI.icon('clipboard')}</span>
                <span class="exam-sec-name">Section A: Objectives</span>
                <span class="exam-sec-check"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>
              </div>
              <div class="exam-sec-progress">
                <div class="exam-progress-bar" style="width: 100%;"></div>
              </div>
              <div class="exam-sec-meta">20 OF 20 ANSWERED • COMPLETED</div>
            </div>

            <div class="exam-sec-item active">
              <div class="exam-sec-header">
                <span class="exam-sec-icon">${UI.icon('pencil')}</span>
                <span class="exam-sec-name">Section B: Theory</span>
              </div>
              <div class="exam-sec-progress">
                <div class="exam-progress-bar" style="width: 20%;"></div>
              </div>
              <div class="exam-sec-meta">1 OF 5 ANSWERED • IN PROGRESS</div>
            </div>
          </div>

          <div class="exam-sidebar-sec">
            <div class="exam-sidebar-label">QUESTION NAVIGATOR</div>
            <div class="exam-q-grid">
              <button class="exam-q-btn active">1</button>
              <button class="exam-q-btn">2</button>
              <button class="exam-q-btn">3</button>
              <button class="exam-q-btn">4</button>
              <button class="exam-q-btn">5</button>
            </div>
          </div>

          <div class="exam-sidebar-bottom">
            <button class="exam-side-btn">
              <span class="side-btn-icon">${UI.icon('question')}</span>
              Need Help?
            </button>
            <button class="exam-side-btn danger" onclick="Router.go('home')">
              Back to Dashboard
            </button>
            <button class="exam-side-btn report" style="color: var(--danger);">
              Report Issue
            </button>
          </div>
        </aside>

        <!-- Main Question Area -->
        <main class="exam-main">
          <div class="exam-question-header">
            <div class="exam-breadcrumb">SECTION B › <strong>QUESTION 1 OF 5</strong></div>
            <div class="exam-marks">10 Marks</div>
          </div>

          <div class="exam-question-card">
            <div class="exam-question-text">
              Explain the difference between synchronous and asynchronous data transmission. Provide real-world examples for each to illustrate your answer.
            </div>
            <div class="exam-question-hint">Minimum 250 words suggested</div>
          </div>

          <div class="exam-editor-container">
            <div class="exam-editor-toolbar">
              <button class="editor-tool">B</button>
              <button class="editor-tool">I</button>
              <button class="editor-tool">U</button>
              <div class="editor-sep"></div>
              <button class="editor-tool">≡</button>
              <button class="editor-tool">⁝≡</button>
              <div class="editor-status">
                ${UI.icon('check_circle')} AUTO-SAVED
              </div>
            </div>
            <textarea class="exam-editor-area" placeholder="Type your detailed answer here..."></textarea>
          </div>
        </main>
      </div>

      <!-- Footer Actions -->
      <footer class="exam-footer">
        <button class="exam-foot-btn outline" id="btn-clear">
          ${UI.icon('trash')} Clear Response
        </button>
        <button class="exam-foot-btn outline" id="btn-save">
          ${UI.icon('save')} Save Draft
        </button>
        <div style="flex: 1;"></div>
        <button class="exam-foot-btn ghost" id="btn-prev">
          ← Previous
        </button>
        <button class="exam-foot-btn primary" id="btn-next">
          Next Question →
        </button>
      </footer>
    </div>
  `;

  // Basic event logic
  document.getElementById('btn-next').addEventListener('click', () => {
    UI.toast('Moving to next question...', 'info');
  });
  document.getElementById('btn-save').addEventListener('click', () => {
    UI.toast('Draft saved successfully!', 'success');
  });
  document.getElementById('btn-clear').addEventListener('click', () => {
    if (confirm('Clear your response?')) {
      document.querySelector('.exam-editor-area').value = '';
    }
  });
}

/* =============================================
   MCQ SESSION INTERFACE (TEMPLATE)
   ============================================= */
function renderMCQSession() {
  if (!Auth.guard()) return;
  const user = Auth.current();
  const initials = user?.initials || 'U';

  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="exam-session mcq-session-layout">
      <!-- Header -->
      <header class="exam-header">
        <div class="exam-header-left">
          <div class="exam-header-icon">${UI.icon('check_circle')}</div>
          <div class="exam-header-titles">
            <h1>Advanced Mathematics - Midterm 2024</h1>
            <span>Section A: Objective Questions (MCQs)</span>
          </div>
        </div>
        
        <div class="exam-header-center">
          <img src="https://via.placeholder.com/40x40?text=Logo" alt="School Logo" class="exam-school-logo" />
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-left: 0.5rem;">School logo</span>
        </div>

        <div class="exam-header-right">
          <div class="exam-timer">
            <div class="timer-icon">${UI.icon('clock')}</div>
            <span class="timer-text">01:42:15</span>
          </div>
          <div class="exam-user">
            <div class="exam-user-info">
              <div class="exam-user-name">${user.name}</div>
              <div class="exam-user-id">ID: ${user.studentId || '2024-8842'}</div>
            </div>
            <div class="exam-user-avatar">${initials}</div>
          </div>
        </div>
      </header>

      <div class="exam-layout">
        <main class="exam-main mcq-main">
          <div class="exam-question-header">
            <div class="mcq-q-count">QUESTION 14 OF 50</div>
            <div class="mcq-overall-progress">
              <span class="pct">28% Complete</span>
              <div class="progress-bar-wrap"><div class="bar" style="width: 28%;"></div></div>
            </div>
          </div>

          <div class="exam-question-card mcq-card">
            <div class="mcq-card-header">
              <span class="mcq-badge">MULTIPLE CHOICE</span>
              <span class="mcq-points">Points: 2.0</span>
            </div>
            <div style="text-align:right; margin-bottom:1.25rem;">
              <span style="color:#7B1D3C; background:#fef2f5; padding:0.25rem 0.75rem; border-radius:6px; font-weight:700; font-size:0.9rem;">QUESTION 14</span>
            </div>
            <div class="mcq-question-text">
              If a triangle has sides of lengths 7, 24, and 25, which of the following statements is true regarding the type of triangle it forms?
            </div>

            <div class="mcq-options">
              <label class="mcq-opt">
                <input type="radio" name="q14" value="A" />
                <span class="opt-box"></span>
                <span class="opt-text"><strong>A.</strong> It is an Isosceles Triangle</span>
              </label>
              <label class="mcq-opt selected">
                <input type="radio" name="q14" value="B" checked />
                <span class="opt-box"></span>
                <span class="opt-text"><strong>B.</strong> It is a Right-Angled Triangle</span>
              </label>
              <label class="mcq-opt">
                <input type="radio" name="q14" value="C" />
                <span class="opt-box"></span>
                <span class="opt-text"><strong>C.</strong> It is an Equilateral Triangle</span>
              </label>
              <label class="mcq-opt">
                <input type="radio" name="q14" value="D" />
                <span class="opt-box"></span>
                <span class="opt-text"><strong>D.</strong> It is an Obtuse Triangle</span>
              </label>
            </div>
          </div>

          <div class="mcq-footer-nav">
             <button class="exam-foot-btn ghost" onclick="Router.go('exams')">
                ← Previous
             </button>
             <div style="flex:1"></div>
             <button class="exam-foot-btn primary" style="background:#8B344B">
                Save & Next →
             </button>
          </div>
        </main>

        <aside class="mcq-sidebar">
          <div class="box-palette">
            <div class="sidebar-box">
               <h3 class="box-title">Question Palette</h3>
               <p class="box-sub">Quickly jump to any question</p>
               <div class="palette-grid">
                  ${Array.from({ length: 50 }, (_, i) => {
    const n = i + 1;
    let cls = '';
    if (n < 13) cls = 'answered';
    if (n === 13) cls = 'not-answered';
    if (n === 14) cls = 'active';
    return `<button class="palette-item ${cls}">${n}</button>`;
  }).join('')}
               </div>
            </div>

            <div class="sidebar-summary">
               <h3 class="box-title">SUMMARY</h3>
               <div class="summary-legend">
                  <div class="legend-item"><span class="dot-answered"></span> Answered (12)</div>
                  <div class="legend-item"><span class="dot-not-answered"></span> Not Answered (1)</div>
                  <div class="legend-item"><span class="dot-unvisited"></span> Unvisited (37)</div>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;

  // Interaction: Highlight selected option
  document.querySelectorAll('.mcq-opt input').forEach(input => {
    input.addEventListener('change', (e) => {
      document.querySelectorAll('.mcq-opt').forEach(opt => opt.classList.remove('selected'));
      e.target.closest('.mcq-opt').classList.add('selected');
    });
  });
}

/* =============================================
   RESULTS PAGE (Student View)
   ============================================= */
function renderResults() {
  if (!Auth.guard()) return;
  const user = Auth.current();
  const allResults = getResults();
  const studentResults = allResults.filter(r => r.studentId === user.id && r.visibleToStudents !== false);
  
  const getGradeColor = (grade) => {
    if (grade === 'A') return '#2D9B6F';
    if (grade === 'B') return '#4A9FE8';
    if (grade === 'C') return '#F5A623';
    if (grade === 'D') return '#F8E71C';
    return '#E74C3C';
  };
  
  const getGradeLabel = (grade) => {
    if (grade === 'A') return 'Excellent';
    if (grade === 'B') return 'Very Good';
    if (grade === 'C') return 'Good';
    if (grade === 'D') return 'Pass';
    return 'Fail';
  };
  
  const resultCards = studentResults.map(r => {
    const percentage = Math.round((r.score / r.totalScore) * 100);
    return `
      <div class="result-card" style="background:white; padding:1.5rem; border-radius:16px; margin-bottom:1rem; border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <div>
            <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:0.25rem;">${r.examTitle || r.subject}</h3>
            <p style="font-size:0.8rem; color:var(--text-muted);">${r.subject} | ${r.term}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.5rem; font-weight:800; color:${getGradeColor(r.grade)};">${r.grade}</div>
            <div style="font-size:0.7rem; color:${getGradeColor(r.grade)};">${getGradeLabel(r.grade)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
          <div style="flex:1; height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden;">
            <div style="width:${percentage}%; height:100%; background:${getGradeColor(r.grade)}; border-radius:4px;"></div>
          </div>
          <span style="font-weight:700; font-size:0.9rem;">${percentage}%</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
          <span>Score: <strong>${r.score}/${r.totalScore}</strong></span>
          <span>${r.date}</span>
        </div>
        ${r.comments ? `<div style="margin-top:1rem; padding:0.75rem; background:#f9f9f9; border-radius:8px; font-size:0.8rem; font-style:italic;">"${r.comments}"</div>` : ''}
      </div>
    `;
  }).join('');
  
  const avgScore = studentResults.length ? Math.round(studentResults.reduce((a, b) => a + (b.score / b.totalScore) * 100, 0) / studentResults.length) : 0;
  const bestGrade = studentResults.length ? studentResults.reduce((a, b) => (a.score/a.totalScore) > (b.score/b.totalScore) ? a : b).grade : '-';

  const content = `
    <div class="page">
      <div class="hero-banner" style="text-align:center;">
        <div class="hero-eyebrow">Academic Session 2024/2025</div>
        <h1 class="hero-title"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> My Results</h1>
        <p class="hero-sub">View your examination and test results.</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1.5rem; margin-bottom:2rem;">
        <div class="stat-card" style="background:white; padding:1.5rem; border-radius:16px; text-align:center; border:1px solid var(--border);">
          <div style="font-size:2rem; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
          <div style="font-size:1.5rem; font-weight:800;">${studentResults.length}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Total Results</div>
        </div>
        <div class="stat-card" style="background:white; padding:1.5rem; border-radius:16px; text-align:center; border:1px solid var(--border);">
          <div style="font-size:2rem; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
          <div style="font-size:1.5rem; font-weight:800; color:#2D9B6F;">${avgScore}%</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Average Score</div>
        </div>
        <div class="stat-card" style="background:white; padding:1.5rem; border-radius:16px; text-align:center; border:1px solid var(--border);">
          <div style="font-size:2rem; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
          <div style="font-size:1.5rem; font-weight:800; color:#4A9FE8;">${bestGrade}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">Best Grade</div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3>All Results</h3>
          <select class="select-inp" id="result-term-filter" style="width:auto;">
            <option value="all">All Terms</option>
            <option value="First Term">First Term</option>
            <option value="Second Term" selected>Second Term</option>
            <option value="Third Term">Third Term</option>
          </select>
        </div>
        <div id="results-list">
          ${resultCards || '<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><h4>No Results Yet</h4><p>Your results will appear here once published by your teacher.</p></div>'}
        </div>
      </div>
    </div>
  `;

  UI.buildPortal('results', content);

  document.getElementById('result-term-filter').addEventListener('change', function() {
    const term = this.value;
    const filtered = term === 'all' ? studentResults : studentResults.filter(r => r.term === term);
    const filteredCards = filtered.map(r => {
      const percentage = Math.round((r.score / r.totalScore) * 100);
      return `
        <div class="result-card" style="background:white; padding:1.5rem; border-radius:16px; margin-bottom:1rem; border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
            <div>
              <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:0.25rem;">${r.examTitle || r.subject}</h3>
              <p style="font-size:0.8rem; color:var(--text-muted);">${r.subject} | ${r.term}</p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.5rem; font-weight:800; color:${getGradeColor(r.grade)};">${r.grade}</div>
              <div style="font-size:0.7rem; color:${getGradeColor(r.grade)};">${getGradeLabel(r.grade)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
            <div style="flex:1; height:8px; background:#f0f0f0; border-radius:4px; overflow:hidden;">
              <div style="width:${percentage}%; height:100%; background:${getGradeColor(r.grade)}; border-radius:4px;"></div>
            </div>
            <span style="font-weight:700; font-size:0.9rem;">${percentage}%</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
            <span>Score: <strong>${r.score}/${r.totalScore}</strong></span>
            <span>${r.date}</span>
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('results-list').innerHTML = filteredCards || '<div class="empty-state" style="padding:3rem;"><p>No results for this term</p></div>';
  });
}

/* =============================================
   SUBMISSION COMPLETION OVERLAY
   ============================================= */
window.showSubmissionOverlay = function({ examTitle, subject, success, message }) {
  const overlay = document.createElement('div');
  overlay.className = 'submission-overlay';
  overlay.id = 'submission-overlay';
  overlay.innerHTML = `
    <div class="submission-overlay-content">
      <div class="submission-icon ${success ? 'success' : 'warning'}">
        ${success
          ? '<svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
          : '<svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        }
      </div>
      <h2 class="submission-title">${success ? 'Exam Submitted Successfully' : 'Already Submitted'}</h2>
      <p class="submission-message">${message}</p>
      <div class="submission-details">
        <div class="submission-detail-row">
          <span class="detail-label">Exam</span>
          <span class="detail-value">${examTitle}</span>
        </div>
        ${subject ? `
        <div class="submission-detail-row">
          <span class="detail-label">Subject</span>
          <span class="detail-value">${subject}</span>
        </div>
        ` : ''}
        <div class="submission-detail-row">
          <span class="detail-label">Submitted</span>
          <span class="detail-value">${new Date().toLocaleString()}</span>
        </div>
      </div>
      <div class="submission-actions">
        <button class="btn btn-primary" onclick="document.getElementById('submission-overlay')?.remove(); Router.go('home')" style="background:#7B1D3C; padding:0.75rem 2rem; font-weight:700;">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" style="margin-right:0.5rem;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Return to Dashboard
        </button>
        <button class="btn btn-ghost" onclick="document.getElementById('submission-overlay')?.remove(); Router.go('results')" style="padding:0.75rem 2rem; font-weight:600;">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" style="margin-right:0.5rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          View Results
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};
