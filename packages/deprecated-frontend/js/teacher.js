/* =============================================
   TEACHER.JS — Yeshua Educational Platform
   Premium Platform - Modernized UI/UX
   ============================================= */

// Match students by class — supports both exact "SS3" and stream-based "SS3 Science"
function filterStudentsByClass(students, className) {
    if (!className) return [];
    return students.filter(s => s.class === className || s.class?.startsWith(className + ' '));
}

// Generate RFC4122 v4 UUID for question IDs
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * TeacherPageBuilder: Shared components for the teacher portal
 * Helps maintain a premium, consistent design across all views.
 */
const TeacherPageBuilder = {
    /**
     * Generates a premium hero section
     */
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

    /**
     * Generates a standard section card
     */
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

    /**
     * Generates a premium table shell
     */
    table: (headers, rows) => `
        <div style="overflow-x: auto;">
            <table class="table-premium">
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="' + headers.length + '" style="text-align:center; padding: 4rem; color: var(--text-muted);">No records found.</td></tr>'}
                </tbody>
            </table>
        </div>
    `,

    /**
     * Generates a modern form group
     */
    formGroup: (label, input) => `
        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="font-size: 0.85rem; font-weight: 700; color: var(--text-sec); margin-bottom: 0.6rem; display: block;">${label}</label>
            ${input}
        </div>
    `
};

/**
 * INIT: Entry point for the teacher portal
 */
async function initTeacherPortal() {
    try {
        UI.initTheme();

        const user = Auth.current();
        if (!user || user.role !== 'teacher') {
            window.location.href = 'index.html#login';
            return;
        }

        // Register Teacher Portal Routes FIRST
        Router.register('teacher-home', renderTeacherHome);
        Router.register('teacher-my-class', renderTeacherMyClass);
        Router.register('teacher-notes', renderTeacherNotes);
        Router.register('teacher-assign', renderTeacherAssign);
        Router.register('teacher-exams', renderTeacherExams);
        Router.register('teacher-live', renderTeacherLive);
        Router.register('teacher-schemes', renderTeacherSchemes);
        Router.register('teacher-results', renderTeacherResults);
        Router.register('teacher-settings', renderTeacherSettings);

        console.log('[Teacher] Routes registered, starting data sync...');

        // Show a loading state while data is being fetched
        document.getElementById('app').innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:1rem;">
                <div style="font-size:2rem;color:var(--maroon);animation:spinner-spin 1s linear infinite;">⟳</div>
                <div style="font-weight:700;color:var(--text-muted);">Loading your dashboard...</div>
            </div>
        `;

        // Wait for token to be available
        const token = await new Promise(resolve => {
            const check = () => {
                const t = Auth.getToken();
                if (t) resolve(t);
                else setTimeout(check, 200);
            };
            check();
        });
        console.log('[Teacher] Token available, fetching data...');

        // Fetch data from backend before rendering anything
        if (window.DataSync) {
            await window.DataSync.refreshCore().catch(err => {
                console.warn('[Teacher] Data sync failed:', err?.message || err);
            });
        }
        console.log('[Teacher] Data sync complete, notes in cache:', getNotes().length);

        // Now render the initial page — cache is populated
        const hash = window.location.hash.slice(1);
        if (!hash || hash === 'login') {
            Router.go('teacher-home');
        } else {
            Router.go(hash);
        }
    } catch (err) {
        console.error('Teacher portal init error:', err);
        document.getElementById('app').innerHTML = '<div style="padding:2rem; text-align:center;"><h2>Error Loading</h2><p>' + err.message + '</p><button onclick="window.location.reload()" class="btn btn-primary">Reload</button></div>';
    }
}

/**
 * MY CLASS — Class Teacher's class roster
 */
async function renderTeacherMyClass() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const academic = getAcademicInfo();
    const myClass = user.classTeacherOf || '';
    let students = getAppUsers().filter(u => u.role === 'student');

    // Fetch from API if cache is empty
    if (students.length === 0) {
        try {
            const res = await API.users.getUsers().catch(() => null);
            if (res?.data && Array.isArray(res.data)) {
                const normalized = res.data.map(u => ({
                    ...u,
                    initials: (u.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                }));
                saveAppUsers(normalized);
                students = normalized.filter(u => u.role === 'student');
            }
        } catch (_) {}
    }

    const classStudents = filterStudentsByClass(students, myClass);
    const boys = classStudents.filter(s => s.sex === 'Male' || s.sex === 'male' || s.sex === 'M').length;
    const girls = classStudents.filter(s => s.sex === 'Female' || s.sex === 'female' || s.sex === 'F').length;

    const studentRows = classStudents.length
        ? classStudents.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:34px;height:34px;border-radius:50%;background:var(--maroon-bg);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">${s.initials || s.name.charAt(0)}</div>
                        <div>
                            <div style="font-weight:600;">${s.name}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${s.email}</div>
                        </div>
                    </div>
                </td>
                <td>${s.studentId || s.admissionNo || '-'}</td>
                <td>${s.sex || '-'}</td>
                <td>${s.department || '-'}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="alert('View profile for ${s.name}')" title="View Profile"><svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    <button class="btn btn-ghost btn-sm" onclick="Router.go('teacher-results')" title="View Results"><svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></button>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted);">No students found in your class.</td></tr>';

    const content = `
    <div class="page">
      <div class="hero-banner">
        <div class="hero-eyebrow">Academic Session ${academic.session} - ${academic.term}</div>
        <h1 class="hero-title">My Class${myClass ? ` — ${myClass}` : ''}</h1>
        <p class="hero-sub">${classStudents.length} student${classStudents.length !== 1 ? 's' : ''} enrolled${myClass ? ' in ' + myClass : ''}</p>
      </div>

      ${!myClass ? `
        <div class="section-card" style="margin-top:1.5rem; padding:2rem; text-align:center;">
          <p style="color:var(--text-muted);">You are not assigned as a class teacher. Contact the administrator to set your class.</p>
        </div>
      ` : `
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:1rem; margin:1.5rem 0;">
          <div class="stat-card" style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">${classStudents.length}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">Total Students</div>
          </div>
          <div class="stat-card" style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">${boys}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">Boys</div>
          </div>
          <div class="stat-card" style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">${girls}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">Girls</div>
          </div>
          <div class="stat-card" style="text-align:center;cursor:pointer;" onclick="Router.go('teacher-results')">
            <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">Results</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">View & Manage</div>
          </div>
        </div>

        <div class="section-card" style="padding:0;">
          <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:1rem;font-weight:800;">Student Roster</h3>
          </div>
          <div style="overflow-x:auto;">
            <table class="teacher-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Admission No</th>
                  <th>Sex</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>${studentRows}</tbody>
            </table>
          </div>
        </div>
      `}
    </div>
    `;

    UI.buildPortal('teacher-my-class', content);
}

/**
 * HOME / DASHBOARD
 */
async function renderTeacherHome() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const academic = getAcademicInfo();

    const fetchIfEmpty = async (key, fetcher, normalize = d => d) => {
      if (readJson(key, []).length === 0) {
        try {
          const r = await fetcher();
          const d = (r.data || r.notes || r.assignments || r.results || []).map(normalize);
          if (d.length > 0) writeJson(key, d);
        } catch (_) { /* ignore */ }
      }
    };
    await Promise.all([
      fetchIfEmpty(DATA_KEYS.notes, () => API.notes.getAll(), normalizeNote),
      fetchIfEmpty(DATA_KEYS.assignments, () => API.assignments.getAll(), normalizeAssignment),
      fetchIfEmpty(DATA_KEYS.exams, () => API.teacher.getExams(), normalizeExam),
      fetchIfEmpty(DATA_KEYS.results, () => API.results.getAll(), normalizeResult),
      fetchIfEmpty(DATA_KEYS.notifications, () => API.notifications.getAll(), normalizeNotification),
    ]);

    const stats = [
        { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', label: 'My Notes', val: getNotes().length, color: '#7B1D3C', page: 'teacher-notes' },
        { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', label: 'Active Assignments', val: getAssignments().length, color: '#C0476A', page: 'teacher-assign' },
        { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', label: 'Set Exams', val: getExams().length, color: '#2D9B6F', page: 'teacher-exams' },
        { icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', label: 'Results Ready', val: getResults().length, color: '#1A6FA8', page: 'teacher-results' }
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

    const content = `
    <div class="page" style="padding:0; max-width: none; animation: fadeIn 0.4s ease;">
        <div class="home-hero" style="background: linear-gradient(135deg, #7B1D3C 0%, #3D0920 100%); padding: 6rem 2rem 9rem 2rem;">
            <div class="home-session-badge">Session: ${academic.session} • ${academic.term}</div>
            <h1 class="home-greeting" style="font-size: 3.5rem;">Welcome Back, <span class="text-gradient" style="background: linear-gradient(135deg, #FFF 0%, #FFC1D6 100%); -webkit-background-clip: text;">${user.name.split(' ')[0]}</span></h1>
            <p class="home-subtitle" style="font-size: 1.1rem; opacity: 0.75; font-weight: 400;">Your educational dashboard is up to date. Ready to teach today?</p>
        </div>

        <div class="home-content-wrap" style="margin-top: -4rem;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2.5rem;">
                ${stats}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 340px; gap: 2rem;">
                <div class="left-pane">
                    ${TeacherPageBuilder.section('Quick Actions', '⚡', `
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem;">
                            <div class="premium-card" onclick="window.location.href='grade-all.html'" style="padding: 2rem; text-align: center; cursor: pointer; background: linear-gradient(135deg, rgba(180, 83, 9, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%); border: 2px solid #B45309;">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️</div>
                                <div style="font-weight: 800; font-size: 1rem;">Grade All</div>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Grade submissions</p>
                            </div>
                            <div class="premium-card" onclick="Router.go('teacher-notes')" style="padding: 2rem; text-align: center; cursor: pointer;">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                                <div style="font-weight: 800; font-size: 1rem;">Upload Note</div>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Share materials with student</p>
                            </div>
                            <div class="premium-card" onclick="Router.go('teacher-assign')" style="padding: 2rem; text-align: center; cursor: pointer;">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                                <div style="font-weight: 800; font-size: 1rem;">New Assignment</div>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Set tasks for your classes</p>
                            </div>
                            <div class="premium-card" onclick="Router.go('teacher-live')" style="padding: 2rem; text-align: center; cursor: pointer;">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div>
                                <div style="font-weight: 800; font-size: 1rem;">Start Live Class</div>
                                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">Join virtual classroom</p>
                            </div>
                        </div>
                    `)}

                    ${TeacherPageBuilder.section('Recent Announcements', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9 22 2Z"/></svg>', `
                        <div id="notifications-container" style="max-height: 400px; overflow-y: auto;">
                            ${getNotifications().map(n => {
                                const user = getUserById(n.fromUserId);
                                return `
                                        <div class="notification-item" style="padding: 1rem; border-bottom: 1px solid var(--border); ${n.read ? 'opacity: 0.8;' : 'border-left: 3px solid var(--maroon); background: var(--maroon)15;'}">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                        <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text);">${n.message || n.title || 'Update'}</h4>
                                        <span style="font-size: 0.8rem; color: var(--text-muted);">${n.date || ''}</span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-sec); line-height: 1.4;">by ${user ? user.name : 'Unknown User'}</p>
                                </div>
                                `;
                            }).join('')}
                        </div>
                        ${getNotifications().length === 0 ? `
                            <div class="empty-state" style="padding: 3rem 0; text-align: center;">
                                <div style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
                                <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--text);">No New Announcements</h4>
                                <p style="color: var(--text-muted); font-size: 0.9rem;">Check back later for updates from administration.</p>
                            </div>
                        ` : ''}
                    `, `<button class="btn btn-ghost btn-sm" onclick="loadNotifications()">${UI.icon('refresh')}</button>`)}
                </div>

                <div class="right-pane">
                    <div class="premium-card glass-panel" style="padding: 2.5rem 1.5rem; margin-bottom: 1.5rem; text-align: center; background: linear-gradient(135deg, rgba(123, 29, 60, 0.05) 0%, rgba(123, 29, 60, 0.1) 100%);">
                        <div style="font-size: 2rem; margin-bottom: 1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                        <div id="t-clock-date" style="font-weight: 700; font-size: 0.9rem; color: var(--maroon); margin-bottom: 0.25rem;">--</div>
                        <div id="t-clock-time" style="font-weight: 900; font-size: 2.5rem; color: var(--text); letter-spacing: -2px;">--:--</div>
                    </div>

                    <div class="premium-card" style="padding: 1.5rem;">
                        <h4 style="font-weight: 800; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span> Upcoming Tasks
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="padding: 1rem; border-radius: 12px; background: var(--bg-card2); border-left: 4px solid var(--maroon);">
                                <div style="font-weight: 700; font-size: 0.85rem;">Review Mid-term Results</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Due in 2 days</div>
                            </div>
                            <div style="padding: 1rem; border-radius: 12px; background: var(--bg-card2); border-left: 4px solid var(--success);">
                                <div style="font-weight: 700; font-size: 0.85rem;">Weekly Staff Meeting</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Tomorrow, 10:00 AM</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-block" style="margin-top: 1.5rem; border-radius: 12px;">VIEW CALENDAR</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

     UI.buildPortal('teacher-home', content);
     // Clock Logic
     const updateTClock = () => {
         const timeEl = document.getElementById('t-clock-time');
         const dateEl = document.getElementById('t-clock-date');
         if (timeEl && dateEl) {
             const now = new Date();
             timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
             dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
         }
     };
     updateTClock();
     const tInterval = setInterval(() => {
         if (!document.getElementById('t-clock-time')) { clearInterval(tInterval); return; }
         updateTClock();
     }, 1000);

     // Load notifications from API and cache
     async function loadNotifications() {
         try {
             const notifications = await API.notifications.getAll();
             const normalized = notifications.map(normalizeNotification);
             saveNotifications(normalized);
             // Re-render the teacher-home page to show updated notifications
             Router.go('teacher-home');
         } catch (err) {
             console.error('Failed to load notifications:', err);
             UI.toast('Failed to load notifications', 'error');
         }
     }
 }


function renderTeacherLive() {
    if (!Auth.guard()) return;

    const lessons = [
        { id: 1, subject: 'Mathematics', topic: 'Algebra Basics - Quadratic Equations', time: '09:00 AM', icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 7H3"/><path d="M21 17H3"/><path d="M12 7V3"/><path d="M12 21v-4"/></svg>', color: '#1565C0', status: 'live' },
        { id: 2, subject: 'Physics', topic: 'Newton\'s Laws of Motion', time: '11:00 AM', icon: '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M20.2 20.2c2.4-2.4 2.4-6.4 0-8.8-2.4-2.4-6.4-2.4-8.8 0-2.4 2.4-2.4 6.4 0 8.8 2.4 2.4 6.4 2.4 8.8 0"/><path d="M3.8 3.8c2.4 2.4 2.4 6.4 0 8.8-2.4 2.4-6.4 2.4-8.8 0-2.4-2.4-2.4-6.4 0-8.8 2.4-2.4 6.4-2.4 8.8 0"/></svg>️', color: '#2E7D32', status: 'upcoming' },
        { id: 3, subject: 'Chemistry', topic: 'Chemical Bonding', time: '02:00 PM', icon: '⚗️', color: '#E65100', status: 'upcoming' },
    ];

    const items = lessons.map(l => `
        <div class="premium-card" style="padding: 1.5rem; margin-bottom: 1rem; border-left: 4px solid ${l.status === 'live' ? 'var(--danger)' : 'var(--info)'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 1.25rem;">
                    <div class="stat-icon-box" style="background: ${l.color}15; color: ${l.color}; width: 50px; height: 50px; font-size: 1.5rem;">
                        ${l.icon}
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                            <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--text);">${l.subject}</h4>
                            ${l.status === 'live' ? '<span class="badge-premium danger pulse">LIVE NOW</span>' : '<span class="badge-premium info">UPCOMING</span>'}
                        </div>
                        <div style="font-size: 0.9rem; color: var(--text-sec); font-weight: 600;">${l.topic}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${UI.icon('clock')} ${l.time}</div>
                    </div>
                </div>
                <button class="btn ${l.status === 'live' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="UI.toast('Connecting to virtual classroom...', 'info')">
                    ${l.status === 'live' ? 'JOIN CLASS' : 'START EARLY'}
                </button>
            </div>
        </div>
    `).join('');

    const content = `
    <div class="page" style="animation: fadeIn 0.3s ease;">
        ${TeacherPageBuilder.hero('Live Classrooms', 'Host interactive video sessions and real-time collaboration with your students.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>')}

        <div style="display: grid; grid-template-columns: 1fr 380px; gap: 2.5rem; margin-top: 2rem;">
            <div class="list-pane">
                ${TeacherPageBuilder.section('Today\'s Schedule', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>️', items || '<div style="text-align:center; padding: 4rem; color:var(--text-muted);">No live classes scheduled for today.</div>')}
            </div>

            <div class="form-pane">
                ${TeacherPageBuilder.section('Instant Live Session', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>', `
                    <form id="live-form">
                        ${TeacherPageBuilder.formGroup('Subject', `
                            <select id="live-subject" class="form-input" required>
                                <option value="">Select Subject</option>
                                <option>Mathematics</option><option>Physics</option><option>Chemistry</option>
                            </select>
                        `)}
                        ${TeacherPageBuilder.formGroup('Topic / Title', `<input type="text" id="live-topic" class="form-input" placeholder="e.g. Intro to Calculus" required />`)}
                        ${TeacherPageBuilder.formGroup('Scheduled Time', `<input type="time" id="live-time" class="form-input" required />`)}
                        ${TeacherPageBuilder.formGroup('Description', `<textarea id="live-desc" class="form-input" style="height: 80px; resize: none;" placeholder="What will you cover?"></textarea>`)}
                        
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem; height: 50px; font-weight: 800; border-radius: 12px; background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%); border:none;">START LIVE SESSION</button>
                    </form>
                `)}
            </div>
        </div>
    </div>
    `;

    UI.buildPortal('teacher-live', content);

    document.getElementById('live-form').addEventListener('submit', e => {
        e.preventDefault();
        UI.toast('Live class session created!', 'success');
        renderTeacherLive();
    });
}

function renderTeacherSchemes() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const academicInfo = getAcademicInfo(); // Define academicInfo
    const mySubjects = Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [];
    const myClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];
    const schemes = getSchemesOfWork();
    const lessonPlans = getLessonPlans();
    const users = getAppUsers();
    const hodUsers = users.filter(u => u.role === 'hod');
    const principalUsers = users.filter(u => u.role === 'principal');
    const adminUsers = users.filter(u => u.role === 'admin');
    const superAdminUsers = users.filter(u => u.role === 'superadmin');

    const subjectOptions = mySubjects.length > 0 ? mySubjects.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="">No subjects assigned</option>';
    const classOptions = myClasses.length > 0 ? myClasses.map(c => `<option value="${c}">${c}</option>`).join('') : '<option value="">No classes assigned</option>';

    const schemeRows = schemes.map(s => `
        <tr>
            <td>
                <div style="display:flex; align-items:center;">
                    <div class="file-icon-box" style="background:#E8F5E9; color:#2E7D32;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                    <div>
                        <div style="font-weight:700;">${s.title}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${s.subject}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:600;">${s.class}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${s.term}</div>
            </td>
            <td>
                <div style="font-weight:600;">${s.date}</div>
            </td>
            <td>
                <span class="assign-badge" style="background:${s.sentTo ? '#E8F5E9' : '#FFF3E0'}; color:${s.sentTo ? '#2E7D32' : '#B87A00'};">
                    ${s.sentTo ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Sent to ' + s.sentTo : 'Draft'}
                </span>
            </td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="deleteSchemeOfWork('${s.id}'); Router.go('teacher-schemes');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
            </td>
        </tr>
    `).join('');

    const planRows = lessonPlans.map(p => `
        <tr>
            <td>
                <div style="display:flex; align-items:center;">
                    <div class="file-icon-box" style="background:#E3F2FD; color:#1565C0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                    <div>
                        <div style="font-weight:700;">${p.title}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${p.subject}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:600;">${p.class}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${p.term}</div>
            </td>
            <td>
                <div style="font-weight:600;">${p.date}</div>
            </td>
            <td>
                <span class="assign-badge" style="background:${p.sentTo ? '#E8F5E9' : '#FFF3E0'}; color:${p.sentTo ? '#2E7D32' : '#B87A00'};">
                    ${p.sentTo ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Sent to ' + p.sentTo : 'Draft'}
                </span>
            </td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="deleteLessonPlan('${p.id}'); Router.go('teacher-schemes');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page">
      ${TeacherPageBuilder.hero(
        'Schemes of Work & Lesson Plans',
        'Upload and submit schemes of work and lesson plans to Principal, HOD, Admin, and Super Admin.',
        '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        `Academic Session ${academicInfo.session} - ${academicInfo.term}`
    )}

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-top:1.25rem;">
        ${TeacherPageBuilder.section('Scheme of Work', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', `
          <form id="scheme-form">
            ${TeacherPageBuilder.formGroup('Title', `<input type="text" id="scheme-title" class="form-input" style="padding-left:1rem;" placeholder="e.g. Scheme of Work - Mathematics SS3" required />`)}
            <div class="form-row">
                ${TeacherPageBuilder.formGroup('Subject', `
                    <select id="scheme-subject" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Subject</option>
                        ${subjectOptions}
                    </select>
                `)}
                ${TeacherPageBuilder.formGroup('Class', `
                    <select id="scheme-class" class="form-input" style="padding-left:1rem;" required
                        <option value="">Select Class</option>
                        ${classOptions}
                    </select>
                `)}
            </div>
            ${TeacherPageBuilder.formGroup('Upload Scheme (PDF/DOC)', `
                <div id="scheme-drop-zone" class="drop-zone" style="border: 2px dashed var(--border); border-radius:12px; padding:2rem; text-align:center; background:#FDFDFD; cursor:pointer; transition:all 0.2s;">
                    <input type="file" id="scheme-file" class="file-input" style="display:none;" />
                    <span style="font-size:2rem; color:#7B1D3C; display:block; margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                    <p style="font-weight:600; margin-bottom:0.5rem;">Click to upload or drag and drop</p>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0;">All file types supported (MAX. 50MB)</p>
                    <div id="scheme-file-preview" class="file-preview" style="display:none; margin-top:1rem; padding:0.75rem; background:#E8F7F1; border-radius:8px; color:#2D9B6F; font-weight:600;"></div>
                </div>
            `)}
            ${TeacherPageBuilder.formGroup('Send To (Select recipients)', `
                <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:0.5rem;">
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="scheme-recipient" value="Principal" /> Principal
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="scheme-recipient" value="HOD" /> HOD
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="scheme-recipient" value="Admin" /> Admin
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="scheme-recipient" value="Super Admin" /> Super Admin
                    </label>
                </div>
            `)}
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-ghost" onclick="saveSchemeDraft()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save as Draft</button>
                <button type="submit" class="btn btn-primary" style="background:#7B1D3C;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Submit to Recipients</button>
            </div>
          </form>
        `)}

        ${TeacherPageBuilder.section('Lesson Plan', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', `
          <form id="plan-form">
            ${TeacherPageBuilder.formGroup('Title', `<input type="text" id="plan-title" class="form-input" style="padding-left:1rem;" placeholder="e.g. Lesson Plan - Quadratic Equations Week 1" required />`)}
            <div class="form-row">
                ${TeacherPageBuilder.formGroup('Subject', `
                    <select id="plan-subject" class="form-input" style="padding-left:1rem;" required>
                        <option value="">Select Subject</option>
                        ${subjectOptions}
                    </select>
                `)}
                ${TeacherPageBuilder.formGroup('Class', `
                    <select id="plan-class" class="form-input" style="padding-left:1rem;" required
                        <option value="">Select Class</option>
                        ${classOptions}
                    </select>
                `)}
            </div>
            ${TeacherPageBuilder.formGroup('Week', `<input type="text" id="plan-week" class="form-input" style="padding-left:1rem;" placeholder="e.g. Week 1" />`)}
            ${TeacherPageBuilder.formGroup('Upload Lesson Plan (PDF/DOC)', `
                <div id="plan-drop-zone" class="drop-zone" style="border: 2px dashed var(--border); border-radius:12px; padding:2rem; text-align:center; background:#FDFDFD; cursor:pointer; transition:all 0.2s;">
                    <input type="file" id="plan-file" class="file-input" style="display:none;" />
                    <span style="font-size:2rem; color:#1565C0; display:block; margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                    <p style="font-weight:600; margin-bottom:0.5rem;">Click to upload or drag and drop</p>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0;">All file types supported (MAX. 50MB)</p>
                    <div id="plan-file-preview" class="file-preview" style="display:none; margin-top:1rem; padding:0.75rem; background:#E3F2FD; border-radius:8px; color:#1565C0; font-weight:600;"></div>
                </div>
            `)}
            ${TeacherPageBuilder.formGroup('Send To (Select recipients)', `
                <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:0.5rem;">
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="plan-recipient" value="Principal" /> Principal
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="plan-recipient" value="HOD" /> HOD
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="plan-recipient" value="Admin" /> Admin
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
                        <input type="checkbox" name="plan-recipient" value="Super Admin" /> Super Admin
                    </label>
                </div>
            `)}
            <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-ghost" onclick="savePlanDraft()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save as Draft</button>
                <button type="submit" class="btn btn-primary" style="background:#1565C0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Submit to Recipients</button>
            </div>
          </form>
        `)}
      </div>

      ${TeacherPageBuilder.section('All Schemes of Work (' + schemes.length + ')', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', `
        <table class="teacher-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Class & Term</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${schemeRows || '<tr><td colspan="5" style="text-align:center;padding:2rem;">No schemes uploaded yet</td></tr>'}
          </tbody>
        </table>
      `)}

      ${TeacherPageBuilder.section('All Lesson Plans (' + lessonPlans.length + ')', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', `
        <table class="teacher-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Class & Term</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${planRows || '<tr><td colspan="5" style="text-align:center;padding:2rem;">No lesson plans uploaded yet</td></tr>'}
          </tbody>
        </table>
      `)}
    </div>
    `;
    UI.buildPortal('teacher-schemes', content);

    const readFileAsDataURL = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };

    const setupDropZone = (dropZoneId, fileInputId, previewId) => {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(fileInputId);
        const preview = document.getElementById(previewId);

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
    };

    setupDropZone('scheme-drop-zone', 'scheme-file', 'scheme-file-preview');
    setupDropZone('plan-drop-zone', 'plan-file', 'plan-file-preview');

    const getRecipients = (name) => {
        const checkboxes = document.getElementsByName(name);
        return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value).join(', ');
    };

    window.saveSchemeDraft = async function () {
        const fileInput = document.getElementById('scheme-file');
        const file = fileInput.files[0];

        let fileData = null;
        let fileName = null;
        if (file) {
            fileData = await readFileAsDataURL(file);
            fileName = file.name;
        }

        const scheme = {
            id: 's' + Date.now(),
            title: document.getElementById('scheme-title').value,
            subject: document.getElementById('scheme-subject').value,
            class: document.getElementById('scheme-class').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            fileData: fileData,
            fileName: fileName,
            sentTo: ''
        };

        if (!scheme.title || !scheme.subject || !scheme.class) {
            UI.toast('Please fill in all required fields', 'error');
            return;
        }

        addSchemeOfWork(scheme);
        UI.toast('Scheme saved as draft!', 'success');
        Router.go('teacher-schemes');
    };

    window.savePlanDraft = async function () {
        const fileInput = document.getElementById('plan-file');
        const file = fileInput.files[0];

        let fileData = null;
        let fileName = null;
        if (file) {
            fileData = await readFileAsDataURL(file);
            fileName = file.name;
        }

        const plan = {
            id: 'p' + Date.now(),
            title: document.getElementById('plan-title').value,
            subject: document.getElementById('plan-subject').value,
            class: document.getElementById('plan-class').value,
            week: document.getElementById('plan-week').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            fileData: fileData,
            fileName: fileName,
            sentTo: ''
        };

        if (!plan.title || !plan.subject || !plan.class) {
            UI.toast('Please fill in all required fields', 'error');
            return;
        }

        addLessonPlan(plan);
        UI.toast('Lesson plan saved as draft!', 'success');
        Router.go('teacher-schemes');
    };

    document.getElementById('scheme-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('scheme-file');
        const file = fileInput.files[0];

        let fileData = null;
        let fileName = null;
        if (file) {
            fileData = await readFileAsDataURL(file);
            fileName = file.name;
        }

        const recipients = getRecipients('scheme-recipient');
        if (!recipients) {
            UI.toast('Please select at least one recipient', 'error');
            return;
        }

        const scheme = {
            id: 's' + Date.now(),
            title: document.getElementById('scheme-title').value,
            subject: document.getElementById('scheme-subject').value,
            class: document.getElementById('scheme-class').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            fileData: fileData,
            fileName: fileName,
            sentTo: recipients
        };

        if (!scheme.title || !scheme.subject || !scheme.class || !scheme.fileData) {
            UI.toast('Please fill in all required fields and upload a file', 'error');
            return;
        }

        addSchemeOfWork(scheme);
        UI.toast('Scheme submitted to: ' + recipients, 'success');
        renderTeacherSchemes();
    });

    document.getElementById('plan-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('plan-file');
        const file = fileInput.files[0];

        let fileData = null;
        let fileName = null;
        if (file) {
            fileData = await readFileAsDataURL(file);
            fileName = file.name;
        }

        const recipients = getRecipients('plan-recipient');
        if (!recipients) {
            UI.toast('Please select at least one recipient', 'error');
            return;
        }

        const plan = {
            id: 'p' + Date.now(),
            title: document.getElementById('plan-title').value,
            subject: document.getElementById('plan-subject').value,
            class: document.getElementById('plan-class').value,
            week: document.getElementById('plan-week').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            fileData: fileData,
            fileName: fileName,
            sentTo: recipients
        };

        if (!plan.title || !plan.subject || !plan.class || !plan.fileData) {
            UI.toast('Please fill in all required fields and upload a file', 'error');
            return;
        }
        addLessonPlan(plan);
        UI.toast('Lesson plan submitted successfully!', 'success');
        renderTeacherSchemes();
    });
}

/**
* NOTES MANAGEMENT
*/
async function renderTeacherNotes() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const mySubjects = Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [];
    const myClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];
    let notes = getNotes();
    if (notes.length === 0) {
      try {
        const result = await API.notes.getAll();
        notes = (result.data || result.notes || []).map(normalizeNote);
        if (notes.length > 0) {
          writeJson(DATA_KEYS.notes, notes);
        }
      } catch (e) {
        console.warn('[renderTeacherNotes] Direct fetch also failed:', e?.message);
      }
    }

    const subjectOptions = mySubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const classOptions = myClasses.map(c => `<option value="${c}">${c}</option>`).join('');

    const rows = notes.map(n => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div class="stat-icon-box" style="background:rgba(45, 125, 210, 0.1); color:#2D7DD2; width:40px; height:40px; font-size:1.1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                    <div>
                        <div style="font-weight:800; color:var(--text);">${n.title}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${n.fileName || 'Text Note'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:700; color:var(--text-sec);">${n.subject}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${n.class || 'All Classes'}</div>
            </td>
            <td><span class="badge-premium info">Week ${n.week || '--'}</span></td>
            <td style="font-weight:600; font-size:0.85rem; color:var(--text-muted);">${n.date}</td>
            <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button class="btn btn-ghost btn-sm" onclick="UI.toast('Downloading...', 'info')">${UI.icon('download')}</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="deleteNote('${n.id}'); renderTeacherNotes();">${UI.icon('trash')}</button>
                </div>
            </td>
        </tr>
    `).join('');

    const content = `
    <div class="page" style="animation: fadeIn 0.3s ease;">
        ${TeacherPageBuilder.hero('Notes & Materials', 'Upload study guides, handouts, and multimedia for your students.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>')}

        <div style="display: grid; grid-template-columns: 380px 1fr; gap: 2.5rem; margin-top: 2rem;">
            <div class="form-pane">
                ${TeacherPageBuilder.section('Upload New Note', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>', `
                    <form id="note-form">
                        ${TeacherPageBuilder.formGroup('Note Title', `<input type="text" id="note-title" class="form-input" placeholder="e.g. Intro to Algebra" required />`)}
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            ${TeacherPageBuilder.formGroup('Subject', `
                                <select id="note-subject" class="form-input" required>
                                    <option value="">Select</option>
                                    ${subjectOptions}
                                </select>
                            `)}
                            ${TeacherPageBuilder.formGroup('Class', `
                                <select id="note-class" class="form-input">
                                    <option value="">All Classes</option>
                                    ${classOptions}
                                </select>
                            `)}
                        </div>

                        ${TeacherPageBuilder.formGroup('Week (Optional)', `<input type="text" id="note-week" class="form-input" placeholder="e.g. 05" />`)}
                        
                        ${TeacherPageBuilder.formGroup('Short Description', `<textarea id="note-desc" class="form-input" style="height: 80px; resize: none;" placeholder="Provide context..."></textarea>`)}

                        <div class="form-group">
                            <label class="form-label" style="font-weight:700; font-size:0.85rem;">File Upload</label>
                            <div id="note-drop-zone" class="premium-card" style="border: 2px dashed var(--border); background: var(--bg-card2); padding: 2rem; text-align: center; cursor: pointer;">
                                <input type="file" id="note-file" hidden />
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                                <div style="font-weight: 700; font-size: 0.9rem;">Click or Drag & Drop</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">All file types supported (Max 50MB)</div>
                                <div id="note-preview" style="display: none; margin-top: 1rem; padding: 0.75rem; background: var(--success-bg); color: var(--success); border-radius: 8px; font-weight: 700; font-size: 0.8rem;"></div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem; height: 50px; font-weight: 800; border-radius: 12px;">PUBLISH NOTE</button>
                    </form>
                `)}
            </div>

            <div class="list-pane">
                ${TeacherPageBuilder.section('Published Materials', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', `
                    ${TeacherPageBuilder.table(['Title', 'Target', 'Timeline', 'Date', ''], rows)}
                `)}
            </div>
        </div>
    </div>
    `;

    UI.buildPortal('teacher-notes', content);

    // Setup Drag and Drop
    const dropZone = document.getElementById('note-drop-zone');
    const fileInput = document.getElementById('note-file');
    const preview = document.getElementById('note-preview');

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--maroon)'; };
    dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--border)'; };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            preview.textContent = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ' + fileInput.files[0].name;
            preview.style.display = 'block';
        }
    };
    fileInput.onchange = () => {
        if (fileInput.files.length) {
            preview.textContent = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ' + fileInput.files[0].name;
            preview.style.display = 'block';
        }
    };

    document.getElementById('note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[TEACHER NOTE] Form submit fired');
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
          const file = fileInput.files[0];
          let fileData = null;
          if (file) {
              console.log('[TEACHER NOTE] Reading file:', file.name);
              fileData = await new Promise(r => {
                  const reader = new FileReader();
                  reader.onload = (ev) => r(ev.target.result);
                  reader.readAsDataURL(file);
              });
          }

          const note = {
              id: 'n' + Date.now(),
              title: document.getElementById('note-title').value,
              subject: document.getElementById('note-subject').value,
              class: document.getElementById('note-class').value,
              week: document.getElementById('note-week').value,
              desc: document.getElementById('note-desc').value,
              date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              fileData,
              fileName: file ? file.name : null
          };

          console.log('[TEACHER NOTE] Calling addNote with:', JSON.stringify({ title: note.title, subject: note.subject, class: note.class, week: note.week, desc: note.desc, fileName: note.fileName }));
          const result = await addNote(note, user.id);
          console.log('[TEACHER NOTE] addNote returned:', result);
          UI.toast('Material published successfully! Students will be notified.', 'success');
        } catch (err) {
          console.error('[TEACHER NOTE] Failed:', err);
          UI.toast(err?.message || 'Failed to publish note. Please try again.', 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'PUBLISH NOTE';
          renderTeacherNotes();
        }
    });
}

/**
 * ASSIGNMENTS MANAGEMENT
 */
/**
 * ASSIGNMENTS MANAGEMENT
 */
async function renderTeacherAssign() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const mySubjects = Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [];
    const myClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];
    let assignments = getAssignments();
    if (assignments.length === 0) {
      try {
        const result = await API.assignments.getAll();
        assignments = (result.data || result.assignments || []).map(normalizeAssignment);
        if (assignments.length > 0) writeJson(DATA_KEYS.assignments, assignments);
      } catch (e) {
        console.warn('[renderTeacherAssign] Direct fetch failed:', e?.message);
      }
    }
    const submissions = getSubmissions();

    const subjectOptions = mySubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const classOptions = myClasses.map(c => `<option value="${c}">${c}</option>`).join('');

    const items = assignments.map(a => {
        const submissionCount = submissions.filter(s => s.assignmentId === a.id).length;
        const typeBadge = a.type === 'mcq' ? '<span class="badge-premium" style="background:#2563EB; font-size:0.6rem;">MCQ</span>' : 
                          a.type === 'theory' ? '<span class="badge-premium" style="background:#B45309; font-size:0.6rem;">THEORY</span>' : '';
        return `
        <div class="premium-card" style="padding: 1.5rem; margin-bottom: 1rem; border-left: 4px solid ${a.dueClass === 'due-today' ? 'var(--danger)' : 'var(--info)'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                        <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--text);">${a.title}</h4>
                        ${typeBadge}
                        <span class="badge-premium ${a.dueClass === 'due-today' ? 'danger' : 'info'}">${a.dueLabel}</span>
                        ${submissionCount > 0 ? `<span class="badge-premium success">${submissionCount} submission${submissionCount > 1 ? 's' : ''}</span>` : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
                        ${a.subject} • ${a.class || 'All Classes'} • <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${a.est} Points
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-ghost btn-sm" onclick="viewAssignmentSubmissions('${a.id}')">${UI.icon('eye')}</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteAssignment('${a.id}'); renderTeacherAssign();" style="color:var(--danger);">${UI.icon('trash')}</button>
                </div>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-sec); line-height: 1.5; background: var(--bg-card2); padding: 0.75rem; border-radius: 8px;">${a.desc || 'No description provided.'}</p>
        </div>
    `}).join('');

    const content = `
    <div class="page" style="animation: fadeIn 0.3s ease;">
        ${TeacherPageBuilder.hero('Assignments', 'Create MCQ or Theory tasks, track student progress, and grade submissions.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>')}

        <div style="display: grid; grid-template-columns: 1fr 450px; gap: 2.5rem; margin-top: 2rem;">
            <div class="list-pane">
                ${TeacherPageBuilder.section('Current Assignments', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', items || '<div style="text-align:center; padding: 4rem; color:var(--text-muted);">No active assignments found.</div>', `<button class="btn btn-primary btn-sm" onclick="document.getElementById('assign-title').focus()">${UI.icon('plus')} NEW</button>`)}
            </div>

            <div class="form-pane">
                ${TeacherPageBuilder.section('Create New Task', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', `
                    <form id="assign-form">
                        ${TeacherPageBuilder.formGroup('Task Title', `<input type="text" id="assign-title" class="form-input" placeholder="e.g. Week 4 Quiz" required />`)}

                        ${TeacherPageBuilder.formGroup('Assignment Type', `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                <label style="display:flex; align-items:center; gap:0.5rem; padding:0.75rem; border:2px solid var(--border); border-radius:10px; cursor:pointer; transition:all 0.2s;" onclick="selectAssignType('mcq')">
                                    <input type="radio" name="assign-type" value="mcq" id="type-mcq" style="width:auto;" />
                                    <span style="font-size:1.2rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
                                    <span style="font-weight:700; font-size:0.85rem;">MCQ</span>
                                </label>
                                <label style="display:flex; align-items:center; gap:0.5rem; padding:0.75rem; border:2px solid var(--border); border-radius:10px; cursor:pointer; transition:all 0.2s;" onclick="selectAssignType('theory')">
                                    <input type="radio" name="assign-type" value="theory" id="type-theory" style="width:auto;" />
                                    <span style="font-size:1.2rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️</span>
                                    <span style="font-weight:700; font-size:0.85rem;">Theory</span>
                                </label>
                            </div>
                        `)}

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            ${TeacherPageBuilder.formGroup('Subject', `
                                <select id="assign-subject" class="form-input" required>
                                    <option value="">Select</option>
                                    ${subjectOptions}
                                </select>
                            `)}
                            ${TeacherPageBuilder.formGroup('Class', `
                                <select id="assign-class" class="form-input"
                                    <option value="">All</option>
                                    ${classOptions}
                                </select>
                            `)}
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            ${TeacherPageBuilder.formGroup('Points', `<input type="number" id="assign-points" class="form-input" value="10" />`)}
                            ${TeacherPageBuilder.formGroup('Due Date', `<input type="date" id="assign-due" class="form-input" required />`)}
                        </div>

                        ${TeacherPageBuilder.formGroup('Instructions', `<textarea id="assign-desc" class="form-input" style="height: 80px; resize: none;" placeholder="Provide clear instructions..."></textarea>`)}

                        <!-- MCQ Options -->
                        <div id="mcq-options-section" style="display:none; margin-top:1rem; padding:1rem; background:#F0F9FF; border-radius:12px; border:1px solid #BAE6FD;">
                            <h4 style="font-weight:800; margin-bottom:0.75rem; color:#0369A1;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> MCQ Questions</h4>
                            <div id="mcq-questions-container"></div>
                            <button type="button" class="btn btn-ghost btn-sm" onclick="addMcqQuestion()" style="margin-top:0.5rem; color:#0369A1; background:#E0F2FE;">+ Add Question</button>
                            <p style="font-size:0.75rem; color:#64748B; margin-top:0.5rem;">Add at least 1 MCQ question. Each question can have multiple choice options.</p>
                        </div>

                        <!-- Theory Upload -->
                        <div id="theory-upload-section" style="display:none; margin-top:1rem; padding:1rem; background:#FFFBEB; border-radius:12px; border:1px solid #FDE68A;">
                            <h4 style="font-weight:800; margin-bottom:0.75rem; color:#B45309;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️ Upload Question Paper</h4>
                            <div id="theory-drop-zone" class="drop-zone" style="border: 2px dashed #FDE68A; border-radius:12px; padding:1.5rem; text-align:center; background:#white; cursor:pointer; transition:all 0.2s;">
                                <input type="file" id="theory-file" class="file-input" style="display:none;" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                                <span style="font-size:2rem; color:#B45309; display:block; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                                <p style="font-weight:600; margin-bottom:0.25rem;">Click to upload or drag and drop</p>
                                <p style="font-size:0.75rem; color:#92400E; margin:0;">PDF, DOC, DOCX, PNG, JPG (MAX. 50MB)</p>
                                <div id="theory-file-preview" class="file-preview" style="display:none; margin-top:1rem; padding:0.75rem; background:#FEF3C7; border-radius:8px; color:#B45309; font-weight:600;"></div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem; height: 50px; font-weight: 800; border-radius: 12px; border:none; background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-light) 100%);">CREATE ASSIGNMENT</button>
                    </form>
                `)}
            </div>
        </div>
    </div>
    `;

    UI.buildPortal('teacher-assign', content);

    // Form submit handler
    document.getElementById('assign-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const assignType = document.querySelector('input[name="assign-type"]:checked')?.value;
        if (!assignType) {
            UI.toast('Please select assignment type (MCQ or Theory)', 'error');
            return;
        }

        const due = new Date(document.getElementById('assign-due').value);
        const diff = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));

        let dueLabel = `Due in ${diff} days`;
        let dueClass = 'due-days';
        if (diff === 0) { dueLabel = 'Due Today'; dueClass = 'due-today'; }
        if (diff < 0) { dueLabel = 'Closed'; dueClass = 'due-closed'; }

        const assignment = {
            id: 'asgn' + Date.now(),
            title: document.getElementById('assign-title').value,
            subject: document.getElementById('assign-subject').value,
            class: document.getElementById('assign-class').value,
            est: document.getElementById('assign-points').value,
            desc: document.getElementById('assign-desc').value,
            dueDate: document.getElementById('assign-due').value,
            dueLabel,
            dueClass,
            status: 'active',
            type: assignType,
            actions: [assignType === 'mcq' ? 'quiz' : 'submit'],
            icon: assignType === 'mcq' ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️',
            iconColor: assignType === 'mcq' ? '#2563EB' : '#B45309',
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        };

        // Handle MCQ questions
        if (assignType === 'mcq') {
            const mcqQuestions = [];
            document.querySelectorAll('.mcq-question-item').forEach(qEl => {
                const qIndex = qEl.dataset.index;
                const questionText = document.getElementById(`mcq-q-text-${qIndex}`)?.value;
                const options = [];
                for (let i = 0; i < 4; i++) {
                    const optText = document.getElementById(`mcq-q-opt-${qIndex}-${i}`)?.value;
                    if (optText) options.push(optText);
                }
                const correctOption = parseInt(document.getElementById(`mcq-q-correct-${qIndex}`)?.value) || 0;
                if (questionText && options.length >= 2) {
                    mcqQuestions.push({
                        id: 'q' + Date.now() + qIndex,
                        text: questionText,
                        options: options,
                        correctAnswer: correctOption,
                        marks: 1
                    });
                }
            });
            assignment.questionsList = mcqQuestions;
            assignment.questions = mcqQuestions.length;
            assignment.format = 'mcq';
        }

        // Handle Theory file upload
        if (assignType === 'theory') {
            const theoryFile = document.getElementById('theory-file').files[0];
            if (theoryFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    assignment.fileData = e.target.result;
                    assignment.fileName = theoryFile.name;
                    assignment.format = 'theory';
                    saveAndNotify(assignment, user);
                };
                reader.readAsDataURL(theoryFile);
            } else {
                assignment.format = 'theory';
                saveAndNotify(assignment, user);
            }
        } else {
            saveAndNotify(assignment, user);
        }
    });

    function saveAndNotify(assignment, user) {
        addAssignment(assignment, user.id);
        UI.toast('Assignment created and sent to students! They will be notified.', 'success');
        renderTeacherAssign();
    }
}

// Global function for assignment type selection
window.selectAssignType = function(type) {
    document.querySelectorAll('input[name="assign-type"]').forEach(r => {
        r.parentElement.style.borderColor = 'var(--border)';
        r.parentElement.style.background = 'white';
    });
    
    const selectedRadio = document.getElementById('type-' + type);
    if (selectedRadio) {
        selectedRadio.checked = true;
        selectedRadio.parentElement.style.borderColor = type === 'mcq' ? '#2563EB' : '#B45309';
        selectedRadio.parentElement.style.background = type === 'mcq' ? '#EFF6FF' : '#FFFBEB';
    }

    // Show/hide sections
    const mcqSection = document.getElementById('mcq-options-section');
    const theorySection = document.getElementById('theory-upload-section');
    
    if (mcqSection) mcqSection.style.display = type === 'mcq' ? 'block' : 'none';
    if (theorySection) theorySection.style.display = type === 'theory' ? 'block' : 'none';

    // Initialize MCQ questions if first time
    if (type === 'mcq' && mcqSection) {
        const container = document.getElementById('mcq-questions-container');
        if (container && !container.innerHTML.trim()) {
            addMcqQuestion();
        }
    }
};

// Add MCQ Question
window.addMcqQuestion = function() {
    const container = document.getElementById('mcq-questions-container');
    if (!container) return;

    const index = container.querySelectorAll('.mcq-question-item').length;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'mcq-question-item';
    questionDiv.dataset.index = index;
    questionDiv.style.cssText = 'background:white; padding:1rem; border-radius:10px; margin-bottom:1rem; border:1px solid var(--border);';
    questionDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <strong style="color:#0369A1;">Question ${index + 1}</strong>
            <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.mcq-question-item').remove()" style="color:#DC2626; font-size:0.75rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Remove</button>
        </div>
        <div style="margin-bottom:0.75rem;">
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Question Text</label>
            <textarea id="mcq-q-text-${index}" class="form-input" rows="2" placeholder="Enter your question..." style="width:100%;"></textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.75rem;">
            <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Option A</label>
                <input type="text" id="mcq-q-opt-${index}-0" class="form-input" placeholder="Option A" style="width:100%;" />
            </div>
            <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Option B</label>
                <input type="text" id="mcq-q-opt-${index}-1" class="form-input" placeholder="Option B" style="width:100%;" />
            </div>
            <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Option C</label>
                <input type="text" id="mcq-q-opt-${index}-2" class="form-input" placeholder="Option C" style="width:100%;" />
            </div>
            <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Option D</label>
                <input type="text" id="mcq-q-opt-${index}-3" class="form-input" placeholder="Option D" style="width:100%;" />
            </div>
        </div>
        <div>
            <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Correct Answer</label>
            <select id="mcq-q-correct-${index}" class="form-input" style="width:auto;">
                <option value="0">Option A</option>
                <option value="1">Option B</option>
                <option value="2">Option C</option>
                <option value="3">Option D</option>
            </select>
        </div>
    `;
    container.appendChild(questionDiv);
};

window.viewAssignmentSubmissions = function(assignmentId) {
    const assignments = getAssignments();
    const submissions = getSubmissions();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:700px; max-height:90vh; overflow-y:auto;">
            <div class="modal-header">
                <h3><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Submissions - ${assignment.title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom:1rem; color:var(--text-muted);">Subject: ${assignment.subject} | Class: ${assignment.class || 'All'}</p>
                ${assignmentSubmissions.length === 0 ? 
                    '<div style="text-align:center; padding:3rem; color:var(--text-muted);"><div style="font-size:3rem; margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div><h4>No submissions yet</h4><p>Students haven\'t submitted their work for this assignment.</p></div>' :
                    assignmentSubmissions.map(s => `
                        <div class="premium-card" style="padding:1.25rem; margin-bottom:1rem; border-left:4px solid var(--success);">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div>
                                    <div style="font-weight:800; font-size:1.1rem;">${s.studentName}</div>
                                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">Submitted: ${s.date}</div>
                                    ${s.comments ? `<div style="font-size:0.9rem; margin-top:0.75rem; padding:0.75rem; background:var(--bg-card2); border-radius:8px;"><strong>Comments:</strong> ${s.comments}</div>` : ''}
                                </div>
                                <div style="display:flex; gap:0.5rem;">
                                    ${s.fileData ? `<a href="${s.fileData}" download="${s.fileName}" class="btn btn-primary btn-sm"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * EXAMS & ASSESSMENTS
 */
async function renderTeacherExams() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const mySubjects = Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [];
    const myClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];
    let exams = getExams();
    if (exams.length === 0) {
      try {
        const result = await API.teacher.getExams();
        exams = (result.data || []).map(normalizeExam);
        if (exams.length > 0) writeJson(DATA_KEYS.exams, exams);
      } catch (e) {
        console.warn('[renderTeacherExams] Direct fetch failed:', e?.message);
      }
    }

    const subjectOptions = mySubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const classOptions = myClasses.map(c => `<option value="${c}">${c}</option>`).join('');

    // Categorize exams (backend uses 'type', frontend also stores 'category')
    const getCategory = (e) => e.category || (e.type === 'midterm' ? 'midterm' : (e.type === 'final' || e.type === 'quiz' ? 'exam' : null));
    const getQuestionCount = (e) => {
        if (Array.isArray(e.questionsList)) return e.questionsList.length;
        if (typeof e.questions === 'number') return e.questions;
        if (Array.isArray(e.questions)) return e.questions.length;
        return 0;
    };
    const activeExams = exams.filter(e => e.status === 'active');
    const draftExams = exams.filter(e => e.status !== 'active');
    const midtermExams = exams.filter(e => getCategory(e) === 'midterm');
    const finalExams = exams.filter(e => getCategory(e) === 'exam');
    const uncategorized = exams.filter(e => !getCategory(e));

    function buildExamCard(e) {
        const isActive = e.status === 'active';
        const cat = getCategory(e);
        const catLabel = cat === 'midterm' ? 'MID-TERM TEST' : (cat === 'exam' ? 'EXAM' : 'UNCATEGORIZED');
        const catColor = cat === 'midterm' ? '#1565C0' : (cat === 'exam' ? '#7B1D3C' : '#6B7280');
        const catBg = cat === 'midterm' ? '#E3F2FD' : (cat === 'exam' ? '#FDE8EE' : '#F3F4F6');
        return `
        <div class="premium-card" style="padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid ${isActive ? '#10B981' : catColor};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.4rem;">
                        <span style="font-size: 0.65rem; font-weight: 800; letter-spacing: 0.08em; padding: 0.25rem 0.7rem; border-radius: 6px; background: ${catBg}; color: ${catColor}; border: 1px solid ${catColor}30;">${catLabel}</span>
                        <span class="badge-premium" style="background:${isActive ? '#10B981' : '#6B7280'}; font-size: 0.6rem;">${isActive ? 'ACTIVE' : 'DRAFT'}</span>
                        <span class="badge-premium ${e.format === 'mcq' ? 'success' : 'warning'}" style="font-size: 0.6rem;">${e.format ? e.format.toUpperCase() : 'MCQ'}</span>
                    </div>
                    <h4 style="font-weight: 800; font-size: 1.05rem; color: var(--text); margin-bottom: 0.25rem;">${e.title}</h4>
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                        ${e.subject} • ${e.class || 'All Classes'} • ⏱️ ${e.duration || '60'} mins • <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${getQuestionCount(e)} Questions
                    </div>
                    ${e.startTime ? `
                    <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #7B1D3C; font-weight: 600;">
                        <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Starts: ${new Date(e.startTime).toLocaleString()}
                    </div>
                    ` : ''}
                </div>
                <div style="display: flex; gap: 0.5rem; flex-direction: column;">
                    <button class="btn btn-ghost btn-sm" style="background:#DBEAFE; color:#2563EB; border:1px solid #2563EB;" onclick="editExam('${e.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
                    <button class="btn btn-ghost btn-sm" style="background:#FEE2E2; color:#DC2626; border:1px solid #DC2626;" onclick="if(confirm('Delete this exam?')) { deleteExam('${e.id}'); renderTeacherExams(); }"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Delete</button>
                </div>
            </div>
        </div>
    `}

    const allItems = exams.map(e => buildExamCard(e)).join('');
    const midtermItems = midtermExams.map(e => buildExamCard(e)).join('');
    const examItems = finalExams.map(e => buildExamCard(e)).join('');

    const emptyState = '<div style="text-align:center; padding: 3rem; color:var(--text-muted);"><div style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h4 style="font-weight: 700; margin-bottom: 0.25rem;">No assessments here yet</h4><p style="font-size: 0.85rem;">Create one using the form below.</p></div>';

    const content = `
    <div class="page" style="animation: fadeIn 0.3s ease;">
        ${TeacherPageBuilder.hero('Exams & Assessments', 'Create digital assessments, scheduled quizzes, and term-end examinations.', '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>')}

        <div style="margin-top: 2rem;">
            <!-- Category Filter Tabs -->
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary exam-cat-tab" data-cat="all" style="background: #7B1D3C; border-radius: 20px; font-size: 0.8rem; padding: 0.5rem 1.25rem; font-weight: 700;" onclick="filterExamCategory('all')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> All (${exams.length})</button>
                <button class="btn btn-ghost exam-cat-tab" data-cat="active" style="border-radius: 20px; font-size: 0.8rem; padding: 0.5rem 1.25rem; font-weight: 700; border: 2px solid #10B981; color: #10B981;" onclick="filterExamCategory('active')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Active (${activeExams.length})</button>
                <button class="btn btn-ghost exam-cat-tab" data-cat="midterm" style="border-radius: 20px; font-size: 0.8rem; padding: 0.5rem 1.25rem; font-weight: 700; border: 2px solid #1565C0; color: #1565C0;" onclick="filterExamCategory('midterm')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Mid-term Tests (${midtermExams.length})</button>
                <button class="btn btn-ghost exam-cat-tab" data-cat="exam" style="border-radius: 20px; font-size: 0.8rem; padding: 0.5rem 1.25rem; font-weight: 700; border: 2px solid #7B1D3C; color: #7B1D3C;" onclick="filterExamCategory('exam')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Exams (${finalExams.length})</button>
            </div>

            <!-- All Assessments -->
            <div id="exam-cat-all" class="exam-cat-section">
                ${allItems || emptyState}
            </div>

            <!-- Active Assessments -->
            <div id="exam-cat-active" class="exam-cat-section" style="display: none;">
                ${activeExams.length ? activeExams.map(e => buildExamCard(e)).join('') : '<div style="text-align:center; padding: 3rem; color:var(--text-muted);"><div style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.3;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><h4 style="font-weight: 700; margin-bottom: 0.25rem;">No active assessments</h4><p style="font-size: 0.85rem;">Create one and set its status to active.</p></div>'}
            </div>

            <!-- Mid-term Tests Only -->
            <div id="exam-cat-midterm" class="exam-cat-section" style="display: none;">
                ${midtermItems || emptyState}
            </div>

            <!-- Exams Only -->
            <div id="exam-cat-exam" class="exam-cat-section" style="display: none;">
                ${examItems || emptyState}
            </div>
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span> Create New Assessment
            </div>
            <form id="exam-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Exam Title</label>
                        <input type="text" id="exam-title" class="form-input" placeholder="e.g. Mid-term Physics Quiz" required />
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Subject</label>
                        <select id="exam-subject" class="form-input" required>
                            <option value="">Select</option>
                            ${subjectOptions}
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Category</label>
                        <select id="exam-category" class="form-input" required style="font-weight: 700;">
                            <option value="">Select Category</option>
                            <option value="midterm"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Mid-term Test</option>
                            <option value="exam"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Exam</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Class</label>
                        <select id="exam-class" class="form-input"
                            <option value="">All</option>
                            ${classOptions}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Format</label>
                        <select id="exam-format" class="form-input">
                            <option value="mcq">MCQ (Auto-graded)</option>
                            <option value="theory">Theory (Manual)</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Duration (Mins)</label>
                        <input type="number" id="exam-duration" class="form-input" value="60" />
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label">Start Date & Time</label>
                        <input type="datetime-local" id="exam-start-time" class="form-input" />
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom: 1.25rem;">
                    <label class="form-label">Instructions</label>
                    <textarea id="exam-desc" class="form-input" style="height: 80px; resize: none;" placeholder="Provide clear instructions..."></textarea>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-sec); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Build Questions
                        <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                            <button type="button" class="btn btn-ghost btn-sm" onclick="toggleBulkImport()" style="border: 2px solid #1565C0; color: #1565C0; font-weight: 700;" id="bulk-import-toggle"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Bulk Import / Paste</button>
                            <button type="button" class="btn btn-primary btn-sm" onclick="addExamQuestion()" style="background: #2D9B6F;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Question</button>
                        </div>
                    </div>

                    <!-- Bulk Import Panel -->
                    <div id="bulk-import-panel" style="display: none; margin-bottom: 1rem;">
                        <div style="background: linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%); border: 2px solid #1565C0; border-radius: 12px; padding: 1.25rem; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                                <span style="font-size: 1.2rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                                <h4 style="font-weight: 800; font-size: 0.95rem; color: #1565C0; margin: 0;">Paste or Drop Questions</h4>
                                <button type="button" class="btn btn-ghost btn-sm" onclick="toggleBulkImport()" style="margin-left: auto; font-size: 0.75rem; color: #6B7280;">× Close</button>
                            </div>

                            <!-- Drag & Drop Zone -->
                            <div id="bulk-drop-zone" style="border: 2px dashed #93C5FD; border-radius: 10px; padding: 1.5rem; text-align: center; background: white; cursor: pointer; transition: all 0.2s; margin-bottom: 1rem;" onclick="document.getElementById('bulk-file-input').click()">
                                <input type="file" id="bulk-file-input" style="display: none;" />
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                                <div style="font-weight: 700; font-size: 0.9rem; color: #1565C0;">Drag & Drop a text file here</div>
                                <div style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">or click to browse • All file types supported</div>
                                <div id="bulk-file-preview" style="display: none; margin-top: 0.75rem; padding: 0.5rem; background: #DBEAFE; border-radius: 6px; color: #1565C0; font-weight: 600; font-size: 0.8rem;"></div>
                            </div>

                            <!-- Paste Area -->
                            <div style="margin-bottom: 0.75rem;">
                                <label style="font-weight: 700; font-size: 0.8rem; color: #374151; margin-bottom: 0.4rem; display: block;">Or paste your questions below:</label>
                                <textarea id="bulk-questions-text" class="form-input" style="height: 180px; font-family: 'Courier New', monospace; font-size: 0.85rem; line-height: 1.6; resize: vertical; border: 2px solid #D1D5DB; border-radius: 10px;" placeholder="Paste questions in this format:

1. What is the capital of Nigeria?
A) Lagos
B) Abuja*
C) Kano
D) Port Harcourt

2. What is 5 + 3?
A) 6
B) 7
C) 8*
D) 9

(Mark correct answer with * at the end)"></textarea>
                            </div>

                            <!-- Format Guide -->
                            <details style="margin-bottom: 1rem;">
                                <summary style="cursor: pointer; font-weight: 700; font-size: 0.8rem; color: #1565C0; user-select: none;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> View Format Guide</summary>
                                <div style="margin-top: 0.5rem; padding: 0.75rem; background: white; border-radius: 8px; font-size: 0.75rem; color: #374151; line-height: 1.7; border: 1px solid #E5E7EB;">
                                    <strong>Supported Format:</strong><br>
                                    <code style="background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px;">1. Question text here?</code><br>
                                    <code style="background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px;">A) First option</code><br>
                                    <code style="background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px;">B) Second option*</code> ← star marks correct answer<br>
                                    <code style="background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px;">C) Third option</code><br>
                                    <code style="background: #F3F4F6; padding: 0.15rem 0.4rem; border-radius: 4px;">D) Fourth option</code><br><br>
                                    <strong>Also works with:</strong> <code>A.</code>, <code>a)</code>, <code>(A)</code>, or just <code>A</code> as option labels.<br>
                                    <strong>Tip:</strong> Leave a blank line between questions. Number prefix is optional.
                                </div>
                            </details>

                            <button type="button" class="btn btn-primary btn-block" onclick="parseBulkQuestions()" style="background: linear-gradient(135deg, #1565C0 0%, #1E88E5 100%); border: none; height: 44px; font-weight: 800; border-radius: 10px; font-size: 0.9rem;">
                                <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Import Questions
                            </button>
                        </div>
                    </div>

                    <div id="questions-list" style="display: grid; grid-template-columns: 1fr; gap: 0.75rem; max-height: 350px; overflow-y: auto; padding: 0.5rem; background: #fafafa; border-radius: 12px; border: 1px solid var(--border);"></div>
                    
                    <!-- Theory Questions Section -->
                    <div id="theory-questions-section" style="display: none; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-sec); display: flex; align-items: center; gap: 0.5rem;">
                                <span><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>️</span> Theory Questions
                            </div>
                            <button type="button" class="btn btn-primary btn-sm" onclick="addTheoryQuestion()" style="background: #B45309;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Theory Question</button>
                        </div>
                        <div id="theory-questions-list" style="display: grid; grid-template-columns: 1fr; gap: 1rem; max-height: 400px; overflow-y: auto; padding: 0.5rem; background: #FFFBEB; border-radius: 12px; border: 1px solid #FDE68A;"></div>
                        
                        <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 12px; border: 1px solid var(--border);">
                            <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-sec); margin-bottom: 0.5rem; display: block;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Or Upload Question Paper (PDF, DOC, Images)</label>
                            <input type="file" id="theory-file-upload" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="width: 100%; padding: 0.75rem; border: 2px dashed #FDE68A; border-radius: 8px; background: #FFFBEB; cursor: pointer;" />
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Upload a file if you prefer to use a pre-written question paper</p>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary btn-block" style="height: 50px; font-weight: 800; border-radius: 12px; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); border:none;">PUBLISH ASSESSMENT</button>
            </form>
        </div>
    </div>
    `;

    UI.buildPortal('teacher-exams', content);

    // Add theory question function
    window.addTheoryQuestion = function() {
        const container = document.getElementById('theory-questions-list');
        if (!container) return;

        const qIndex = container.children.length + 1;
        const div = document.createElement('div');
        div.className = 'theory-question-item premium-card';
        div.style.padding = '1.25rem';
        div.style.background = 'white';
        div.style.border = '2px solid #B45309';
        div.style.borderRadius = '12px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span style="font-weight: 900; font-size: 1.1rem; color: white; background: #B45309; padding: 0.4rem 1rem; border-radius: 8px;">Q${qIndex}</span>
                <button type="button" class="btn btn-ghost btn-sm" style="color:#DC2626; background:#FEE2E2; padding: 0.4rem 0.75rem; border-radius:6px;" onclick="this.closest('.theory-question-item').remove()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Delete</button>
            </div>
            <label style="font-weight: 700; font-size: 0.9rem; color: var(--text-sec); margin-bottom: 0.5rem; display: block;">Question Text</label>
            <textarea class="form-input theory-q-text" rows="4" placeholder="Type your theory question here..." style="width: 100%; font-size: 1rem; border: 1px solid #D1D5DB; border-radius: 8px; margin-bottom: 1rem;"></textarea>
            
            <label style="font-weight: 700; font-size: 0.9rem; color: var(--text-sec); margin-bottom: 0.5rem; display: block;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Upload Image (Optional)</label>
            <input type="file" class="form-input theory-q-image" accept="image/*" style="width: 100%; font-size: 0.9rem; border: 1px solid #D1D5DB; border-radius: 8px; margin-bottom: 1rem;" onchange="previewTheoryImage(this)" />
            <div class="theory-image-preview" style="display:none; margin-bottom: 1rem;"></div>
            
            <label style="font-weight: 700; font-size: 0.9rem; color: var(--text-sec); margin-bottom: 0.5rem; display: block;">Marks</label>
            <input type="number" class="form-input theory-q-marks" value="5" min="1" max="50" style="width: 100px; font-size: 1rem; border: 1px solid #D1D5DB; border-radius: 8px;" />
        `;
        container.appendChild(div);
    };

    window.previewTheoryImage = function(input) {
        const previewContainer = input.nextElementSibling;
        const file = input.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.innerHTML = `
                    <div style="position: relative; display: inline-block;">
                        <img src="${e.target.result}" style="max-width: 300px; max-height: 200px; border-radius: 8px; border: 2px solid var(--border);" />
                        <button type="button" onclick="this.parentElement.parentElement.style.display='none'; input.value=''" style="position: absolute; top: -10px; right: -10px; width: 30px; height: 30px; border-radius: 50%; background: #DC2626; color: white; border: none; cursor: pointer; font-weight: bold;">×</button>
                        <input type="hidden" class="theory-image-data" value="${e.target.result}" />
                    </div>
                `;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    // Question Builder Logic - Vertical layout with larger icons
    window.addExamQuestion = () => {
        const qContainer = document.getElementById('questions-list');
        const questionCount = qContainer.children.length + 1;
        
        const div = document.createElement('div');
        div.className = 'premium-card question-card';
        div.style.padding = '1.25rem';
        div.style.marginBottom = '1rem';
        div.style.background = 'white';
        div.style.border = '2px solid #7B1D3C';
        div.style.borderRadius = '12px';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span style="font-weight: 900; font-size: 1.1rem; color: white; background: #7B1D3C; padding: 0.4rem 1rem; border-radius: 8px;">Q${questionCount}</span>
                <button type="button" class="btn btn-ghost btn-sm" style="color:#DC2626; background:#FEE2E2; padding: 0.4rem 0.75rem; border-radius:6px;" onclick="this.closest('.premium-card').remove(); updateQuestionNumbers();"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Delete</button>
            </div>
            <textarea class="form-input q-text" style="height: 70px; margin-bottom: 1rem; font-size: 1rem; border: 2px solid #E5E7EB; border-radius: 8px;" placeholder="Type your question here..."></textarea>
            <div style="margin-bottom: 0.75rem;">
                <div style="font-weight: 700; font-size: 0.9rem; color: #374151; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Options (A, B, C, D)</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="min-width:44px; height:44px; background:#7B1D3C; color:white; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; font-size:1.2rem;">A</span>
                    <input type="text" class="form-input opt" placeholder="Enter option A text" style="flex:1; font-size: 0.95rem; padding: 0.6rem; border: 1px solid #D1D5DB; border-radius: 8px;" />
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="min-width:44px; height:44px; background:#7B1D3C; color:white; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; font-size:1.2rem;">B</span>
                    <input type="text" class="form-input opt" placeholder="Enter option B text" style="flex:1; font-size: 0.95rem; padding: 0.6rem; border: 1px solid #D1D5DB; border-radius: 8px;" />
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="min-width:44px; height:44px; background:#7B1D3C; color:white; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; font-size:1.2rem;">C</span>
                    <input type="text" class="form-input opt" placeholder="Enter option C text" style="flex:1; font-size: 0.95rem; padding: 0.6rem; border: 1px solid #D1D5DB; border-radius: 8px;" />
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="min-width:44px; height:44px; background:#7B1D3C; color:white; display:flex; align-items:center; justify-content:center; border-radius:10px; font-weight:900; font-size:1.2rem;">D</span>
                    <input type="text" class="form-input opt" placeholder="Enter option D text" style="flex:1; font-size: 0.95rem; padding: 0.6rem; border: 1px solid #D1D5DB; border-radius: 8px;" />
                </div>
            </div>
            <div style="background: #E8F7F1; padding: 0.75rem; border-radius: 8px; border: 2px solid #2D9B6F;">
                <label style="font-weight: 700; font-size: 0.9rem; color: #2D9B6F; display: block; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Select Correct Answer</label>
                <select class="form-input correct-opt" style="background: white; border-color: #2D9B6F; color: #2D9B6F; font-weight: 700; font-size: 1rem; padding: 0.6rem; border-radius: 8px;">
                    <option value="0"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Correct Answer: A</option>
                    <option value="1"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Correct Answer: B</option>
                    <option value="2"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Correct Answer: C</option>
                    <option value="3"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Correct Answer: D</option>
                </select>
            </div>
        `;
        qContainer.appendChild(div);
        
        // Scroll to the new question
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    
    // Update question numbers after deletion
    window.updateQuestionNumbers = () => {
        const qContainer = document.getElementById('questions-list');
        const cards = qContainer.querySelectorAll('.premium-card');
        cards.forEach((card, idx) => {
            const span = card.querySelector('span');
            if (span && span.textContent.startsWith('Q')) {
                span.textContent = 'Q' + (idx + 1);
            }
        });
    };

    // ========== BULK IMPORT LOGIC ==========

    // Toggle bulk import panel
    window.toggleBulkImport = function() {
        const panel = document.getElementById('bulk-import-panel');
        const toggle = document.getElementById('bulk-import-toggle');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            toggle.style.background = '#1565C0';
            toggle.style.color = 'white';
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            panel.style.display = 'none';
            toggle.style.background = 'transparent';
            toggle.style.color = '#1565C0';
        }
    };

    // Parse bulk pasted/uploaded questions
    window.parseBulkQuestions = function() {
        const text = document.getElementById('bulk-questions-text').value.trim();
        if (!text) {
            UI.toast('Please paste your questions or drop a file first!', 'error');
            return;
        }

        const parsed = parseBulkText(text);

        if (parsed.length === 0) {
            UI.toast('Could not parse any questions. Check the format guide.', 'error');
            return;
        }

        // Add each parsed question as a card
        parsed.forEach(q => {
            addExamQuestion();
            const qContainer = document.getElementById('questions-list');
            const lastCard = qContainer.lastElementChild;
            if (lastCard) {
                const qText = lastCard.querySelector('.q-text');
                const opts = lastCard.querySelectorAll('.opt');
                const correctOpt = lastCard.querySelector('.correct-opt');

                if (qText) qText.value = q.text;
                if (opts[0]) opts[0].value = q.options[0] || '';
                if (opts[1]) opts[1].value = q.options[1] || '';
                if (opts[2]) opts[2].value = q.options[2] || '';
                if (opts[3]) opts[3].value = q.options[3] || '';
                if (correctOpt) correctOpt.value = q.correct;
            }
        });

        // Clear the textarea and close panel
        document.getElementById('bulk-questions-text').value = '';
        toggleBulkImport();
        UI.toast(`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Successfully imported ${parsed.length} question${parsed.length > 1 ? 's' : ''}!`, 'success');
    };

    // Text parser — supports multiple formats
    function parseBulkText(rawText) {
        const questions = [];
        // Split into blocks by blank lines or by question number patterns
        const blocks = rawText.split(/\n\s*\n/).filter(b => b.trim());

        for (const block of blocks) {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) continue;

            let questionText = '';
            const options = [];
            let correctIndex = 0;

            // Detect question line(s) vs option lines
            // Option line patterns: A) / A. / (A) / a) / a. etc
            const optionRegex = /^[\(\[]?([A-Da-d])[\)\.\]\:]?\s*(.+)/;

            let questionLines = [];
            let optionLines = [];

            for (const line of lines) {
                if (optionRegex.test(line)) {
                    optionLines.push(line);
                } else {
                    // If we already started collecting options, this is probably a new question
                    if (optionLines.length > 0) break;
                    questionLines.push(line);
                }
            }

            // Build question text (remove leading number like "1." or "Q1:")
            questionText = questionLines.join(' ').replace(/^[\d]+[\.\)\:\-]\s*/, '').replace(/^Q\d+[\.\)\:\-]?\s*/i, '').trim();

            if (!questionText || optionLines.length < 2) continue;

            // Parse options and detect correct answer (marked with *)
            for (let i = 0; i < optionLines.length && i < 4; i++) {
                const match = optionLines[i].match(optionRegex);
                if (match) {
                    let optText = match[2].trim();
                    // Check if this option is marked as correct with *
                    if (optText.endsWith('*')) {
                        correctIndex = i;
                        optText = optText.slice(0, -1).trim();
                    }
                    // Also check for (correct) or [correct] marker
                    if (/\(correct\)|\[correct\]/i.test(optText)) {
                        correctIndex = i;
                        optText = optText.replace(/\s*\(correct\)|\s*\[correct\]/gi, '').trim();
                    }
                    options.push(optText);
                }
            }

            // Pad options to 4 if less than 4
            while (options.length < 4) options.push('');

            if (questionText && options.filter(o => o).length >= 2) {
                questions.push({
                    text: questionText,
                    options: options.slice(0, 4),
                    correct: correctIndex
                });
            }
        }

        return questions;
    }

    // Setup Drag & Drop for bulk import
    const bulkDropZone = document.getElementById('bulk-drop-zone');
    const bulkFileInput = document.getElementById('bulk-file-input');
    const bulkFilePreview = document.getElementById('bulk-file-preview');

    if (bulkDropZone) {
        bulkDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            bulkDropZone.style.borderColor = '#1565C0';
            bulkDropZone.style.background = '#EFF6FF';
        });

        bulkDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            bulkDropZone.style.borderColor = '#93C5FD';
            bulkDropZone.style.background = 'white';
        });

        bulkDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            bulkDropZone.style.borderColor = '#93C5FD';
            bulkDropZone.style.background = 'white';
            if (e.dataTransfer.files.length) {
                handleBulkFile(e.dataTransfer.files[0]);
            }
        });

        bulkFileInput.addEventListener('change', () => {
            if (bulkFileInput.files.length) {
                handleBulkFile(bulkFileInput.files[0]);
            }
        });
    }

    function handleBulkFile(file) {
        // Accept any file type - read as text for bulk import

        bulkFilePreview.textContent = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ' + file.name;
        bulkFilePreview.style.display = 'block';

        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('bulk-questions-text').value = ev.target.result;
            UI.toast('File loaded! Click "Import Questions" to add them.', 'info');
        };
        reader.readAsText(file);
    }

    // Category tab filter logic
    window.filterExamCategory = function(cat) {
        document.querySelectorAll('.exam-cat-section').forEach(s => s.style.display = 'none');
        document.getElementById('exam-cat-' + cat).style.display = 'block';
        
        document.querySelectorAll('.exam-cat-tab').forEach(btn => {
            if (btn.dataset.cat === cat) {
                btn.classList.remove('btn-ghost');
                btn.classList.add('btn-primary');
                btn.style.background = cat === 'midterm' ? '#1565C0' : (cat === 'active' ? '#10B981' : '#7B1D3C');
                btn.style.color = 'white';
                btn.style.borderColor = 'transparent';
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-ghost');
                btn.style.background = 'transparent';
                const origColor = btn.dataset.cat === 'midterm' ? '#1565C0' : (btn.dataset.cat === 'active' ? '#10B981' : '#7B1D3C');
                btn.style.color = origColor;
                btn.style.borderColor = origColor;
            }
        });
    };

    // Add theory question input section after format dropdown
    const formatSelect = document.getElementById('exam-format');
    formatSelect.addEventListener('change', function() {
        const theorySection = document.getElementById('theory-questions-section');
        const mcqSection = document.getElementById('mcq-questions-section');
        if (this.value === 'theory') {
            if (theorySection) theorySection.style.display = 'block';
            if (mcqSection) mcqSection.style.display = 'none';
        } else {
            if (theorySection) theorySection.style.display = 'none';
            if (mcqSection) mcqSection.style.display = 'block';
        }
    });

    document.getElementById('exam-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = document.getElementById('exam-category').value;
        const format = document.getElementById('exam-format').value;
        
        if (!category) {
            UI.toast('Please select a category (Mid-term Test or Exam)', 'error');
            return;
        }

        let questions = [];
        let fileData = null;
        let fileName = null;

        if (format === 'theory') {
            // Handle theory questions (typed or file upload)
            const theoryQuestions = [];
            document.querySelectorAll('.theory-question-item').forEach(qEl => {
                const qText = qEl.querySelector('.theory-q-text')?.value;
                const qMarks = parseInt(qEl.querySelector('.theory-q-marks')?.value) || 5;
                const qImageInput = qEl.querySelector('.theory-q-image');
                const qImageData = qEl.querySelector('.theory-image-data')?.value;
                
                if (qText && qText.trim()) {
                    theoryQuestions.push({
                        id: 'tq' + Date.now() + Math.random().toString(36).substr(2, 9),
                        text: qText,
                        marks: qMarks,
                        type: 'theory',
                        image: qImageData || null
                    });
                }
            });

            // Check for file upload
            const theoryFile = document.getElementById('theory-file-upload')?.files[0];
            if (theoryFile) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    fileData = e.target.result;
                    fileName = theoryFile.name;
                    await saveTheoryExam();
                };
                reader.readAsDataURL(theoryFile);
            } else {
                await saveTheoryExam();
            }

            async function saveTheoryExam() {
                const startTimeInput = document.getElementById('exam-start-time').value;
                const startTime = startTimeInput ? new Date(startTimeInput).getTime() : null;
                const now = Date.now();

                let examStatus = 'upcoming';
                if (!startTime || startTime <= now) {
                    examStatus = 'active';
                }

                const examType = category === 'midterm' ? 'midterm' : 'quiz';
                const durationVal = parseInt(document.getElementById('exam-duration').value);
                const subject = document.getElementById('exam-subject').value || undefined;
                const startTimeIso = startTime ? new Date(startTime).toISOString() : undefined;
                const mappedQuestions = theoryQuestions.map(q => ({
                    id: q.id || generateUUID(),
                    text: q.text,
                    marks: q.marks,
                    options: Array.isArray(q.options) ? q.options.map(o => typeof o === 'string' ? o : o.text || '') : [],
                    correctIndex: q.correct,
                    type: q.type
                }));

                const payload = {
                    title: document.getElementById('exam-title').value,
                    type: examType,
                    description: document.getElementById('exam-desc').value || undefined,
                    subject,
                    format: 'theory',
                    status: examStatus,
                    startTime: startTimeIso,
                    duration: durationVal > 0 ? durationVal : undefined,
                    questions: mappedQuestions,
                    questionsList: mappedQuestions,
                    questionsCount: mappedQuestions.length,
                    fileData: fileData || undefined,
                    fileName: fileName || undefined
                };

                await addExam(payload, user.id);
                UI.toast('Theory exam published! Students can now take it.', 'success');
                renderTeacherExams();
            }
            return;
        }

        // Handle MCQ questions
        const qEls = document.querySelectorAll('.q-text');
        questions = Array.from(qEls).map(qEl => {
            const parent = qEl.closest('.premium-card');
            const opts = Array.from(parent.querySelectorAll('.opt')).map(o => o.value);
            return {
                text: qEl.value,
                options: opts,
                correct: parseInt(parent.querySelector('.correct-opt').value)
            };
        });

        const startTimeInput = document.getElementById('exam-start-time').value;
        const startTime = startTimeInput ? new Date(startTimeInput) : null;
        const now = Date.now();

        let examStatus = 'upcoming';
        if (!startTime || startTime.getTime() <= now) {
            examStatus = 'active';
        }

        // Map frontend category to backend enum
        const examType = category === 'midterm' ? 'midterm' : 'quiz';
        const durationVal = parseInt(document.getElementById('exam-duration').value);
        const subject = document.getElementById('exam-subject').value || undefined;
        const startTimeIso = startTime ? startTime.toISOString() : undefined;
        const mappedQuestions = questions.map(q => ({
            id: generateUUID(),
            text: q.text,
            options: Array.isArray(q.options) ? q.options.map(o => typeof o === 'string' ? o : o.text || '') : [],
            correctIndex: q.correct
        }));

        // Build clean payload matching backend schema exactly
        const payload = {
            title: document.getElementById('exam-title').value,
            type: examType,
            description: document.getElementById('exam-desc').value || undefined,
            subject,
            format: format || 'mcq',
            status: examStatus,
            startTime: startTimeIso,
            duration: durationVal > 0 ? durationVal : undefined,
            questions: mappedQuestions,
            questionsList: mappedQuestions,
            questionsCount: mappedQuestions.length
        };

        await addExam(payload, user.id);

        const catName = category === 'midterm' ? 'Mid-term Test' : 'Exam';
        if (startTime) {
            const startDate = new Date(startTime);
            UI.toast(`${catName} scheduled! Will start on ` + startDate.toLocaleString(), 'success');
        } else {
            UI.toast(`${catName} published! Students can take it now.`, 'success');
        }
        renderTeacherExams();
    });
}

function renderSubmissionsList(examId = '') {
    const submissions = examId ? getExamSubmissions(examId) : getSubmissions();
    const exams = getExams();

    if (submissions.length === 0) {
        return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><h4>No Submissions Yet</h4><p>Students haven't submitted any MCQ exams yet.</p></div>`;
    }

    return `
    <table class="teacher-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Class</th>
          <th>Exam</th>
          <th>Score</th>
          <th>Date Submitted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${submissions.map(s => {
        const exam = exams.find(e => e.id === s.examId);
        const questions = exam?.questionsList || [];
        
        // Calculate score if not already set
        let scorePercent = 'Pending';
        if (s.score !== null) {
            scorePercent = s.score + '%';
        } else if (s.answers && Array.isArray(s.answers) && questions.length > 0) {
            // Calculate from answers
            let correctCount = 0;
            questions.forEach((q, idx) => {
                const studentAnswer = s.answers[idx];
                // Handle correctIndex, correct, or correctAnswer field names
                const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
                if (studentAnswer !== undefined && studentAnswer === correctAns) {
                    correctCount++;
                }
            });
            scorePercent = Math.round((correctCount / questions.length) * 100) + '%';
        }
        
        return `
            <tr>
              <td>${s.studentName || 'Unknown'}</td>
              <td>${s.studentClass || '-'}</td>
              <td>${s.examTitle || exam?.title || 'Unknown'}</td>
              <td><strong>${scorePercent}</strong></td>
              <td>${new Date(s.submittedAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-ghost btn-sm view-submission-btn" data-id="${s.id}"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>️️ View</button>
              </td>
            </tr>
        `;
    }).join('')}
      </tbody>
    </table>
    `;
}

window.loadExamSubmissions = function () {
    console.log('[Teacher] loadExamSubmissions called');
    const examId = document.getElementById('submissions-exam-select')?.value;
    console.log('[Teacher] Selected examId:', examId);
    const submissionsListEl = document.getElementById('submissions-list');
    console.log('[Teacher] submissionsListEl:', submissionsListEl);
    if (!submissionsListEl) {
        console.log('[Teacher] submissions-list element not found');
        return;
    }

    submissionsListEl.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="loading-spinner"></div><p>Loading...</p></div>';
    console.log('[Teacher] Loading state set');

    Promise.all([
        API.submissions.getAll(),
        API.users.getUsers(),
        getExams().length === 0 ? API.teacher.getExams().catch(() => ({ data: [] })) : Promise.resolve({ data: getExams() })
    ]).then(([submissionsResponse, usersResponse, examsResponse]) => {
        console.log('[Teacher] Submissions response:', submissionsResponse);
        console.log('[Teacher] Users response:', usersResponse);
        let submissions = submissionsResponse?.data || [];
        const allUsers = usersResponse?.data || [];
        const students = allUsers.filter(u => u.role === 'student');
        console.log('[Teacher] Students found:', students.length);
        let exams = (examsResponse?.data || []).map(normalizeExam);
        if (exams.length === 0) exams = getExams();
        if (exams.length > 0 && getExams().length === 0) writeJson(DATA_KEYS.exams, exams);
        console.log('[Teacher 1st] Exams from getExams():', exams.length);
        console.log('[Teacher 1st] First exam sample:', exams[0]);
        console.log('[Teacher 1st] First exam questionsList:', exams[0]?.questionsList);
        // Use students from API response (line 2053) - no need to redeclare

        submissions = submissions.map(s => {
            const student = students.find(u => u.id === s.studentId || u.studentId === s.studentId || u.id === `u${s.studentId}` || u.studentId === `u${s.studentId}`);
            return {
                ...s,
                studentName: student?.name || s.studentName || s.studentId || 'Unknown',
                studentClass: student?.class || s.studentClass || '-'
            };
        });

        // Persist enriched submissions to localStorage so viewSubmissionDetails uses correct names
        saveSubmissions(submissions);

        const filtered = examId ? submissions.filter(s => s.examId === examId) : submissions;

        if (filtered.length === 0) {
            submissionsListEl.innerHTML = `<div class="empty-state" style="padding:3rem;"><h4>No Submissions</h4><p>Total in system: ${submissions.length}</p></div>`;
        } else {
            submissionsListEl.innerHTML = `<table class="teacher-table"><thead><tr><th>Student</th><th>Class</th><th>Exam</th><th>Score</th><th>Date</th><th>Actions</th></tr></thead><tbody>${filtered.map(s => {
                const exam = exams.find(e => e.id === s.examId);
                const questions = exam?.questionsList || [];
                // Look up student info if not present on submission
                const student = students.find(u => u.id === s.studentId || u.studentId === s.studentId || u.id === `u${s.studentId}` || u.studentId === `u${s.studentId}`);
                const studentName = s.studentName || student?.name || s.studentId || 'Unknown';
                const studentClass = s.studentClass || student?.class || 'N/A';
                
                // Calculate score if not already set
                let scorePercent = 'Pending';
                const shouldRecalc = (s.score === null || s.score === 0) && s.answers && Array.isArray(s.answers) && questions.length > 0;
                if (!shouldRecalc && s.score !== null) {
                    scorePercent = s.score + '%';
                } else if (shouldRecalc || (s.answers && Array.isArray(s.answers) && questions.length > 0)) {
                    let correctCount = 0;
                    questions.forEach((q, idx) => {
                        const studentAnswer = s.answers[idx];
                        // Handle correctIndex, correct, or correctAnswer field names
                        const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
                        if (studentAnswer !== undefined && studentAnswer === correctAns) {
                            correctCount++;
                        }
                    });
                    scorePercent = Math.round((correctCount / questions.length) * 100) + '%';
                }
                
                return `<tr><td>${studentName}</td><td>${studentClass}</td><td>${s.examTitle || exam?.title || 'Unknown'}</td><td><strong>${scorePercent}</strong></td><td>${new Date(s.submittedAt).toLocaleDateString()}</td><td><button class="btn btn-ghost btn-sm view-submission-btn" data-id="${s.id}">View</button></td></tr>`;
            }).join('')}</tbody></table>`;
        }
    }).catch(err => {
        console.error('[Teacher] loadExamSubmissions error:', err);
        submissionsListEl.innerHTML = '<div style="color:red; padding:2rem;">Failed to load: ' + err.message + '</div>';
    });
};

window.viewSubmissionDetails = function (submissionId) {
    // First try localStorage, then fallback to API
    let submission = getSubmissions().find(s => s.id === submissionId);

    // Helper function to enrich submission with student and exam info
    function enrichSubmission(sub) {
        // Get users and exams for enrichment
        const users = getAppUsers();
        const exams = getExams();
        
        console.log('[enrichSubmission] studentId:', sub.studentId);
        console.log('[enrichSubmission] Users count:', users.length);
        console.log('[enrichSubmission] User sample:', users[0]);
        
        // Find student info
        const student = users.find(u => u.id === sub.studentId || u.studentId === sub.studentId);
        console.log('[enrichSubmission] Found student:', student);
        
        sub.studentName = sub.studentName || student?.name || sub.studentId || 'Unknown';
        sub.studentClass = sub.studentClass || student?.class || 'N/A';
        
        console.log('[enrichSubmission] Final studentName:', sub.studentName);
        
        // Find exam info
        const exam = exams.find(e => e.id === sub.examId);
        sub.examTitle = sub.examTitle || exam?.title || 'Unknown';
        
        // Normalize answers - ensure they're in the right format (array of indices)
        let normalizedAnswers = sub.answers;
        console.log('[enrichSubmission] Raw answers:', JSON.stringify(sub.answers));
        
        if (sub.answers) {
            // Case 1: Already an array - use as-is
            if (Array.isArray(sub.answers)) {
                console.log('[enrichSubmission] Answers is array');
                normalizedAnswers = sub.answers;
            } 
            // Case 2: { "0": 1, "1": 2, ... } - direct numeric key format from exam.js
            else if (typeof sub.answers === 'object' && sub.answers !== null) {
                // First check for selectedAnswers (most common from frontend)
                if (sub.answers.selectedAnswers && typeof sub.answers.selectedAnswers === 'object') {
                    console.log('[enrichSubmission] Answers has selectedAnswers');
                    const selectedAnswers = sub.answers.selectedAnswers;
                    normalizedAnswers = Object.entries(selectedAnswers)
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([, value]) => Number(value));
                }
                // Direct numeric keys format
                else {
                    const keys = Object.keys(sub.answers);
                    const isNumericKeys = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
                    
                    if (isNumericKeys) {
                        console.log('[enrichSubmission] Answers is numeric key object');
                        normalizedAnswers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(sub.answers[k]));
                    }
                    // Case 4: Other object format
                    else {
                        console.log('[enrichSubmission] Answers is other object');
                        normalizedAnswers = Object.values(sub.answers).map(v => {
                            if (typeof v === 'object' && v !== null && 'selected' in v) {
                                return v.selected;
                            }
                            return v;
                        });
                    }
                }
            }
        }
        
        console.log('[enrichSubmission] Normalized answers:', normalizedAnswers);
        sub.answers = normalizedAnswers;
        
        return sub;
    }

    // If not found locally, fetch from API
    if (!submission) {
        API.submissions.getById(submissionId).then(response => {
            if (response?.data) {
                showSubmissionModal(enrichSubmission(response.data));
            }
        }).catch(() => {
            UI.toast('Submission not found', 'error');
        });
        return;
    }

    // Enrich local submission with student info from users (robust lookup)
    const users = getAppUsers();
    console.log('[viewSubmissionDetails] Local path - studentId:', submission.studentId, 'Users:', users.length);
    const students = users.filter(u => u.role === 'student');
    const student = students.find(u => 
        u.id === submission.studentId || 
        u.studentId === submission.studentId || 
        u.id === `u${submission.studentId}` ||
        u.studentId === `u${submission.studentId}`
    );
    console.log('[viewSubmissionDetails] Found student:', student);
    
    if (student) {
        submission.studentName = student.name;
        submission.studentClass = student.class;
    } else {
        submission.studentName = submission.studentName || submission.studentId || 'Unknown';
        submission.studentClass = submission.studentClass || 'N/A';
    }

    // Also enrich with exam title
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    if (exam) {
        submission.examTitle = exam.title;
    }
    
    // Normalize answers for local submissions too
    if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
        // Check if answers has selectedAnswers property
        if (submission.answers.selectedAnswers && typeof submission.answers.selectedAnswers === 'object') {
            const selectedAnswers = submission.answers.selectedAnswers;
            const keys = Object.keys(selectedAnswers);
            submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selectedAnswers[k]));
        } else {
            // Try direct numeric keys format
            const keys = Object.keys(submission.answers);
            const isNumeric = keys.every(k => !isNaN(Number(k)));
            if (isNumeric && keys.length > 0) {
                submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(submission.answers[k]));
            }
        }
    }
    console.log('[viewSubmissionDetails] Normalized answers:', submission.answers);

    showSubmissionModal(submission);
};

function showSubmissionModal(submission) {
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    const questions = exam?.questionsList || [];

    // Debug logging
    console.log('[showSubmissionModal] exam:', exam?.title, 'questions:', questions.length, 'answers:', submission.answers);

    // Safety net: resolve student name if it's still a raw ID like "u001"
    if (!submission.studentName || /^u?\d+$/.test(submission.studentName)) {
        const users = getAppUsers();
        const student = users.find(u => 
            u.id === submission.studentId || 
            u.studentId === submission.studentId || 
            u.id === `u${submission.studentId}` ||
            u.studentId === `u${submission.studentId}`
        );
        if (student) {
            submission.studentName = student.name;
            submission.studentClass = student.class || submission.studentClass;
        } else {
            submission.studentName = submission.studentName || submission.studentId || 'Unknown';
        }
    }

    // Normalize answers if still in object format (selectedAnswers or numeric keys) from API
    if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
        if (submission.answers.selectedAnswers && typeof submission.answers.selectedAnswers === 'object') {
            const selected = submission.answers.selectedAnswers;
            const keys = Object.keys(selected);
            submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selected[k]));
        } else {
            const keys = Object.keys(submission.answers);
            const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
            if (isNumeric) {
                submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(submission.answers[k]));
            }
        }
    }

    // Calculate score for MCQ exams
    let calculatedScore = submission.score;
    if (questions.length > 0 && submission.answers && Array.isArray(submission.answers)) {
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const studentAnswer = submission.answers[idx];
            const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
            if (studentAnswer !== undefined && studentAnswer === correctAns) {
                correctCount++;
            }
        });
        const answeredCount = submission.answers.filter(a => a !== undefined).length;
        calculatedScore = answeredCount > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        console.log('[showSubmissionModal] Calculated score:', calculatedScore, 'correct:', correctCount, 'total:', questions.length);
    }

    let detailsHTML = '<div style="max-height:400px; overflow-y:auto;">';

    if (questions.length > 0 && submission.answers && Array.isArray(submission.answers)) {
        questions.forEach((q, idx) => {
            const studentAnswer = submission.answers[idx];
            const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
            const isCorrect = studentAnswer === correctAns;
            // Handle missing question text gracefully
            const questionText = q.text || q.question || `Question ${idx + 1}`;
            detailsHTML += `
            <div style="background:${isCorrect ? '#E8F7F1' : '#FEE2E2'}; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid ${isCorrect ? '#2D9B6F' : '#DC2626'};">
                <p style="font-weight:700; margin-bottom:0.5rem;"><span style="color:#7B1D3C;">Q${idx + 1}.</span> ${questionText}</p>
                <p style="font-size:0.9rem; margin-bottom:0.5rem;">Options:</p>
                <ul style="margin:0; padding-left:1.5rem; font-size:0.85rem;">
                    ${(q.options || []).map((opt, oIdx) => {
                let style = '';
                if (oIdx === correctAns) style = 'color:#2D9B6F; font-weight:700;';
                if (oIdx === studentAnswer && oIdx !== correctAns) style = 'color:#DC2626; font-weight:700;';
                if (oIdx === studentAnswer && oIdx === correctAns) style = 'color:#2D9B6F; font-weight:700;';
                return `<li style="${style}">${String.fromCharCode(65 + oIdx)}. ${opt || 'Option ' + (oIdx + 1)} ${oIdx === correctAns ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> (Correct)' : ''} ${oIdx === studentAnswer && oIdx !== correctAns ? ' (Your Answer)' : ''}</li>`;
            }).join('')}
                </ul>
                <p style="font-size:0.85rem; margin-top:0.5rem; margin-bottom:0;">
                    <strong>Student's Answer:</strong> ${studentAnswer !== undefined ? String.fromCharCode(65 + studentAnswer) : 'Not answered'}
                </p>
            </div>
            `;
        });
    } else {
        detailsHTML += `<p>${submission.answerText || 'No details available'}</p>`;
    }

    detailsHTML += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:700px;">
            <div class="modal-header" style="background:#7B1D3C; color:white;">
                <h3 style="color:white;">${submission.studentName}'s Submission</h3>
                <button class="modal-close" style="color:white;" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body" style="padding:1.5rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border);">
                    <div>
                        <strong>Exam:</strong> ${submission.examTitle || 'Unknown'}
                    </div>
                    <div>
                        <strong>Score:</strong> ${calculatedScore !== null ? calculatedScore + '%' : 'Pending'}
                    </div>
                </div>
                ${detailsHTML}
            </div>
            <div class="modal-footer" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button class="btn btn-primary" style="background:#2D9B6F;" onclick="saveAsResult('${submission.id}')">
                    <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save as Result
                </button>
                <button class="btn btn-${submission.showResultToStudent ? 'warning' : 'primary'}" onclick="toggleResultVisibility('${submission.id}')">
                    ${submission.showResultToStudent ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Hide Result' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>️️ Show Result'}
                </button>
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.toggleResultVisibility = function(submissionId) {
    const submissions = getSubmissions();
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx === -1) return;
    
    submissions[idx].showResultToStudent = !submissions[idx].showResultToStudent;
    saveSubmissions(submissions);
    
    UI.toast(submissions[idx].showResultToStudent ? 'Result will be visible to student!' : 'Result hidden from student', 'success');
    
    Router.go('teacher-results');
    showResultTab('submissions');
};

window.saveAsResult = function(submissionId) {
    const submissions = getSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        UI.toast('Submission not found!', 'error');
        return;
    }
    
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    const questions = exam?.questionsList || [];
    
    // Calculate score from answers if not already set
    let score = submission.score;
    if (score === null || score === undefined) {
        if (submission.answers && Array.isArray(submission.answers) && questions.length > 0) {
            let correctCount = 0;
            questions.forEach((q, idx) => {
                const studentAnswer = submission.answers[idx];
                const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
                if (studentAnswer !== undefined && studentAnswer === correctAns) {
                    correctCount++;
                }
            });
            score = Math.round((correctCount / questions.length) * 100);
            console.log('[saveAsResult] Calculated score:', score, 'correct:', correctCount, 'total:', questions.length);
        } else {
            score = 0;
        }
    }
    
    const result = {
        id: 'res' + Date.now(),
        studentId: submission.studentId,
        studentName: submission.studentName,
        examTitle: submission.examTitle,
        subject: exam?.subject || 'General',
        type: 'MCQ Exam',
        score: score,
        totalScore: 100,
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F',
        term: 'Second Term',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        comments: `MCQ Exam - ${score}%`
    };
    
    addResult(result);
    
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx !== -1) {
        submissions[idx].score = score;
        submissions[idx].showResultToStudent = true;
        saveSubmissions(submissions);
    }
    
    UI.toast(`Result saved! Score: ${score}%`, 'success');
    document.querySelector('.modal-overlay')?.remove();
};

window.editResult = function(resultId) {
    const results = getResults();
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    
    document.getElementById('result-student').value = result.studentId || '';
    document.getElementById('result-exam').value = result.examId || '';
    document.getElementById('result-subject').value = result.subject || '';
    document.getElementById('result-objective-score').value = result.objectiveScore ?? Math.round((result.score || 0) / 2);
    document.getElementById('result-theory-score').value = result.theoryScore ?? Math.round((result.score || 0) / 2);
    document.getElementById('result-total').value = result.totalScore || 100;
    document.getElementById('result-grade').value = result.grade || 'A';
    document.getElementById('result-comments').value = result.comments || '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    UI.toast('Result loaded for editing. Make changes and save.', 'info');
};

window.publishResult = function(resultId) {
    const results = getResults();
    const idx = results.findIndex(r => r.id === resultId);
    if (idx === -1) return;

    results[idx].status = 'published';
    saveResults(results);

    UI.toast('Result published!', 'success');
    Router.go('teacher-results');
};

window.deleteResult = function(resultId) {
    if (!confirm('Are you sure you want to delete this result?')) return;
    const results = getResults().filter(r => r.id !== resultId);
    saveResults(results);
    UI.toast('Result deleted successfully', 'success');
    Router.go('teacher-results');
};

window.loadStudentsByClass = function () {
    const className = document.getElementById('midterm-class').value;
    const studentSelect = document.getElementById('midterm-student');
    const students = getAppUsers().filter(u => u.role === 'student');
    const filteredStudents = filterStudentsByClass(students, className);
    studentSelect.innerHTML = '<option value="">Select Student</option>' +
        filteredStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
};

window.updateGradeOptions = function () {
    const objScore = parseInt(document.getElementById('result-objective-score').value) || 0;
    const theoryScore = parseInt(document.getElementById('result-theory-score').value) || 0;
    const total = parseInt(document.getElementById('result-total').value) || 100;
    const percentEl = document.getElementById('result-percent');
    const combined = objScore + theoryScore;
    if (combined === 0 && objScore === 0 && theoryScore === 0) { percentEl.textContent = '—'; return; }
    const percent = (combined / total) * 100;
    percentEl.textContent = Math.round(percent) + '%';
    let grade = 'F';
    if (percent >= 90) grade = 'A';
    else if (percent >= 80) grade = 'B';
    else if (percent >= 70) grade = 'C';
    else if (percent >= 50) grade = 'D';
    
    document.getElementById('result-grade').value = grade;
};

window.loadCompiledResults = function(studentId) {
    if (!studentId) return;
    
    const student = getAppUsers().find(u => u.id === studentId);
    const midtermData = getMidTermResults().filter(r => r.studentId === studentId);
    
    document.getElementById('compiled-student-name').textContent = student?.name || '';
    document.getElementById('compiled-sex').textContent = student?.sex || '';
    document.getElementById('compiled-admission').textContent = student?.studentId || '';
    
    const tbody = document.getElementById('compiled-midterm-body');
    if (!tbody) return;
    if (midtermData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="padding:2rem; text-align:center;">No results found for this student</td></tr>';
        return;
    }
    
    let total = 0;
    tbody.innerHTML = midtermData.map((r, idx) => {
        total += r.total || 0;
        return `
        <tr>
            <td style="padding:0.5rem; border:1px solid #ddd;">${idx + 1}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.subject}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.ca}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.midterm}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.total}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${((r.total || 0) * 2)}%</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.grade}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.remark}</td>
            <td style="padding:0.5rem; border:1px solid #ddd;">${r.gsNgs}</td>
        </tr>
    `}).join('');
    
    document.getElementById('compiled-midterm-total').textContent = total;
};

window.deleteMidTermResult = function(id) {
    if (!confirm('Delete this result?')) return;
    const results = getMidTermResults().filter(r => r.id !== id);
    saveMidTermResults(results);
    UI.toast('Result deleted', 'success');
    Router.go('teacher-results');
};

window.editMidtermResult = function(id) {
    const results = getMidTermResults();
    const result = results.find(r => r.id === id);
    if (!result) return;
    
    document.getElementById('midterm-class').value = result.class || '';
    loadStudentsByClass();
    setTimeout(() => {
        document.getElementById('midterm-student').value = result.studentId || '';
        document.getElementById('midterm-subject').value = result.subject || '';
        document.getElementById('midterm-ca').value = result.ca || '';
        document.getElementById('midterm-exam').value = result.midterm || '';
    }, 100);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    UI.toast('Result loaded for editing', 'info');
};

/* =============================================
   RESULTS PAGE
   ============================================= */
async function renderTeacherResults() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const academicInfo = getAcademicInfo();
    const results = getResults();
    const exams = getExams();
    // Ensure students are loaded — fetch from API if cache is empty
    let students = getAppUsers().filter(u => u.role === 'student');
    if (students.length === 0) {
        try {
            const res = await API.users.getUsers().catch(() => null);
            if (res?.data && Array.isArray(res.data)) {
                const normalized = res.data.map(normalizeUser);
                saveAppUsers(normalized);
                students = normalized.filter(u => u.role === 'student');
            }
        } catch (_) {}
    }
    const midtermResults = getMidTermResults();

    const draftResults = results.filter(r => r.status === 'draft');
    const publishedResults = results.filter(r => r.status === 'published');

    const midtermDrafts = midtermResults.filter(r => r.status === 'draft');
    const midtermSubmitted = midtermResults.filter(r => r.status === 'submitted');

    const isClassTeacher = user.isClassTeacher === true;
    const myClass = user.classTeacherOf || '';
    const mySubjects = Array.isArray(user.assignedSubjects) ? user.assignedSubjects : [];
    const myClasses = Array.isArray(user.assignedClasses) ? user.assignedClasses : [];

    const subjectOptionsMidterm = mySubjects.length > 0 ? mySubjects.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="">No subjects assigned</option>';
    const classOptionsMidterm = myClasses.length > 0 ? myClasses.map(c => `<option value="${c}">${c}</option>`).join('') : '<option value="">No classes assigned</option>';

    const resultRows = results.map(r => {
        const exam = exams.find(e => e.id === r.examId);
        const student = students.find(s => s.id === r.studentId);
        const isDraft = r.status === 'draft';
        return `
            <tr>
                <td>${student?.name || 'Unknown'}</td>
                <td>${exam?.title || 'Unknown Exam'}</td>
                <td>${r.subject || '-'}</td>
                <td><strong>${r.score}/${r.totalScore}</strong></td>
                <td>${r.grade}</td>
                <td>${r.date}</td>
                <td>
                    ${isDraft ? `<button class="btn btn-primary btn-sm" style="background:#2D9B6F; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="editResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
                    <button class="btn btn-primary btn-sm" style="background:#F59E0B; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="publishResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Publish</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="deleteResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                </td>
            </tr>
        `;
    }).join('');

    const midtermRows = midtermResults.map(r => {
        const student = students.find(s => s.id === r.studentId);
        return `
            <tr>
                <td>${student?.name || 'Unknown'}</td>
                <td>${student?.class || '-'}</td>
                <td>${r.subject}</td>
                <td>${r.ca || '-'}</td>
                <td>${r.midterm || '-'}</td>
                <td>${r.total}</td>
                <td>${r.grade}</td>
                <td>${r.remark}</td>
                <td>${r.gsNgs}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editMidtermResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteMidTermResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                </td>
            </tr>
        `;
    }).join('');

    const content = `
    <div class="page">
      <div class="hero-banner" style="padding: 3rem 2rem;">
        <div class="hero-eyebrow">Academic Session ${academicInfo.session} - ${academicInfo.term}</div>
        <h1 class="hero-title">Results Management</h1>
        <p class="hero-sub">Upload and manage student examination results. Save as draft to review before publishing.</p>
      </div>

      <div style="display:flex; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap;">
        <button class="btn btn-primary" style="background:#7B1D3C;" onclick="showResultTab('exam')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Exam Results</button>
        <button class="btn btn-primary" style="background:#1565C0;" onclick="showResultTab('midterm')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Mid-Term Results</button>
        <button class="btn btn-primary" style="background:#7B1D3C;" onclick="showResultTab('submissions')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> MCQ Submissions</button>
        <button class="btn btn-primary" style="background:#B45309;" onclick="showResultTab('theory')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Theory Submissions</button>
        ${isClassTeacher ? `<button class="btn btn-primary" style="background:#2E7D32;" onclick="showResultTab('compiled')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> Compiled Results</button>` : ''}
      </div>

      <div id="exam-results-section">
        <div class="section-card" style="margin-top:1.25rem; padding: 2rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
            <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
            <h3 style="font-size:1.1rem; font-weight:800;">Add New Result</h3>
          </div>
          <form id="result-form">
              <div class="form-row">
                  <div class="form-group">
                      <label class="form-label">Student</label>
                      <select id="result-student" class="form-input" style="padding-left:1rem;" required>
                          <option value="">Select Student</option>
                          ${students.map(s => `<option value="${s.id}">${s.name} (${s.studentId || s.email})</option>`).join('')}
                      </select>
                  </div>
                  <div class="form-group">
                      <label class="form-label">Exam/Assignment</label>
                      <select id="result-exam" class="form-input" style="padding-left:1rem;" required>
                          <option value="">Select Exam</option>
                          ${exams.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}
                      </select>
                  </div>
              </div>
              <div class="form-row">
                  <div class="form-group">
                      <label class="form-label">Subject</label>
                      <input type="text" id="result-subject" class="form-input" style="padding-left:1rem;" placeholder="e.g. Mathematics" required />
                  </div>
              </div>
               <div class="form-row">
                   <div class="form-group">
                       <label class="form-label">Objective Score</label>
                       <input type="number" id="result-objective-score" class="form-input" style="padding-left:1rem;" placeholder="e.g. 60" value="0" min="0" required oninput="updateGradeOptions()" />
                   </div>
                   <div class="form-group">
                       <label class="form-label">Theory Score</label>
                       <input type="number" id="result-theory-score" class="form-input" style="padding-left:1rem;" placeholder="e.g. 25" value="0" min="0" required oninput="updateGradeOptions()" />
                   </div>
                   <div class="form-group" style="max-width:100px;">
                       <label class="form-label">Total Score</label>
                       <input type="number" id="result-total" class="form-input" style="padding-left:1rem;" placeholder="e.g. 100" value="100" required oninput="updateGradeOptions()" />
                   </div>
                   <div class="form-group" style="max-width:90px;">
                       <label class="form-label">%</label>
                       <div id="result-percent" class="form-input" style="padding-left:1rem; display:flex; align-items:center; font-weight:800; font-size:1.2rem; color:var(--maroon); background:var(--bg-card2);">—</div>
                   </div>
                   <div class="form-group">
                       <label class="form-label">Grade</label>
                       <select id="result-grade" class="form-input" style="padding-left:1rem;" required>
                           <option value="A">A - Excellent</option>
                           <option value="B">B - Very Good</option>
                           <option value="C">C - Good</option>
                           <option value="D">D - Pass</option>
                           <option value="F">F - Fail</option>
                       </select>
                   </div>
               </div>
              <div class="form-group">
                  <label class="form-label">Comments (Optional)</label>
                  <textarea id="result-comments" class="form-input" style="padding-left:1rem; height:60px;" placeholder="Teacher's comments..."></textarea>
              </div>
               <div class="form-group" style="margin: 1rem 0; display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:#F3F4F6; border-radius:8px;">
                  <input type="checkbox" id="result-show-to-student" style="width:18px; height:18px; cursor:pointer;" checked />
                  <label for="result-show-to-student" style="font-weight:600; font-size:0.9rem; cursor:pointer;">Show result to student</label>
                  <span style="font-size:0.8rem; color:#6B7280;">(Uncheck to keep visible only to staff)</span>
               </div>
               <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:1rem;">
                  <button type="button" class="btn btn-ghost" style="padding: 0.6rem 1.5rem;" onclick="saveResultDraft()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save as Draft</button>
                  <button type="button" class="btn btn-primary" style="padding: 0.6rem 2rem; background:#7B1D3C;" onclick="publishNewResult()">Publish Result</button>
               </div>
          </form>
        </div>

        ${draftResults.length > 0 ? `
        <div class="section-card" style="margin-top:2rem; padding:0; border:2px dashed #F59E0B;">
          <div style="padding:1.5rem 2rem; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); background:#FFFBEB;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
              <h3 style="font-size:1.1rem; font-weight:800; color:#B45309;">Draft Results (${draftResults.length})</h3>
            </div>
          </div>
          <table class="teacher-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Obj</th>
                <th>Theory</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${draftResults.map(r => {
        const exam = exams.find(e => e.id === r.examId);
        const student = students.find(s => s.id === r.studentId);
        const objScore = r.objectiveScore ?? '—';
        const theoryScore = r.theoryScore ?? '—';
        return `
                  <tr>
                      <td>${student?.name || 'Unknown'}</td>
                      <td>${exam?.title || 'Unknown Exam'}</td>
                      <td>${r.subject || '-'}</td>
                      <td>${objScore}</td>
                      <td>${theoryScore}</td>
                      <td><strong>${r.score}/${r.totalScore}</strong></td>
                      <td>${r.grade}</td>
                      <td>${r.date}</td>
                      <td>
                          <button class="btn btn-primary btn-sm" style="background:#2D9B6F; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="editResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
                          <button class="btn btn-primary btn-sm" style="background:#F59E0B; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="publishResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Publish</button>
                          <button class="btn btn-${r.visibleToStudents !== false ? 'warning' : 'primary'} btn-sm" style="padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="toggleResultStudentVisibility('${r.id}')" title="${r.visibleToStudents !== false ? 'Visible to students - Click to hide' : 'Hidden from students - Click to show'}">${r.visibleToStudents !== false ? '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'}</button>
                          <button class="btn btn-ghost btn-sm" onclick="deleteResult('${r.id}'); Router.go('teacher-results');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                      </td>
                  </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="section-card" style="margin-top:2rem; padding:0;">
          <div style="padding:1.5rem 2rem; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.25rem; color:#2D9B6F;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>
              <h3 style="font-size:1.1rem; font-weight:800;">Published Results (${publishedResults.length})</h3>
            </div>
          </div>
           <table class="teacher-table">
             <thead>
               <tr>
                 <th>Student</th>
                 <th>Exam</th>
                 <th>Subject</th>
                 <th>Obj</th>
                 <th>Theory</th>
                 <th>Total</th>
                 <th>Grade</th>
                 <th>Date</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${publishedResults.length > 0 ? publishedResults.map(r => {
            const exam = exams.find(e => e.id === r.examId);
            const student = students.find(s => s.id === r.studentId);
            const objScore = r.objectiveScore ?? '—';
            const theoryScore = r.theoryScore ?? '—';
            return `
                  <tr>
                      <td>${student?.name || 'Unknown'}</td>
                      <td>${exam?.title || 'Unknown Exam'}</td>
                      <td>${r.subject || '-'}</td>
                      <td>${objScore}</td>
                      <td>${theoryScore}</td>
                      <td><strong>${r.score}/${r.totalScore}</strong></td>
                      <td>${r.grade}</td>
                      <td>${r.date}</td>
                      <td>
                          <button class="btn btn-${r.visibleToStudents !== false ? 'warning' : 'primary'} btn-sm" style="padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="toggleResultStudentVisibility('${r.id}')" title="${r.visibleToStudents !== false ? 'Visible to students - Click to hide' : 'Hidden from students - Click to show'}">${r.visibleToStudents !== false ? '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'}</button>
                          <button class="btn btn-ghost btn-sm" onclick="deleteResult('${r.id}'); Router.go('teacher-results');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                      </td>
                  </tr>
              `}).join('') : '<tr><td colspan="9" style="text-align:center;padding:2rem;">No published results yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div id="midterm-results-section" style="display:none;">
        <div class="section-card" style="margin-top:1.25rem; padding: 2rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
            <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
            <h3 style="font-size:1.1rem; font-weight:800;">Add Mid-Term Result</h3>
          </div>
          <form id="midterm-form">
              <div class="form-row">
                  <div class="form-group">
                      <label class="form-label">Student Class</label>
                      <select id="midterm-class" class="form-input" style="padding-left:1rem;" required onchange="loadStudentsByClass()"
                          <option value="">Select Class</option>
                          ${classOptionsMidterm}
                      </select>
                  </div>
                  <div class="form-group">
                      <label class="form-label">Student</label>
                      <select id="midterm-student" class="form-input" style="padding-left:1rem;" required>
                          <option value="">Select Student</option>
                      </select>
                  </div>
              </div>
              <div class="form-row">
                  <div class="form-group">
                      <label class="form-label">Subject</label>
                      <select id="midterm-subject" class="form-input" style="padding-left:1rem;" required>
                          <option value="">Select Subject</option>
                          ${subjectOptionsMidterm}
                      </select>
                  </div>
                  <div class="form-group">
                      <label class="form-label">C.A (20 Marks)</label>
                      <input type="number" id="midterm-ca" class="form-input" style="padding-left:1rem;" placeholder="0-20" max="20" required />
                  </div>
                  <div class="form-group">
                      <label class="form-label">Mid-Term (30 Marks)</label>
                      <input type="number" id="midterm-score" class="form-input" style="padding-left:1rem;" placeholder="0-30" max="30" required />
                  </div>
              </div>
              <div class="form-row">
                  <div class="form-group">
                      <label class="form-label">School Type</label>
                      <select id="midterm-school-type" class="form-input" style="padding-left:1rem;" required onchange="updateMidtermGradeOptions()">
                          <option value="">Select</option>
                          <option value="junior">Junior School (JSS3)</option>
                          <option value="senior">Senior School (SS2, SS3)</option>
                      </select>
                  </div>
                  <div class="form-group">
                      <label class="form-label">Grade</label>
                      <select id="midterm-grade" class="form-input" style="padding-left:1rem;" required>
                          <option value="">Select Grade</option>
                      </select>
                  </div>
                  <div class="form-group">
                      <label class="form-label">GS/NGS</label>
                      <select id="midterm-gsngs" class="form-input" style="padding-left:1rem;" required>
                          <option value="GS">GS</option>
                          <option value="NGS">NGS</option>
                      </select>
                  </div>
              </div>
              <input type="hidden" id="midterm-result-id" value="" />
              <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
                  <button type="button" class="btn btn-ghost" style="padding: 0.6rem 1.5rem;" onclick="saveMidtermDraft()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Draft</button>
                  ${!isClassTeacher ? `<button type="button" class="btn btn-primary" style="background:#1565C0; padding: 0.6rem 1.5rem;" onclick="sendToClassTeacher()"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Send to Class Teacher</button>` : ''}
                  <button type="submit" class="btn btn-primary" style="padding: 0.6rem 2rem; background:#7B1D3C;">Save & Publish</button>
              </div>
          </form>
        </div>

        ${midtermDrafts.length > 0 ? `
        <div class="section-card" style="margin-top:2rem; padding:0; border:2px dashed #F59E0B;">
          <div style="padding:1.5rem 2rem; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); background:#FFFBEB;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
              <h3 style="font-size:1.1rem; font-weight:800; color:#B45309;">Mid-Term Drafts (${midtermDrafts.length})</h3>
            </div>
          </div>
          <table class="teacher-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Subject</th>
                <th>C.A</th>
                <th>Mid-Term</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Remark</th>
                <th>GS/NGS</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${midtermDrafts.map(r => {
                const student = students.find(s => s.id === r.studentId);
                return `
                  <tr>
                      <td>${student?.name || 'Unknown'}</td>
                      <td>${r.class || '-'}</td>
                      <td>${r.subject}</td>
                      <td>${r.ca || '-'}</td>
                      <td>${r.midterm || '-'}</td>
                      <td>${r.total}</td>
                      <td>${r.grade}</td>
                      <td>${r.remark}</td>
                      <td>${r.gsNgs}</td>
                      <td>
                          <button class="btn btn-primary btn-sm" style="background:#1565C0; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="editMidtermResult('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
                          ${!isClassTeacher ? `<button class="btn btn-primary btn-sm" style="background:#F59E0B; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="sendToClassTeacherById('${r.id}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Send</button>` : ''}
                          <button class="btn btn-ghost btn-sm" onclick="deleteMidTermResult('${r.id}'); Router.go('teacher-results');"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️</button>
                      </td>
                  </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${midtermSubmitted.length > 0 && isClassTeacher ? `
        <div class="section-card" style="margin-top:2rem; padding:0; border:2px dashed #2E7D32;">
          <div style="padding:1.5rem 2rem; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); background:#E8F5E9;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
              <h3 style="font-size:1.1rem; font-weight:800; color:#2E7D32;">Received from Subject Teachers (${midtermSubmitted.length})</h3>
            </div>
          </div>
          <table class="teacher-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Subject</th>
                <th>C.A</th>
                <th>Mid-Term</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Remark</th>
                <th>GS/NGS</th>
              </tr>
            </thead>
            <tbody>
              ${midtermSubmitted.map(r => {
                    const student = students.find(s => s.id === r.studentId);
                    return `
                  <tr>
                      <td>${student?.name || 'Unknown'}</td>
                      <td>${r.class || '-'}</td>
                      <td>${r.subject}</td>
                      <td>${r.ca || '-'}</td>
                      <td>${r.midterm || '-'}</td>
                      <td>${r.total}</td>
                      <td>${r.grade}</td>
                      <td>${r.remark}</td>
                      <td>${r.gsNgs}</td>
                  </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>

      <div id="submissions-section" style="display:none;">
        <div class="section-card" style="margin-top:1.25rem; padding: 2rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
            <span style="font-size:1.25rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
            <h3 style="font-size:1.1rem; font-weight:800;">MCQ Exam Submissions</h3>
          </div>
          
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label">Select Exam</label>
            <select id="submissions-exam-select" class="form-input" style="padding-left:1rem;" onchange="loadExamSubmissions()">
              <option value="">All Exams</option>
              ${exams.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}
            </select>
          </div>

          <div id="submissions-list">
            <!-- Submissions loaded dynamically -->
          </div>
        </div>
      </div>

      <div id="theory-submissions-section" style="display:none;">
        <div class="section-card" style="margin-top:1.25rem; padding: 2rem;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem;">
            <span style="font-size:1.25rem; color:#B45309;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
            <h3 style="font-size:1.1rem; font-weight:800;">Theory Exam Submissions</h3>
          </div>
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label">Select Exam</label>
            <select id="theory-submissions-exam-select" class="form-input" style="padding-left:1rem;" onchange="loadTheorySubmissions()">
              <option value="">All Theory Exams</option>
              ${exams.filter(e => e.format === 'theory').map(e => `<option value="${e.id}">${e.title}</option>`).join('')}
            </select>
          </div>
          <div id="theory-submissions-list"></div>
        </div>
      </div>

      ${isClassTeacher ? `
      <div id="compiled-results-section" style="display:none;">
        <div class="section-card" style="margin-top:1.25rem;">
          <div style="padding:1.5rem; text-align:center; border-bottom:1px solid var(--border);">
            <h2 style="margin:0; color:var(--text);">YESHUA EDUCATIONAL PLATFORM</h2>
            <p style="margin:0.5rem 0 0; color:var(--text-muted);">Address: Your School Address Here | Contact: +234 XXX XXX XXXX</p>
          </div>
          <div style="padding:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
            <div>
              <p><strong>Student Name:</strong> <span id="compiled-student-name"></span></p>
              <p><strong>Class:</strong> ${myClass}</p>
              <p><strong>Sex:</strong> <span id="compiled-sex"></span></p>
            </div>
            <div>
              <p><strong>Term:</strong> Second Term</p>
              <p><strong>Session:</strong> 2024/2025</p>
              <p><strong>Admission No:</strong> <span id="compiled-admission"></span></p>
            </div>
          </div>

          <!-- Exam Results Section -->
          <div style="padding:1rem 1.5rem; background:#f8f4f4; border-bottom:2px solid #7B1D3C;">
            <h3 style="margin:0; font-size:1rem; color:#7B1D3C;">Exam Results</h3>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="background:#7B1D3C; color:white;">
                <th style="padding:0.75rem; border:1px solid #ddd;">S/N</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Subject</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Objective</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Theory</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Total(%)</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Grade</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Date</th>
              </tr>
            </thead>
            <tbody id="compiled-exam-body">
              <tr><td colspan="7" style="padding:2rem; text-align:center;">Select a student to view compiled results</td></tr>
            </tbody>
          </table>

          <!-- Mid-Term Test Results Section -->
          <div style="padding:1rem 1.5rem; background:#f0f4f8; border-bottom:2px solid #1565C0; margin-top:1rem;">
            <h3 style="margin:0; font-size:1rem; color:#1565C0;">Mid-Term Test Results</h3>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <thead>
              <tr style="background:#1565C0; color:white;">
                <th style="padding:0.75rem; border:1px solid #ddd;">S/N</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Subjects</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">C.A(20)</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Mid-Term(30)</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Total(50)</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Mid-Term Summary(100%)</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Grade</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">Remark</th>
                <th style="padding:0.75rem; border:1px solid #ddd;">GS/NGS</th>
              </tr>
            </thead>
            <tbody id="compiled-midterm-body">
              <tr><td colspan="9" style="padding:2rem; text-align:center;">Select a student to view compiled results</td></tr>
            </tbody>
          </table>
          <div style="padding:1.5rem; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>Exam Total:</strong> <span id="compiled-exam-total">0</span> &nbsp;|&nbsp; <strong>Mid-Term Total:</strong> <span id="compiled-midterm-total">0</span></div>
            <div style="text-align:right;">
              <p style="margin-bottom:3rem;">__________________________</p>
              <p>Principal's Signature</p>
            </div>
          </div>
        </div>
        <div class="section-card" style="margin-top:1.5rem; padding: 2rem;">
          <h3 style="margin-bottom:1rem;">Select Student to View Results</h3>
          <select id="compiled-student-select" class="form-input" style="padding-left:1rem;" onchange="loadCompiledResults(this.value)">
            <option value="">Select Student</option>
            ${filterStudentsByClass(students, myClass).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      ` : ''}
    </div>
    `;
    UI.buildPortal('teacher-results', content);

    // Load submissions after DOM is ready
    console.log('[Teacher] Setting up loadExamSubmissions timeout');
    setTimeout(() => {
        console.log('[Teacher] Timeout fired, calling loadExamSubmissions');
        if (typeof loadExamSubmissions === 'function') {
            loadExamSubmissions();
        } else {
            console.error('[Teacher] loadExamSubmissions function not found');
        }
    }, 500);

    // Event delegation for View button
    document.getElementById('submissions-list')?.addEventListener('click', function(e) {
        console.log('[Teacher] Click event on submissions-list');
        const btn = e.target.closest('.view-submission-btn');
        if (btn) {
            e.preventDefault();
            console.log('[Teacher] View button clicked, data-id:', btn.dataset.id);
            const id = btn.dataset.id;
            if (typeof window.viewSubmissionDetails === 'function') {
                window.viewSubmissionDetails(id);
            } else {
                console.error('[Teacher] viewSubmissionDetails not found on window');
            }
        }
    });

    window.showResultTab = function (tab) {
        document.getElementById('exam-results-section').style.display = tab === 'exam' ? 'block' : 'none';
        document.getElementById('midterm-results-section').style.display = tab === 'midterm' ? 'block' : 'none';
        document.getElementById('submissions-section').style.display = tab === 'submissions' ? 'block' : 'none';
        document.getElementById('theory-submissions-section').style.display = tab === 'theory' ? 'block' : 'none';
        if (document.getElementById('compiled-results-section')) {
            document.getElementById('compiled-results-section').style.display = tab === 'compiled' ? 'block' : 'none';
        }
        if (tab === 'theory') loadTheorySubmissions();
    };

    window.loadStudentsByClass = function () {
        const className = document.getElementById('midterm-class').value;
        const studentSelect = document.getElementById('midterm-student');
        const filteredStudents = filterStudentsByClass(students, className);
        studentSelect.innerHTML = '<option value="">Select Student</option>' +
            filteredStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    };

    window.updateMidtermGradeOptions = function () {
        const schoolType = document.getElementById('midterm-school-type').value;
        const gradeSelect = document.getElementById('midterm-grade');
        let options = '<option value="">Select Grade</option>';

        if (schoolType === 'junior') {
            options += '<option value="A">A - Distinction</option>';
            options += '<option value="C">C - Credit</option>';
            options += '<option value="P">P - Pass</option>';
            options += '<option value="F">F - Fail</option>';
        } else if (schoolType === 'senior') {
            options += '<option value="A">A</option>';
            options += '<option value="B">B</option>';
            options += '<option value="C4">C4</option>';
            options += '<option value="C5">C5</option>';
            options += '<option value="C6">C6</option>';
            options += '<option value="D7">D7</option>';
            options += '<option value="E8">E8</option>';
            options += '<option value="F9">F9</option>';
        }
        gradeSelect.innerHTML = options;
    };

    window.calculateMidtermTotal = function () {
        const ca = parseInt(document.getElementById('midterm-ca').value) || 0;
        const midterm = parseInt(document.getElementById('midterm-score').value) || 0;
        return ca + midterm;
    };

    window.getMidtermGrade = function (total, schoolType) {
        if (schoolType === 'junior') {
            if (total >= 15) return { grade: 'A', remark: 'DISTINCTION' };
            if (total >= 10) return { grade: 'C', remark: 'CREDIT' };
            if (total >= 5) return { grade: 'P', remark: 'PASS' };
            return { grade: 'F', remark: 'FAIL' };
        } else {
            if (total >= 45) return { grade: 'A', remark: 'DISTINCTION' };
            if (total >= 40) return { grade: 'B', remark: 'DISTINCTION' };
            if (total >= 35) return { grade: 'C4', remark: 'CREDIT' };
            if (total >= 30) return { grade: 'C5', remark: 'CREDIT' };
            if (total >= 25) return { grade: 'C6', remark: 'CREDIT' };
            if (total >= 20) return { grade: 'D7', remark: 'PASS' };
            if (total >= 15) return { grade: 'E8', remark: 'PASS' };
            return { grade: 'F9', remark: 'FAIL' };
        }
    };

    window.saveMidtermDraft = function () {
        const studentId = document.getElementById('midterm-student').value;
        const student = students.find(s => s.id === studentId);

        const ca = parseInt(document.getElementById('midterm-ca').value) || 0;
        const midterm = parseInt(document.getElementById('midterm-score').value) || 0;
        const total = ca + midterm;
        const schoolType = document.getElementById('midterm-school-type').value;
        const gradeInfo = getMidtermGrade(total, schoolType);

        const result = {
            id: document.getElementById('midterm-result-id').value || 'mr' + Date.now(),
            studentId: studentId,
            studentName: student?.name || '',
            class: document.getElementById('midterm-class').value,
            subject: document.getElementById('midterm-subject').value,
            ca: ca,
            midterm: midterm,
            total: total,
            grade: document.getElementById('midterm-grade').value || gradeInfo.grade,
            remark: document.getElementById('midterm-remark')?.value || gradeInfo.remark,
            gsNgs: document.getElementById('midterm-gsngs').value,
            status: 'draft',
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, '')
        };

        if (!result.studentId || !result.subject) {
            UI.toast('Please fill in all required fields', 'error');
            return;
        }

        if (document.getElementById('midterm-result-id').value) {
            updateMidTermResult(result);
            UI.toast('Mid-term result updated!', 'success');
        } else {
            addMidTermResult(result);
            UI.toast('Mid-term result saved as draft!', 'success');
        }
        Router.go('teacher-results');
    };

    window.sendToClassTeacher = function () {
        const studentId = document.getElementById('midterm-student').value;
        const student = students.find(s => s.id === studentId);

        const ca = parseInt(document.getElementById('midterm-ca').value) || 0;
        const midterm = parseInt(document.getElementById('midterm-score').value) || 0;
        const total = ca + midterm;
        const schoolType = document.getElementById('midterm-school-type').value;
        const gradeInfo = getMidtermGrade(total, schoolType);

        const result = {
            id: 'mr' + Date.now(),
            studentId: studentId,
            studentName: student?.name || '',
            class: document.getElementById('midterm-class').value,
            subject: document.getElementById('midterm-subject').value,
            ca: ca,
            midterm: midterm,
            total: total,
            grade: document.getElementById('midterm-grade').value || gradeInfo.grade,
            remark: gradeInfo.remark,
            gsNgs: document.getElementById('midterm-gsngs').value,
            status: 'submitted',
            submittedBy: user.name,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, '')
        };

        addMidTermResult(result);
        UI.toast('Result sent to Class Teacher!', 'success');
        Router.go('teacher-results');
    };

    window.sendToClassTeacherById = function (resultId) {
        const allResults = getMidTermResults();
        const resultIndex = allResults.findIndex(r => r.id === resultId);
        if (resultIndex !== -1) {
            allResults[resultIndex].status = 'submitted';
            allResults[resultIndex].submittedBy = user.name;
            saveMidTermResults(allResults);
            UI.toast('Result sent to Class Teacher!', 'success');
            Router.go('teacher-results');
        }
    };

    window.editMidtermResult = function (resultId) {
        const result = midtermResults.find(r => r.id === resultId);
        if (!result) return;

        document.getElementById('midterm-class').value = result.class;
        loadStudentsByClass();
        document.getElementById('midterm-student').value = result.studentId;
        document.getElementById('midterm-subject').value = result.subject;
        document.getElementById('midterm-ca').value = result.ca;
        document.getElementById('midterm-score').value = result.midterm;
        document.getElementById('midterm-gsngs').value = result.gsNgs;
        document.getElementById('midterm-result-id').value = result.id;

        const schoolType = (result.class && result.class.startsWith('JSS')) ? 'junior' : 'senior';
        document.getElementById('midterm-school-type').value = schoolType;
        updateMidtermGradeOptions();
        document.getElementById('midterm-grade').value = result.grade;

        showResultTab('midterm');
        UI.toast('Editing mid-term result...', 'info');
    };

    window.loadCompiledResults = function (studentId) {
        const emptyExam = '<tr><td colspan="7" style="padding:2rem; text-align:center;">Select a student to view compiled results</td></tr>';
        const emptyMidterm = '<tr><td colspan="9" style="padding:2rem; text-align:center;">Select a student to view compiled results</td></tr>';
        if (!studentId) {
            document.getElementById('compiled-exam-body').innerHTML = emptyExam;
            document.getElementById('compiled-midterm-body').innerHTML = emptyMidterm;
            return;
        }

        const student = students.find(s => s.id === studentId);

        document.getElementById('compiled-student-name').textContent = student?.name || '';
        document.getElementById('compiled-sex').textContent = student?.sex || '';
        document.getElementById('compiled-admission').textContent = student?.admissionNo || student?.studentId || '';

        // --- Exam Results ---
        const examResults = getResults().filter(r => r.studentId === studentId && r.status === 'published');
        let examRows = '';
        let examTotal = 0;
        examResults.forEach((r, idx) => {
            const objScore = r.objectiveScore != null ? r.objectiveScore : '—';
            const theoryScore = r.theoryScore != null ? r.theoryScore : '—';
            const pct = r.totalScore ? Math.round((r.score / r.totalScore) * 100) + '%' : '—';
            examTotal += r.score;
            examRows += `
                <tr>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${idx + 1}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.subject}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${objScore}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${theoryScore}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.score}/${r.totalScore} (${pct})</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.grade}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.date}</td>
                </tr>
            `;
        });
        document.getElementById('compiled-exam-body').innerHTML = examRows || '<tr><td colspan="7" style="padding:2rem; text-align:center;">No exam results found for this student</td></tr>';
        document.getElementById('compiled-exam-total').textContent = examTotal;

        // --- Mid-Term Test Results ---
        const midtermRows = midtermResults.filter(r => r.studentId === studentId && r.status === 'submitted');
        let mRows = '';
        let midtermTotal = 0;
        midtermRows.forEach((r, idx) => {
            midtermTotal += r.total;
            mRows += `
                <tr>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${idx + 1}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.subject}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.ca}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.midterm}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.total}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${Math.round((r.total / 50) * 100)}%</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.grade}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.remark}</td>
                    <td style="padding:0.5rem; border:1px solid #ddd;">${r.gsNgs}</td>
                </tr>
            `;
        });
        document.getElementById('compiled-midterm-body').innerHTML = mRows || '<tr><td colspan="9" style="padding:2rem; text-align:center;">No mid-term results found for this student</td></tr>';
        document.getElementById('compiled-midterm-total').textContent = midtermTotal;
    };

    window.saveResultDraft = function () {
        const examId = document.getElementById('result-exam').value;
        const exam = exams.find(e => e.id === examId);

        const studentId = document.getElementById('result-student').value;
        const subject = document.getElementById('result-subject').value;

        if (!studentId || !examId || !subject) {
            UI.toast('Please fill in all required fields (Student, Exam, Subject)', 'error');
            return;
        }

        const objectiveScore = parseInt(document.getElementById('result-objective-score').value) || 0;
        const theoryScore = parseInt(document.getElementById('result-theory-score').value) || 0;
        const score = objectiveScore + theoryScore;

        if (score === 0) {
            UI.toast('Please enter at least one score (Objective or Theory)', 'error');
            return;
        }

        const visibleToStudents = document.getElementById('result-show-to-student')?.checked ?? true;

        const result = {
            id: 'r' + Date.now(),
            studentId,
            examId,
            examTitle: exam?.title || '',
            subject,
            objectiveScore,
            theoryScore,
            score,
            totalScore: parseInt(document.getElementById('result-total').value) || 100,
            grade: document.getElementById('result-grade').value,
            comments: document.getElementById('result-comments').value,
            remarks: document.getElementById('result-comments').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            status: 'draft',
            visibleToStudents
        };

        // Save locally immediately
        const allResults = getResults();
        allResults.unshift(result);
        saveResults(allResults);

        // Try API in background
        addResult(result).catch(() => {});

        UI.toast('Result saved as draft!', 'success');
        Router.go('teacher-results');
    };

    window.publishNewResult = function () {
        const examId = document.getElementById('result-exam').value;
        const exam = exams.find(e => e.id === examId);

        const studentId = document.getElementById('result-student').value;
        const subject = document.getElementById('result-subject').value;

        if (!studentId || !examId || !subject) {
            UI.toast('Please fill in all required fields (Student, Exam, Subject)', 'error');
            return;
        }

        const objectiveScore = parseInt(document.getElementById('result-objective-score').value) || 0;
        const theoryScore = parseInt(document.getElementById('result-theory-score').value) || 0;
        const score = objectiveScore + theoryScore;

        if (score === 0) {
            UI.toast('Please enter at least one score (Objective or Theory)', 'error');
            return;
        }

        const visibleToStudents = document.getElementById('result-show-to-student')?.checked ?? true;

        const result = {
            id: 'r' + Date.now(),
            studentId,
            examId,
            examTitle: exam?.title || '',
            subject,
            objectiveScore,
            theoryScore,
            score,
            totalScore: parseInt(document.getElementById('result-total').value) || 100,
            grade: document.getElementById('result-grade').value,
            comments: document.getElementById('result-comments').value,
            remarks: document.getElementById('result-comments').value,
            date: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: '2-digit' }).replace(/,/g, ''),
            status: 'published',
            visibleToStudents
        };

        // Save locally immediately
        const allResults = getResults();
        allResults.unshift(result);
        saveResults(allResults);

        // Try API in background
        addResult(result).catch(() => {});

        UI.toast('Result published successfully!', 'success');
        Router.go('teacher-results');
    };

    window.editResult = function (resultId) {
        const result = results.find(r => r.id === resultId);
        if (!result) return;

        document.getElementById('result-student').value = result.studentId;
        document.getElementById('result-exam').value = result.examId;
        document.getElementById('result-subject').value = result.subject;
        document.getElementById('result-objective-score').value = result.objectiveScore ?? Math.round((result.score || 0) / 2);
        document.getElementById('result-theory-score').value = result.theoryScore ?? Math.round((result.score || 0) / 2);
        document.getElementById('result-total').value = result.totalScore;
        document.getElementById('result-grade').value = result.grade;
        document.getElementById('result-comments').value = result.comments || '';
        const cb = document.getElementById('result-show-to-student');
        if (cb) cb.checked = result.visibleToStudents !== false;

        window.scrollTo(0, 0);
        UI.toast('Editing result...', 'info');
    };

    window.publishResult = function (resultId) {
        const allResults = getResults();
        const resultIndex = allResults.findIndex(r => r.id === resultId);
        if (resultIndex !== -1) {
            allResults[resultIndex].status = 'published';
            allResults[resultIndex].visibleToStudents = true;
            saveResults(allResults);
            UI.toast('Result published successfully!', 'success');
            Router.go('teacher-results');
        }
    };

    window.toggleResultStudentVisibility = function (resultId) {
        const allResults = getResults();
        const idx = allResults.findIndex(r => r.id === resultId);
        if (idx !== -1) {
            allResults[idx].visibleToStudents = allResults[idx].visibleToStudents === false;
            saveResults(allResults);
            UI.toast(allResults[idx].visibleToStudents ? 'Result will be visible to students!' : 'Result hidden from students', 'success');
            Router.go('teacher-results');
        }
    };

    document.getElementById('midterm-form').addEventListener('submit', e => {
        e.preventDefault();
        saveMidtermDraft();
    });
}

function renderSubmissionsList(examId = '') {
    const submissions = examId ? getExamSubmissions(examId) : getSubmissions();
    const exams = getExams();
    const users = getAppUsers();
    const students = users.filter(u => u.role === 'student');

    if (submissions.length === 0) {
        return `<div class="empty-state" style="padding:3rem;"><div class="empty-state-icon"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div><h4>No Submissions Yet</h4><p>Students haven't submitted any exams yet. Make sure you've created and published exams for students to take.</p></div>`;
    }

    return `
    <table class="teacher-table">
      <thead>
        <tr>
          <th>Student</th>
          <th>Class</th>
          <th>Exam</th>
          <th>Score</th>
          <th>Date Submitted</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${submissions.map(s => {
        const exam = exams.find(e => e.id === s.examId);
        const questions = exam?.questionsList || [];
        const student = students.find(u => u.id === s.studentId || u.studentId === s.studentId);
        const studentName = s.studentName || student?.name || s.studentId || 'Unknown';
        const studentClass = s.studentClass || student?.class || 'N/A';
        
        // Calculate score if not already set
        let scorePercent = 'Pending';
        if (s.score !== null) {
            scorePercent = s.score + '%';
        } else if (s.answers && Array.isArray(s.answers) && questions.length > 0) {
            let correctCount = 0;
            questions.forEach((q, idx) => {
                const studentAnswer = s.answers[idx];
                // Handle correctIndex, correct, or correctAnswer field names
                const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
                if (studentAnswer !== undefined && studentAnswer === correctAns) {
                    correctCount++;
                }
            });
            scorePercent = Math.round((correctCount / questions.length) * 100) + '%';
        }
        
        return `
            <tr>
              <td>${studentName}</td>
              <td>${studentClass}</td>
              <td>${s.examTitle || exam?.title || 'Unknown'}</td>
              <td><strong>${scorePercent}</strong></td>
              <td>${new Date(s.submittedAt).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-ghost btn-sm view-submission-btn" data-id="${s.id}"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>️️ View</button>
              </td>
            </tr>
            `;
    }).join('')}
      </tbody>
    </table>
    `;
}

window.loadExamSubmissions = function () {
    console.log('[TEACHER] loadExamSubmissions called (2nd definition)');
    const examId = document.getElementById('submissions-exam-select')?.value;
    console.log('[TEACHER] Selected examId:', examId);
    const submissionsListEl = document.getElementById('submissions-list');
    if (!submissionsListEl) {
        console.warn('[TEACHER] submissions-list element not found');
        return;
    }

    submissionsListEl.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="loading-spinner"></div><p>Loading...</p></div>';

    Promise.all([
        API.submissions.getAll(),
        API.users.getUsers(),
        getExams().length === 0 ? API.teacher.getExams().catch(() => ({ data: [] })) : Promise.resolve({ data: getExams() })
    ]).then(([submissionsResponse, usersResponse, examsResponse]) => {
        let submissions = submissionsResponse?.data || [];
        const allUsers = usersResponse?.data || [];
        const students = allUsers.filter(u => u.role === 'student');
        let exams = (examsResponse?.data || []).map(normalizeExam);
        if (exams.length === 0) exams = getExams();
        if (exams.length > 0 && getExams().length === 0) writeJson(DATA_KEYS.exams, exams);
        console.log('[TEACHER] Submissions from API:', submissions.length, 'Users:', allUsers.length, 'Students:', students.length);
        
        console.log('[Teacher 2nd loadExamSubmissions] Exams from getExams():', exams.length);
        console.log('[Teacher 2nd loadExamSubmissions] First exam sample:', exams[0]);
        console.log('[Teacher 2nd loadExamSubmissions] First exam questionsList:', exams[0]?.questionsList);

        submissions = submissions.map(s => {
            const student = students.find(u => u.id === s.studentId || u.studentId === s.studentId || u.id === `u${s.studentId}` || u.studentId === `u${s.studentId}`);
            return {
                ...s,
                studentName: student?.name || s.studentName || s.studentId || 'Unknown',
                studentClass: student?.class || s.studentClass || '-'
            };
        });

        // Persist enriched submissions to localStorage so viewSubmissionDetails uses correct names
        saveSubmissions(submissions);

        const filtered = examId ? submissions.filter(s => s.examId === examId) : submissions;

        if (filtered.length === 0) {
            submissionsListEl.innerHTML = `<div class="empty-state" style="padding:3rem;"><h4>No Submissions</h4><p>Total: ${submissions.length}</p></div>`;
        } else {
            submissionsListEl.innerHTML = `<table class="teacher-table"><thead><tr><th>Student</th><th>Class</th><th>Exam</th><th>Score</th><th>Date</th><th>Actions</th></tr></thead><tbody>${filtered.map(s => {
                const exam = exams.find(e => e.id === s.examId);
                const questions = exam?.questionsList || [];
                
                let scorePercent = 'Pending';
                
                let answersArray = null;
                if (s.answers) {
                    if (Array.isArray(s.answers)) {
                        answersArray = s.answers;
                    } else if (typeof s.answers === 'object' && s.answers.selectedAnswers) {
                        const selectedAnswers = s.answers.selectedAnswers;
                        const keys = Object.keys(selectedAnswers);
                        answersArray = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selectedAnswers[k]));
                    } else if (typeof s.answers === 'object') {
                        const keys = Object.keys(s.answers);
                        const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
                        if (isNumeric) {
                            answersArray = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(s.answers[k]));
                        }
                    }
                }
                
                const shouldRecalculate = (s.score === null || s.score === 0) && answersArray && answersArray.length > 0 && questions.length > 0;
                
                if (!shouldRecalculate && s.score !== null) {
                    scorePercent = s.score + '%';
                } else if (shouldRecalculate) {
                    let correctCount = 0;
                    questions.forEach((q, idx) => {
                        const studentAnswer = answersArray[idx];
                        const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
                        if (studentAnswer !== undefined && studentAnswer === correctAns) {
                            correctCount++;
                        }
                    });
                    scorePercent = Math.round((correctCount / questions.length) * 100) + '%';
                }
                
                return `<tr><td>${s.studentName}</td><td>${s.studentClass}</td><td>${s.examTitle || exam?.title || 'Unknown'}</td><td><strong>${scorePercent}</strong></td><td>${new Date(s.submittedAt).toLocaleDateString()}</td><td><button class="btn btn-ghost btn-sm view-submission-btn" data-id="${s.id}">View</button></td></tr>`;
            }).join('')}</tbody></table>`;
        }
    }).catch(err => {
        submissionsListEl.innerHTML = '<div style="color:red; padding:2rem;">Failed: ' + err.message + '</div>';
    });
};

window.loadTheorySubmissions = function () {
    const examId = document.getElementById('theory-submissions-exam-select')?.value;
    const listEl = document.getElementById('theory-submissions-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="loading-spinner"></div><p>Loading...</p></div>';
    Promise.all([
        API.submissions.getAll(), API.users.getUsers(),
        getExams().length === 0 ? API.teacher.getExams().catch(() => ({ data: [] })) : Promise.resolve({ data: getExams() })
    ]).then(([submissionsResponse, usersResponse, examsResponse]) => {
        let submissions = submissionsResponse?.data || [];
        const students = (usersResponse?.data || []).filter(u => u.role === 'student');
        let exams = (examsResponse?.data || []).map(normalizeExam);
        if (exams.length === 0) exams = getExams();
        if (exams.length > 0 && getExams().length === 0) writeJson(DATA_KEYS.exams, exams);
        submissions = submissions.map(s => {
            const student = students.find(u => u.id === s.studentId || u.studentId === s.studentId);
            return { ...s, studentName: student?.name || s.studentName || s.studentId || 'Unknown', studentClass: student?.class || s.studentClass || '-' };
        });
        const theoryExamIds = new Set(exams.filter(e => e.format === 'theory').map(e => e.id));
        let theorySubs = submissions.filter(s => theoryExamIds.has(s.examId));
        if (examId) theorySubs = theorySubs.filter(s => s.examId === examId);
        saveSubmissions(submissions);
        if (theorySubs.length === 0) { listEl.innerHTML = '<div class="empty-state" style="padding:3rem;"><h4>No Theory Submissions</h4><p>No pending theory exam submissions found.</p></div>'; return; }
        listEl.innerHTML = '<table class="teacher-table"><thead><tr><th>Student</th><th>Class</th><th>Exam</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>' + theorySubs.map(s => {
            const exam = exams.find(e => e.id === s.examId);
            const isGraded = s.score !== null && s.score !== undefined;
            return '<tr><td>' + s.studentName + '</td><td>' + s.studentClass + '</td><td>' + (exam?.title || s.examTitle || 'Unknown') + '</td><td><span style="padding:0.25rem 0.75rem; border-radius:20px; font-size:0.75rem; font-weight:600; background:' + (isGraded ? 'var(--success-bg)' : 'var(--warning-bg)') + '; color:' + (isGraded ? 'var(--success)' : 'var(--warning)') + ';">' + (isGraded ? 'Graded (' + s.score + '%)' : 'Pending') + '</span></td><td>' + new Date(s.submittedAt).toLocaleDateString() + '</td><td><button class="btn btn-primary btn-sm" style="background:#B45309; padding:0.3rem 0.75rem; font-size:0.75rem;" onclick="gradeTheorySubmission(\'' + s.id + '\')">Grade</button></td></tr>';
        }).join('') + '</tbody></table>';
    }).catch(err => { listEl.innerHTML = '<div style="color:red; padding:2rem;">Failed: ' + err.message + '</div>'; });
};

window.gradeTheorySubmission = function (submissionId) {
    const submission = getSubmissions().find(s => s.id === submissionId);
    if (!submission) { UI.toast('Submission not found', 'error'); return; }
    const exam = getExams().find(e => e.id === submission.examId);
    if (!exam?.questionsList || exam.questionsList.length === 0) { UI.toast('No questions found for this exam.', 'error'); return; }
    showSubmissionModal(submission);
};

window.viewSubmissionDetails = function (submissionId) {
    // First try localStorage, then fallback to API
    let submission = getSubmissions().find(s => s.id === submissionId);

    // Helper to normalize submission data
    function normalizeSubmission(sub) {
        const users = getAppUsers();
        const exams = getExams();
        
        console.log('[viewSubmissionDetails] normalize - studentId:', sub.studentId);
        console.log('[viewSubmissionDetails] Users count:', users.length);
        console.log('[viewSubmissionDetails] Users sample:', users.slice(0, 3));
        
        // Find student by multiple fields - handle different id formats
        const student = users.find(u => 
            u.id === sub.studentId || 
            u.studentId === sub.studentId || 
            u.id === `u${sub.studentId}` ||
            u.studentId === `u${sub.studentId}`
        );
        console.log('[viewSubmissionDetails] Found student:', student);
        
        sub.studentName = sub.studentName || student?.name || sub.studentId || 'Unknown';
        sub.studentClass = sub.studentClass || student?.class || 'N/A';
        
        // Find exam
        const exam = exams.find(e => e.id === sub.examId);
        sub.examTitle = sub.examTitle || exam?.title || 'Unknown';
        
        // Normalize answers - extract from selectedAnswers or convert { "0": 1, "1": 0 } to [1, 0]
        if (sub.answers && typeof sub.answers === 'object' && !Array.isArray(sub.answers)) {
            // Check if answers has responses property (theory exam format: { type: 'theory', responses: [...] })
            if (sub.answers.responses && Array.isArray(sub.answers.responses)) {
                console.log('[viewSubmissionDetails] Extracting from responses (theory format)');
                sub.answers = sub.answers.responses;
            } else if (sub.answers.selectedAnswers && typeof sub.answers.selectedAnswers === 'object') {
                console.log('[viewSubmissionDetails] Extracting from selectedAnswers');
                const selectedAnswers = sub.answers.selectedAnswers;
                const keys = Object.keys(selectedAnswers);
                sub.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selectedAnswers[k]));
            } else {
                // Try direct numeric keys format
                const keys = Object.keys(sub.answers);
                const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
                if (isNumeric) {
                    console.log('[viewSubmissionDetails] Normalizing from direct numeric keys');
                    sub.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(sub.answers[k]));
                }
            }
        }
        console.log('[viewSubmissionDetails] Final answers:', sub.answers);
        
        return sub;
    }

    if (!submission) {
        API.submissions.getById(submissionId).then(response => {
            if (response?.data) {
                showSubmissionModal(normalizeSubmission(response.data));
            }
        }).catch(() => {
            UI.toast('Submission not found', 'error');
        });
        return;
    }

    // Enrich with student info - robust lookup with multiple formats
    const users = getAppUsers();
    const students = users.filter(u => u.role === 'student');
    const student = students.find(u => 
        u.id === submission.studentId || 
        u.studentId === submission.studentId || 
        u.id === `u${submission.studentId}` ||
        u.studentId === `u${submission.studentId}`
    );
    if (student) {
        submission.studentName = student.name;
        submission.studentClass = student.class;
    } else {
        submission.studentName = submission.studentName || submission.studentId || 'Unknown';
        submission.studentClass = submission.studentClass || 'N/A';
    }
    
    // Normalize answers for local submissions too — handle selectedAnswers, numeric keys, and arrays
    if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
        // Check for selectedAnswers format { selectedAnswers: {0: 1, 1: 0}, ... }
        if (submission.answers.selectedAnswers && typeof submission.answers.selectedAnswers === 'object') {
            const selected = submission.answers.selectedAnswers;
            const keys = Object.keys(selected);
            submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selected[k]));
        } else {
            // Try direct numeric keys format { "0": 1, "1": 0 }
            const keys = Object.keys(submission.answers);
            const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
            if (isNumeric) {
                submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(submission.answers[k]));
            }
        }
    }

    showSubmissionModal(submission);
};

function showSubmissionModal(submission) {
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    const questions = exam?.questionsList || [];
    const isTheory = exam?.format === 'theory';

    // Safety net: resolve student name if it's still a raw ID like "u001"
    if (!submission.studentName || /^u?\d+$/.test(submission.studentName)) {
        const users = getAppUsers();
        const student = users.find(u => 
            u.id === submission.studentId || 
            u.studentId === submission.studentId || 
            u.id === `u${submission.studentId}` ||
            u.studentId === `u${submission.studentId}`
        );
        if (student) {
            submission.studentName = student.name;
            submission.studentClass = student.class || submission.studentClass;
        } else {
            submission.studentName = submission.studentName || submission.studentId || 'Unknown';
        }
    }

    // Normalize answers if still in object format (selectedAnswers or numeric keys) from API
    if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
        if (submission.answers.selectedAnswers && typeof submission.answers.selectedAnswers === 'object') {
            const selected = submission.answers.selectedAnswers;
            const keys = Object.keys(selected);
            submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(selected[k]));
        } else {
            const keys = Object.keys(submission.answers);
            const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
            if (isNumeric) {
                submission.answers = keys.sort((a, b) => Number(a) - Number(b)).map(k => Number(submission.answers[k]));
            }
        }
    }

    // Normalize theory exam answers
    if (isTheory && submission.answers && typeof submission.answers === 'object') {
        // Theory answers are stored as { type: 'theory', responses: [{questionId, answer}, ...] }
        if (submission.answers.responses && Array.isArray(submission.answers.responses)) {
            submission.answers = submission.answers.responses;
        } else if (submission.answers.answers && Array.isArray(submission.answers.answers)) {
            submission.answers = submission.answers.answers;
        }
        if (!Array.isArray(submission.answers)) {
            submission.answers = [];
        }
    }

    // Calculate score for MCQ exams
    let calculatedScore = submission.score;
    if (!isTheory && questions.length > 0 && submission.answers && Array.isArray(submission.answers)) {
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const studentAnswer = submission.answers[idx];
            const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
            if (studentAnswer !== undefined && studentAnswer === correctAns) {
                correctCount++;
            }
        });
        const answeredCount = submission.answers.filter(a => a !== undefined).length;
        calculatedScore = answeredCount > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        console.log('[showSubmissionModal 2nd] Calculated score:', calculatedScore, 'correct:', correctCount, 'total:', questions.length);
    }

    let detailsHTML = '<div style="max-height:500px; overflow-y:auto;">';

    if (isTheory && questions.length > 0 && submission.answers) {
        // Theory exam grading interface
        let totalMarks = 0;
        let awardedMarks = 0;
        
        questions.forEach((q, idx) => {
            const studentAnswer = submission.answers.find(a => a.questionId === q.id);
            const answerText = studentAnswer?.answer || 'No answer provided';
            const marksAwarded = studentAnswer?.marksAwarded ?? 0;
            totalMarks += q.marks || 5;
            awardedMarks += marksAwarded;
            
            detailsHTML += `
            <div style="background:var(--bg-card); padding:1.25rem; border-radius:12px; margin-bottom:1rem; border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border);">
                    <p style="font-weight:700; margin:0;"><span style="color:#7B1D3C; background:#FEF2F2; padding:0.25rem 0.75rem; border-radius:6px; margin-right:0.5rem;">Q${idx + 1}</span> ${q.text}</p>
                    <span style="font-size:0.875rem; color:var(--text-muted);">Max: ${q.marks || 5} marks</span>
                </div>
                
                ${q.image ? `<img src="${q.image}" style="max-width:400px; max-height:300px; border-radius:8px; margin-bottom:1rem; display:block;" />` : ''}
                
                <div style="background:var(--bg-card2); padding:1rem; border-radius:8px; margin-bottom:1rem;">
                    <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:0.5rem;">Student's Answer:</p>
                    <p style="font-size:0.95rem; line-height:1.6; white-space:pre-wrap;">${answerText}</p>
                </div>
                
                <div style="margin-top:1rem; padding:1.25rem; background:#F8FAFC; border-radius:12px; border:2px solid #E2E8F0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
                        <span style="font-weight:700; font-size:0.9rem; color:var(--text-primary); display:flex; align-items:center; gap:0.5rem;">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                            Award Marks
                        </span>
                        <span style="font-size:0.9rem; font-weight:700; color:#7B1D3C; background:#FEF2F2; padding:0.3rem 0.9rem; border-radius:8px; border:1px solid #FECACA;">
                            Max: ${q.marks || 5} marks
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                        <div style="display:flex; align-items:center; gap:0.5rem; background:white; padding:0.35rem 0.75rem; border-radius:10px; border:2px solid #CBD5E1;">
                            <button type="button" onclick="const inp=document.getElementById('marks-${q.id}'); if(parseInt(inp.value) > 0) { inp.value=parseInt(inp.value)-1; inp.onchange(inp); }" style="width:32px; height:32px; border:none; background:#F1F5F9; border-radius:6px; font-size:1.25rem; font-weight:700; cursor:pointer; color:#475569; display:flex; align-items:center; justify-content:center; line-height:1;">−</button>
                            <input type="number" id="marks-${q.id}" class="form-input" value="${marksAwarded}" min="0" max="${q.marks || 5}" style="width:60px; text-align:center; font-size:1.35rem; font-weight:800; border:none; background:transparent; color:#1E293B; padding:0.25rem;" onchange="updateTheoryMarks('${submission.id}', '${q.id}', this.value)" />
                            <button type="button" onclick="const inp=document.getElementById('marks-${q.id}'); if(parseInt(inp.value) < ${q.marks || 5}) { inp.value=parseInt(inp.value)+1; inp.onchange(inp); }" style="width:32px; height:32px; border:none; background:#F1F5F9; border-radius:6px; font-size:1.25rem; font-weight:700; cursor:pointer; color:#475569; display:flex; align-items:center; justify-content:center; line-height:1;">+</button>
                        </div>
                        <span style="font-size:1rem; font-weight:600; color:var(--text-muted);">/ ${q.marks || 5} marks</span>
                        <div style="display:flex; gap:0.5rem; margin-left:auto;">
                            <button class="btn btn-primary btn-sm" onclick="updateTheoryMarks('${submission.id}', '${q.id}', ${q.marks || 5})" style="background:#2D9B6F; font-weight:700; padding:0.5rem 1rem; border-radius:8px;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="vertical-align:middle; margin-right:0.25rem;"><polyline points="20 6 9 17 4 12"/></svg> Full Marks</button>
                            <button class="btn btn-ghost btn-sm" onclick="updateTheoryMarks('${submission.id}', '${q.id}', 0)" style="color:#DC2626; font-weight:700; padding:0.5rem 1rem; border-radius:8px; border:1px solid #FECACA;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" style="vertical-align:middle; margin-right:0.25rem;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Zero</button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        
        // Add overall score summary
        detailsHTML += `
            <div style="background:linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color:white; padding:1.5rem; border-radius:12px; margin-top:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <p style="font-size:0.875rem; opacity:0.9; margin-bottom:0.25rem;">Total Score</p>
                        <p style="font-size:2rem; font-weight:800;" id="total-score">${awardedMarks} / ${totalMarks}</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-size:0.875rem; opacity:0.9; margin-bottom:0.25rem;">Percentage</p>
                        <p style="font-size:2rem; font-weight:800;" id="percentage-score">${Math.round((awardedMarks/totalMarks)*100)}%</p>
                    </div>
                </div>
            </div>
        `;
    } else if (questions.length > 0 && submission.answers) {
        // MCQ exam view
        console.log('[showSubmissionModal MCQ] questions sample:', questions[0], 'answers:', submission.answers);
        
        questions.forEach((q, idx) => {
            const studentAnswer = submission.answers[idx];
            // Handle both q.correct and q.correctAnswer field names
            const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
            const isCorrect = studentAnswer === correctAns;
            // Handle both q.text and q.question field names
            const questionText = q.text || q.question || `Question ${idx + 1}`;
            
            detailsHTML += `
            <div style="background:${isCorrect ? '#E8F7F1' : '#FEE2E2'}; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid ${isCorrect ? '#2D9B6F' : '#DC2626'};">
                <p style="font-weight:700; margin-bottom:0.5rem;"><span style="color:#7B1D3C;">Q${idx + 1}.</span> ${questionText}</p>
                <p style="font-size:0.9rem; margin-bottom:0.5rem;">Options:</p>
                <ul style="margin:0; padding-left:1.5rem; font-size:0.85rem;">
                    ${(q.options || []).map((opt, oIdx) => {
                let style = '';
                if (oIdx === correctAns) style = 'color:#2D9B6F; font-weight:700;';
                if (oIdx === studentAnswer && oIdx !== correctAns) style = 'color:#DC2626; font-weight:700;';
                if (oIdx === studentAnswer && oIdx === correctAns) style = 'color:#2D9B6F; font-weight:700;';
                return `<li style="${style}">${String.fromCharCode(65 + oIdx)}. ${opt || 'Option ' + (oIdx + 1)} ${oIdx === correctAns ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> (Correct)' : ''} ${oIdx === studentAnswer && oIdx !== correctAns ? ' (Your Answer)' : ''}</li>`;
            }).join('')}
                </ul>
                <p style="font-size:0.85rem; margin-top:0.5rem; margin-bottom:0;">
                    <strong>Student's Answer:</strong> ${studentAnswer !== undefined ? String.fromCharCode(65 + studentAnswer) : 'Not answered'}
                </p>
            </div>
            `;
        });
    } else {
        detailsHTML += `<p>${submission.answerText || submission.fileData ? 'File submission - view in assignments' : 'No details available'}</p>`;
    }

    detailsHTML += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:800px; max-height:90vh; overflow-y:auto;">
            <div class="modal-header" style="background:#7B1D3C; color:white; padding:1.5rem; border-radius:16px 16px 0 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="color:white; margin:0; font-size:1.25rem;">${submission.studentName}'s Submission</h3>
                        <p style="color:rgba(255,255,255,0.8); margin:0.25rem 0 0 0; font-size:0.875rem;">${exam?.title || submission.examTitle || 'Unknown Exam'}</p>
                    </div>
                    <button class="modal-close" style="color:white; font-size:1.5rem; background:none; border:none; cursor:pointer;" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
            </div>
            <div class="modal-body" style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; margin-bottom:1.5rem; padding:1rem; background:var(--bg-card2); border-radius:12px;">
                    <div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Student</p>
                        <p style="font-weight:600; color:var(--text-primary); margin:0.25rem 0 0 0;">${submission.studentName}</p>
                    </div>
                    <div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Class</p>
                        <p style="font-weight:600; color:var(--text-primary); margin:0.25rem 0 0 0;">${submission.studentClass || 'N/A'}</p>
                    </div>
                    <div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Submitted</p>
                        <p style="font-weight:600; color:var(--text-primary); margin:0.25rem 0 0 0;">${new Date(submission.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Status</p>
                        <p style="font-weight:600; color:${calculatedScore !== null ? 'var(--success)' : 'var(--warning)'}; margin:0.25rem 0 0 0;">${calculatedScore !== null ? 'Graded' : 'Pending Grading'}</p>
                    </div>
                    <div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Score</p>
                        <p style="font-weight:600; color:var(--text-primary); margin:0.25rem 0 0 0;">${calculatedScore !== null ? calculatedScore + '%' : 'N/A'}</p>
                    </div>
                </div>
                ${detailsHTML}
            </div>
            <div class="modal-footer" style="padding:1.5rem; border-top:1px solid var(--border); display:flex; gap:0.75rem; flex-wrap:wrap;">
                ${isTheory ? `
                <button class="btn btn-primary" style="background:#2D9B6F; flex:1;" onclick="saveTheoryGrading('${submission.id}', '${exam.id}')">
                    <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Grading
                </button>
                ` : `
                <button class="btn btn-primary" style="background:#2D9B6F;" onclick="saveAsResult('${submission.id}')">
                    <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save as Result
                </button>
                <button class="btn btn-${submission.showResultToStudent ? 'warning' : 'primary'}" onclick="toggleResultVisibility('${submission.id}')">
                    ${submission.showResultToStudent ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Hide Result' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>️️ Show Result'}
                </button>
                `}
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Update theory question marks
window.updateTheoryMarks = function(submissionId, questionId, marks) {
    const submissions = getSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);
    
    if (submissionIndex !== -1 && submissions[submissionIndex].answers) {
        const answerIndex = submissions[submissionIndex].answers.findIndex(a => a.questionId === questionId);
        if (answerIndex !== -1) {
            submissions[submissionIndex].answers[answerIndex].marksAwarded = parseInt(marks) || 0;
            saveSubmissions(submissions);
            
            // Recalculate total
            const exam = getExams().find(e => e.id === submissions[submissionIndex].examId);
            const questions = exam?.questionsList || [];
            let totalMarks = 0;
            let awardedMarks = 0;
            
            questions.forEach(q => {
                const answer = submissions[submissionIndex].answers.find(a => a.questionId === q.id);
                totalMarks += q.marks || 5;
                awardedMarks += answer?.marksAwarded || 0;
            });
            
            document.getElementById('total-score').textContent = `${awardedMarks} / ${totalMarks}`;
            document.getElementById('percentage-score').textContent = `${Math.round((awardedMarks/totalMarks)*100)}%`;
        }
    }
};

// Save theory exam grading
window.saveTheoryGrading = async function(submissionId, examId) {
    const submissions = getSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);
    
    if (submissionIndex === -1) {
        UI.toast('Submission not found', 'error');
        return;
    }
    
    const submission = submissions[submissionIndex];
    const exam = getExams().find(e => e.id === examId);
    const questions = exam?.questionsList || [];
    
    // Normalize theory exam answers
    if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
        // Theory answers are stored as { type: 'theory', responses: [{questionId, answer}, ...] }
        if (submission.answers.responses && Array.isArray(submission.answers.responses)) {
            submission.answers = submission.answers.responses;
        } else if (submission.answers.answers && Array.isArray(submission.answers.answers)) {
            submission.answers = submission.answers.answers;
        }
    }
    if (!Array.isArray(submission.answers)) {
        submission.answers = [];
    }
    
    // Calculate total score
    let totalMarks = 0;
    let awardedMarks = 0;
    
    questions.forEach(q => {
        const answer = submission.answers.find(a => a.questionId === q.id);
        totalMarks += q.marks || 5;
        awardedMarks += answer?.marksAwarded || 0;
    });
    
    const percentage = totalMarks > 0 ? Math.round((awardedMarks/totalMarks)*100) : 0;
    
    // Update submission
    submissions[submissionIndex].score = percentage;
    submissions[submissionIndex].totalMarks = totalMarks;
    submissions[submissionIndex].awardedMarks = awardedMarks;
    submissions[submissionIndex].gradedAt = new Date().toISOString();
    submissions[submissionIndex].gradedBy = Auth.current()?.name;
    
    saveSubmissions(submissions);

    // Persist to backend
    try {
        await API.submissions.grade(submissionId, {
            score: percentage,
            totalScore: totalMarks,
            feedback: 'Theory exam graded: ' + awardedMarks + '/' + totalMarks + ' (' + percentage + '%)'
        });
    } catch (e) {
        console.warn('[saveTheoryGrading] Backend grade failed:', e?.message);
    }

    // Create result
    const result = {
        id: 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        studentId: submission.studentId,
        studentName: submission.studentName,
        class: submission.studentClass,
        subject: exam?.subject || 'Unknown',
        examId: examId,
        examTitle: exam?.title || submission.examTitle,
        score: awardedMarks,
        total: totalMarks,
        percentage: percentage,
        grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F',
        type: 'Theory Exam',
        status: 'published',
        createdAt: Date.now()
    };
    
    addResult(result);
    
    UI.toast(`Grading saved! Score: ${awardedMarks}/${totalMarks} (${percentage}%)`, 'success');
    document.querySelector('.modal-overlay')?.remove();
    Router.go('teacher-results');
    showResultTab('theory');
};

// Save MCQ submission score as a result
window.saveAsResult = function(submissionId) {
    const submissions = getSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission || submission.score === null) {
        UI.toast('No score to save!', 'error');
        return;
    }
    
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    
    const result = {
        id: 'res' + Date.now(),
        studentId: submission.studentId,
        studentName: submission.studentName,
        examTitle: submission.examTitle,
        subject: exam?.subject || 'General',
        type: 'MCQ Exam',
        score: submission.score,
        totalScore: 100,
        grade: submission.score >= 90 ? 'A' : submission.score >= 80 ? 'B' : submission.score >= 70 ? 'C' : submission.score >= 50 ? 'D' : 'F',
        term: 'Second Term',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        comments: `MCQ Exam - ${submission.score}%`
    };
    
    addResult(result);
    
    // Also mark as visible to student
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx !== -1) {
        submissions[idx].showResultToStudent = true;
        saveSubmissions(submissions);
    }
    
    UI.toast('Result saved and will be visible to student!', 'success');
    document.querySelector('.modal-overlay')?.remove();
};

window.toggleResultVisibility = function(submissionId) {
    const submissions = getSubmissions();
    const idx = submissions.findIndex(s => s.id === submissionId);
    if (idx === -1) return;
    
    submissions[idx].showResultToStudent = !submissions[idx].showResultToStudent;
    saveSubmissions(submissions);
    
    UI.toast(submissions[idx].showResultToStudent ? 'Result will be visible to student!' : 'Result hidden from student', 'success');
    
    // Refresh the page to show updated state
    Router.go('teacher-results');
    showResultTab('submissions');
};

window.saveAsResult = function(submissionId) {
    const submissions = getSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        UI.toast('Submission not found', 'error');
        return;
    }

    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    
    const result = {
        id: 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        studentId: submission.studentId,
        studentName: submission.studentName,
        class: submission.studentClass,
        subject: exam?.subject || submission.examSubject,
        examId: submission.examId,
        examTitle: submission.examTitle,
        score: submission.score,
        total: 100,
        percentage: submission.score,
        grade: submission.score >= 90 ? 'A+' : 
               submission.score >= 80 ? 'A' : 
               submission.score >= 70 ? 'B' : 
               submission.score >= 60 ? 'C' : 
               submission.score >= 50 ? 'D' : 'F',
        status: 'published',
        createdAt: Date.now()
    };

    addResult(result);
    UI.toast('Result saved successfully!', 'success');
    
    document.querySelector('.modal-overlay')?.remove();
    Router.go('teacher-results');
    showResultTab('exam');
};

/* =============================================
   TEACHER SETTINGS PAGE
   ============================================= */
function renderTeacherSettings() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    const academic = getAcademicInfo();
    
    const content = `
    <div class="page" style="padding:0; max-width: none;">
      <div class="hero-banner" style="padding: 2.5rem 2rem; text-align:center;">
        <div class="hero-eyebrow">Academic Session ${academic.session} - ${academic.term}</div>
        <h1 class="hero-title" style="font-size:2.5rem; margin-bottom:0.75rem;">Account Settings</h1>
        <p class="hero-sub" style="margin: 0 auto;">Manage your profile and preferences.</p>
      </div>

      <div class="home-bottom" style="margin-top:2rem;">
        <div class="section-card" style="padding: 2.5rem; max-width: 800px; margin: 0 auto;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:2rem;">
            <span style="font-size:1.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            <h3 style="font-size:1.2rem; font-weight:800;">Profile Information</h3>
          </div>

          <form id="teacher-profile-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="teacher-name" class="form-input" style="padding-left:1rem;" value="${user.name}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="teacher-email" class="form-input" style="padding-left:1rem;" value="${user.email}" readonly />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Teacher ID</label>
                <input type="text" class="form-input" style="padding-left:1rem;" value="${user.teacherId || 'N/A'}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Assigned Subjects</label>
                <input type="text" class="form-input" style="padding-left:1rem;" value="${(Array.isArray(user.assignedSubjects) ? user.assignedSubjects : []).join(', ')}" readonly />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Assigned Classes</label>
                <input type="text" class="form-input" style="padding-left:1rem;" value="${(Array.isArray(user.assignedClasses) ? user.assignedClasses : []).join(', ')}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Class Teacher Of</label>
                <input type="text" class="form-input" style="padding-left:1rem;" value="${user.classTeacherOf || 'None'}" readonly />
              </div>
            </div>

            <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px dashed var(--border);">
              <button type="button" class="btn btn-ghost" onclick="Auth.logout(); window.location.href='teacher.html'"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout</button>
            </div>
          </form>
        </div>

        <div class="sidebar-widgets" style="margin-top:2rem;">
          <div class="clock-card" style="padding: 2rem 1.5rem;">
            <div style="font-size:1.5rem; margin-bottom:1rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="time" style="font-size:2.5rem;">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
          </div>
        </div>
      </div>
    </div>
    `;
    
    UI.buildPortal('teacher-settings', content);
}

// View/Edit Exam Questions Modal
window.viewExamQuestions = function(examId) {
    try {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) {
        UI.toast('Exam not found!', 'error');
        return;
    }
    
    const questions = exam.questionsList || [];
    const optionLabels = ['A', 'B', 'C', 'D'];
    
    let questionsHTML = questions.map((q, idx) => `
        <div class="premium-card question-edit-card" data-qindex="${idx}" style="padding: 1.25rem; margin-bottom: 1rem; border: 2px solid var(--border); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #7B1D3C; background: #fef2f5; padding: 0.25rem 0.75rem; border-radius: 6px;">Question ${idx + 1}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn btn-ghost btn-sm" style="color: #2D9B6F;" onclick="editQuestion('${examId}', ${idx})"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit</button>
                    <button type="button" class="btn btn-ghost btn-sm" style="color: #DC2626;" onclick="deleteQuestion('${examId}', ${idx})"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>️ Delete</button>
                </div>
            </div>
            <p style="font-weight: 600; margin-bottom: 1rem; text-align: left;">${q.text || q.question}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: left;">
                ${q.options ? q.options.map((opt, oIdx) => `
                    <div style="padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid ${oIdx === q.correct || oIdx === q.correctAnswer ? '#2D9B6F' : '#e5e7eb'}; background: ${oIdx === q.correct || oIdx === q.correctAnswer ? '#E8F7F1' : '#f9fafb'};">
                        <strong style="color: ${oIdx === q.correct || oIdx === q.correctAnswer ? '#2D9B6F' : '#6b7280'};">${optionLabels[oIdx]}.</strong> ${opt} ${oIdx === q.correct || oIdx === q.correctAnswer ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </div>
                `).join('') : '<p>No options (Theory question)</p>'}
            </div>
        </div>
    `).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header" style="background: #7B1D3C; color: white;">
                <div>
                    <h3 style="color: white;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${exam.title}</h3>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">${exam.subject} • ${questions.length} Questions</p>
                </div>
                <button class="modal-close" style="color: white;" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0; font-weight: 700;">Questions</h4>
                    <button type="button" class="btn btn-primary btn-sm" style="background: #2D9B6F;" onclick="addQuestionToExam('${examId}')"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Question</button>
                </div>
                <div id="questions-edit-list">
                    ${questionsHTML || '<p style="text-align: center; color: #6b7280; padding: 2rem;">No questions yet. Click "Add Question" to create one.</p>'}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    } catch (err) {
        console.error('Error viewing exam questions:', err);
        UI.toast('Error loading questions: ' + err.message, 'error');
    }
};

window.addQuestionToExam = function(examId) {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    if (!exam.questionsList) exam.questionsList = [];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header" style="background: #7B1D3C; color: white;">
                <h3 style="color: white;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add New Question</h3>
                <button class="modal-close" style="color: white;" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form onsubmit="event.preventDefault(); saveNewQuestion('${examId}');">
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">Question</label>
                        <textarea id="new-q-text" class="form-input" rows="3" placeholder="Type your question here..." required></textarea>
                    </div>
                    <div style="font-weight: 700; font-size: 0.85rem; color: #374151; margin-bottom: 0.75rem;">Options (A, B, C, D)</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">A</span>
                            <input type="text" id="new-q-opt-a" class="form-input" placeholder="Option A" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">B</span>
                            <input type="text" id="new-q-opt-b" class="form-input" placeholder="Option B" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">C</span>
                            <input type="text" id="new-q-opt-c" class="form-input" placeholder="Option C" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">D</span>
                            <input type="text" id="new-q-opt-d" class="form-input" placeholder="Option D" required />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correct Answer</label>
                        <select id="new-q-correct" class="form-input" style="background: #E8F7F1; border-color: #2D9B6F;">
                            <option value="0"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option A</option>
                            <option value="1"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option B</option>
                            <option value="2"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option C</option>
                            <option value="3"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option D</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="background: #2D9B6F;">Save Question</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveNewQuestion = function(examId) {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    if (!exam.questionsList) exam.questionsList = [];
    
    const newQ = {
        text: document.getElementById('new-q-text').value,
        options: [
            document.getElementById('new-q-opt-a').value,
            document.getElementById('new-q-opt-b').value,
            document.getElementById('new-q-opt-c').value,
            document.getElementById('new-q-opt-d').value
        ],
        correct: parseInt(document.getElementById('new-q-correct').value)
    };
    
    exam.questionsList.push(newQ);
    exam.questions = exam.questionsList.length;
    saveExams(exams);
    
    document.querySelector('.modal-overlay:last-child').remove();
    viewExamQuestions(examId);
    UI.toast('Question added successfully!', 'success');
};

window.editQuestion = function(examId, qIndex) {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questionsList || !exam.questionsList[qIndex]) return;
    
    const q = exam.questionsList[qIndex];
    const correctAns = q.correct !== undefined ? q.correct : (q.correctIndex !== undefined ? q.correctIndex : (q.correctAnswer || 0));
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header" style="background: #7B1D3C; color: white;">
                <h3 style="color: white;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Edit Question ${qIndex + 1}</h3>
                <button class="modal-close" style="color: white;" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form onsubmit="event.preventDefault(); updateQuestion('${examId}', ${qIndex});">
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label">Question</label>
                        <textarea id="edit-q-text" class="form-input" rows="3" required>${q.text || q.question || ''}</textarea>
                    </div>
                    <div style="font-weight: 700; font-size: 0.85rem; color: #374151; margin-bottom: 0.75rem;">Options (A, B, C, D)</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">A</span>
                            <input type="text" id="edit-q-opt-a" class="form-input" value="${q.options?.[0] || ''}" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">B</span>
                            <input type="text" id="edit-q-opt-b" class="form-input" value="${q.options?.[1] || ''}" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">C</span>
                            <input type="text" id="edit-q-opt-c" class="form-input" value="${q.options?.[2] || ''}" required />
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="width: 32px; height: 32px; background: #7B1D3C; color: white; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-weight: 900;">D</span>
                            <input type="text" id="edit-q-opt-d" class="form-input" value="${q.options?.[3] || ''}" required />
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correct Answer</label>
                        <select id="edit-q-correct" class="form-input" style="background: #E8F7F1; border-color: #2D9B6F;">
                            <option value="0" ${correctAns === 0 ? 'selected' : ''}><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option A</option>
                            <option value="1" ${correctAns === 1 ? 'selected' : ''}><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option B</option>
                            <option value="2" ${correctAns === 2 ? 'selected' : ''}><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option C</option>
                            <option value="3" ${correctAns === 3 ? 'selected' : ''}><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Option D</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="background: #2D9B6F;">Update Question</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

window.updateQuestion = function(examId, qIndex) {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questionsList || !exam.questionsList[qIndex]) return;
    
    exam.questionsList[qIndex] = {
        text: document.getElementById('edit-q-text').value,
        options: [
            document.getElementById('edit-q-opt-a').value,
            document.getElementById('edit-q-opt-b').value,
            document.getElementById('edit-q-opt-c').value,
            document.getElementById('edit-q-opt-d').value
        ],
        correct: parseInt(document.getElementById('edit-q-correct').value)
    };
    
    saveExams(exams);
    document.querySelector('.modal-overlay:last-child').remove();
    viewExamQuestions(examId);
    UI.toast('Question updated successfully!', 'success');
};

window.deleteQuestion = function(examId, qIndex) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questionsList) return;
    
    exam.questionsList.splice(qIndex, 1);
    exam.questions = exam.questionsList.length;
    saveExams(exams);
    
    viewExamQuestions(examId);
    UI.toast('Question deleted!', 'success');
};

window.editExam = function(examId) {
    const exams = getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    // Pre-fill the form
    document.getElementById('exam-title').value = exam.title || '';
    document.getElementById('exam-subject').value = exam.subject || '';
    document.getElementById('exam-category').value = exam.category || '';
    document.getElementById('exam-class').value = exam.class || '';
    document.getElementById('exam-format').value = exam.format || 'mcq';
    document.getElementById('exam-duration').value = exam.duration || 60;
    document.getElementById('exam-desc').value = exam.desc || '';
    
    // Clear existing questions
    const qList = document.getElementById('questions-list');
    if (qList) qList.innerHTML = '';
    
    // Add existing questions
    if (exam.questionsList && exam.questionsList.length > 0) {
        exam.questionsList.forEach((q, idx) => {
            window.addExamQuestion();
            // Wait for DOM to update then fill values
            setTimeout(() => {
                const cards = document.querySelectorAll('.q-text');
                if (cards[idx]) {
                    cards[idx].value = q.text || q.question || '';
                    const opts = document.querySelectorAll('.opt');
                    if (opts[idx * 4]) opts[idx * 4].value = q.options?.[0] || '';
                    if (opts[idx * 4 + 1]) opts[idx * 4 + 1].value = q.options?.[1] || '';
                    if (opts[idx * 4 + 2]) opts[idx * 4 + 2].value = q.options?.[2] || '';
                    if (opts[idx * 4 + 3]) opts[idx * 4 + 3].value = q.options?.[3] || '';
                }
            }, 100);
        });
    }
    
    UI.toast('Exam loaded for editing. Make changes and click Publish to update.', 'info');
    // Scroll to form
    document.querySelector('.form-pane')?.scrollIntoView({ behavior: 'smooth' });
};

// Toggle exam status (Start/Stop)
window.toggleExamStatus = function(examId) {
    try {
        let exams = getExams();
        const examIndex = exams.findIndex(e => e.id === examId);
        
        if (examIndex === -1) {
            alert('Exam not found!');
            return;
        }
        
        const exam = exams[examIndex];
        
        if (exam.status === 'active') {
            if (!confirm('Stop this test?')) return;
            API.exams.update(examId, { status: 'draft' }).then(() => {
                window.DataSync?.refreshResource('exams').catch(() => {});
                UI.toast('Test stopped!', 'success');
                renderTeacherExams();
            });
        } else {
            if (!exam.questionsList || exam.questionsList.length === 0) {
                alert('Add questions first!');
                return;
            }
            API.exams.update(examId, { status: 'active' }).then(() => {
                window.DataSync?.refreshResource('exams').catch(() => {});
                UI.toast('Test is now LIVE!', 'success');
                renderTeacherExams();
            });
        }
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    }
};

// Fix existing theory exam questions by setting default marks
window.fixTheoryExamMarks = function(examId, defaultMarks = 5) {
    const exams = getExams();
    const examIndex = exams.findIndex(e => e.id === examId);
    if (examIndex === -1) {
        UI.toast('Exam not found', 'error');
        return;
    }
    
    const exam = exams[examIndex];
    if (!exam.questionsList || exam.questionsList.length === 0) {
        UI.toast('No questions found', 'error');
        return;
    }
    
    // Update marks for all questions and normalize
    exam.questionsList = exam.questionsList.map(q => ({
        ...q,
        marks: q.marks || q.points || defaultMarks,
        correct: q.correct ?? q.correctIndex ?? q.correctAnswer ?? 0
    }));
    
    // Also update the questions array for MCQ compatibility
    if (Array.isArray(exam.questions)) {
        exam.questions = exam.questionsList.map(q => ({
            ...q,
            points: q.marks || q.points || defaultMarks
        }));
    }
    
    saveExams(exams);
    UI.toast(`Fixed ${exam.questionsList.length} questions with ${defaultMarks} marks each`, 'success');
};
