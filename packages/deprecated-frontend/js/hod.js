/* =============================================
   HOD.JS — Yeshua Educational Platform
   ============================================= */

// Mock data fallback if local cache is empty
function getMockDeptTeachers() {
    return [
        { id: 'T-103', name: 'Dr. Sarah Ibrahim', subject: 'Physics', classes: ['SS1', 'SS2', 'SS3'], lessonPlans: 5, status: 'Approved' },
        { id: 'T-104', name: 'Mr. Emmanuel Nwosu', subject: 'Chemistry', classes: ['SS2', 'SS3'], lessonPlans: 2, status: 'Pending Review' },
        { id: 'T-105', name: 'Mrs. Chinyere Okafor', subject: 'Biology', classes: ['JSS2', 'SS1', 'SS2'], lessonPlans: 6, status: 'Approved' },
        { id: 'T-106', name: 'Mr. John Obi', subject: 'Agricultural Science', classes: ['JSS3', 'SS1'], lessonPlans: 1, status: 'Needs Revision' }
    ];
}

function getMockDeptSubjects() {
    return [
        { id: 'SUB-1', name: 'Physics', code: 'PHY', progress: '78%', teacher: 'Dr. Sarah Ibrahim', term: 'Second Term' },
        { id: 'SUB-2', name: 'Chemistry', code: 'CHM', progress: '62%', teacher: 'Mr. Emmanuel Nwosu', term: 'Second Term' },
        { id: 'SUB-3', name: 'Biology', code: 'BIO', progress: '90%', teacher: 'Mrs. Chinyere Okafor', term: 'Second Term' },
        { id: 'SUB-4', name: 'Agricultural Science', code: 'AGR', progress: '45%', teacher: 'Mr. John Obi', term: 'Second Term' }
    ];
}

function getMockDeptStudents() {
    return [
        { id: 'S-201', name: 'Samuel Adebayo', class: 'SS3 Science', math: 85, phy: 80, chm: 88, bio: 92, avg: 86.2 },
        { id: 'S-202', name: 'Blessing Udoh', class: 'SS2 Science', math: 72, phy: 78, chm: 68, bio: 82, avg: 75.0 },
        { id: 'S-204', name: 'Miracle Chinedu', class: 'SS1 Science', math: 55, phy: 62, chm: 60, bio: 65, avg: 60.5 },
        { id: 'S-206', name: 'Peter Anini', class: 'SS3 Science', math: 95, phy: 92, chm: 90, bio: 96, avg: 93.2 }
    ];
}

/* ---- REAL API DATA LOADER ---- */
let _hodDataCache = null;
async function loadHodData() {
  if (_hodDataCache) return _hodDataCache;
  let teachers = [], students = [], results = [], schemes = [], lessonPlans = [];
  try {
    const [uRes, rRes, schRes, lpRes] = await Promise.all([
      API.admin.getUsers().catch(() => ({ data: [] })),
      API.results.getAll().catch(() => ({ data: [] })),
      API.schemes.getAll().catch(() => ({ data: [] })),
      API.lessonPlans.getAll().catch(() => ({ data: [] })),
    ]);
    const allUsers = (uRes && uRes.data) ? uRes.data : [];
    teachers = allUsers.filter(u => u && u.role === 'teacher');
    students = allUsers.filter(u => u && u.role === 'student');
    results = (rRes && rRes.data) ? rRes.data : [];
    schemes = (schRes && schRes.data) ? schRes.data : [];
    lessonPlans = (lpRes && lpRes.data) ? lpRes.data : [];
  } catch (e) {}
  if (!teachers.length) teachers = getMockDeptTeachers();
  if (!students.length) students = getMockDeptStudents();
  _hodDataCache = { teachers, students, results, schemes, lessonPlans };
  return _hodDataCache;
}

/* ---- BOOTSTRAP ---- */
(function boot() {
    UI.initTheme();

    let user = Auth.current();
    if (!user || user.role !== 'hod') {
        // Create mock session for preview / login simplicity
        user = {
            id: 'HOD-302',
            name: 'Dr. Sarah Ibrahim',
            role: 'hod',
            department: 'Science & Technology',
            initials: 'SI'
        };
        sessionStorage.setItem('yep_session', JSON.stringify(user));
        sessionStorage.setItem('yep_token', 'mock-hod-token');
    }

    // Register HOD Routes
    Router.register('hod-home', renderHodHome);
    Router.register('hod-subjects', renderHodSubjects);
    Router.register('hod-teachers', renderHodTeachers);
    Router.register('hod-students', renderHodStudents);
    Router.register('hod-settings', renderHodSettings);

    Router.init();

    // Default route
    if (!window.location.hash || window.location.hash === '#login') {
        Router.go('hod-home');
    }
})();

/* =============================================
   HOD HOME DASHBOARD
   ============================================= */
async function renderHodHome() {
    const user = Auth.current() || { name: 'Dr. Sarah Ibrahim', initials: 'SI', department: 'Science & Technology' };
    const data = await loadHodData();
    const teachers = data.teachers, students = data.students, results = data.results;
    const schemes = data.schemes, lessonPlans = data.lessonPlans;

    const scoredResults = results.filter(r => (r.score || r.objectiveScore) != null);
    const avgScore = scoredResults.length
      ? (scoredResults.reduce((sum, r) => sum + (Number(r.score) || Number(r.objectiveScore) + Number(r.theoryScore || 0) || 0), 0) / scoredResults.length).toFixed(1)
      : '—';
    const pendingAudits = teachers.filter(t => {
      const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
      return teacherPlans.some(p => p.status === 'pending' || !p.status);
    });
    const syllabusPct = schemes.length && teachers.length
      ? Math.round((schemes.filter(s => s.completed || s.approved).length / Math.max(schemes.length, 1)) * 100)
      : '—';

    const activePage = 'hod-home';

    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 1.5rem 2rem; border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
            <div>
                <h1 style="font-size: 2rem; font-weight: 800; color: var(--maroon); margin: 0;">
                    HOD Dashboard
                </h1>
                <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Welcome, ${user.name}. Department: <strong style="color: var(--maroon);">${user.department || 'Science & Technology'}</strong>.</p>
            </div>
            <div style="background: var(--maroon-bg); color: var(--maroon); padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.875rem; border: 1px solid rgba(123, 29, 60, 0.2);">
                Second Term Review Focus
            </div>
        </div>

        <!-- Metric Stat Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
            
            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dept. Class Average</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--maroon); margin-top: 0.25rem;">${avgScore}${avgScore !== '—' ? '%' : ''}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F7F1; color: #2D9B6F; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    ${scoredResults.length} exam results this term
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dept. Teachers</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--text-primary); margin-top: 0.25rem;">${teachers.length} Active</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--maroon-bg); color: var(--maroon); display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    ${lessonPlans.length} lesson plans recorded
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Syllabus Completion</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--text-primary); margin-top: 0.25rem;">${syllabusPct}${syllabusPct !== '—' ? '%' : ''}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F3FB; color: #1A6FA8; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    ${schemes.length} schemes of work across dept.
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Pending Lesson Audits</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: #B87A00; margin-top: 0.25rem;">${pendingAudits.length} Form${pendingAudits.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #FFF8E5; color: #B87A00; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #B87A00; font-weight: 600;">
                    Submitted by teachers for verification
                </div>
            </div>

        </div>

        <!-- Main Body Grid -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            
            <!-- Left Column -->
            <div>
                <!-- Recent Schemes Submissions -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow); margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0;">Lesson Plan Approvals</h3>
                        <a onclick="Router.go('hod-teachers')" style="color: var(--maroon-light); font-weight: 600; text-decoration: none; font-size: 0.875rem; cursor: pointer;">Audit Dashboard &rarr;</a>
                    </div>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                                    <th style="padding: 1rem 0.5rem;">Teacher</th>
                                    <th style="padding: 1rem 0.5rem;">Subject</th>
                                    <th style="padding: 1rem 0.5rem; text-align: center;">Total Plans</th>
                                    <th style="padding: 1rem 0.5rem;">Status</th>
                                    <th style="padding: 1rem 0.5rem; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teachers.filter(t => {
                                    const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
                                    return teacherPlans.some(p => p.status === 'pending' || !p.status);
                                }).length ? teachers.filter(t => {
                                    const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
                                    return teacherPlans.some(p => p.status === 'pending' || !p.status);
                                }).slice(0, 4).map(t => {
                                    const planCount = lessonPlans.filter(lp => lp.createdBy === t.id).length;
                                    const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                                    return `
                                <tr id="row-${t.id}" style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                    <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${t.name}</td>
                                    <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${subj}</td>
                                    <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 700;">${planCount} checked</td>
                                    <td style="padding: 1.25rem 0.5rem;" class="status-cell">
                                        <span style="background: #FFF8E5; color: #B87A00; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                            Pending Review
                                        </span>
                                    </td>
                                    <td style="padding: 1.25rem 0.5rem; text-align: right;" class="action-cell">
                                        <button onclick="approvePlanDirect('${jsEsc(t.id)}', '${jsEsc(t.name)}')" class="btn-success" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #2D9B6F; color: white; border: none; cursor: pointer; font-weight: 600;">
                                            Approve SoW
                                        </button>
                                    </td>
                                </tr>
                                `;}).join('') : `
                                <tr>
                                    <td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">No pending lesson plans to review.</td>
                                </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Department Syllabus Completion -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0;">Department Syllabus Tracker</h3>
                        <a onclick="Router.go('hod-subjects')" style="color: var(--maroon-light); font-weight: 600; text-decoration: none; font-size: 0.875rem; cursor: pointer;">Manage Syllabus &rarr;</a>
                    </div>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                                    <th style="padding: 1rem 0.5rem;">Subject Name</th>
                                    <th style="padding: 1rem 0.5rem;">Course Code</th>
                                    <th style="padding: 1rem 0.5rem;">Assigned Teacher</th>
                                    <th style="padding: 1rem 0.5rem; text-align: right;">Syllabus Completion</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teachers.length ? teachers.slice(0, 4).map(t => {
                                    const teacherSchemes = schemes.filter(s => s.createdBy === t.id);
                                    const completionPct = teacherSchemes.length
                                      ? Math.round(teacherSchemes.filter(s => s.completed || s.approved).length / teacherSchemes.length * 100)
                                      : 0;
                                    let progressColor = '#2D9B6F';
                                    if (completionPct < 70) progressColor = '#B87A00';
                                    if (completionPct < 50) progressColor = '#C0392B';
                                    const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                                    return `
                                    <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                        <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${subj}</td>
                                        <td style="padding: 1.25rem 0.5rem;"><span style="background: var(--bg-card2); padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">—</span></td>
                                        <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${t.name}</td>
                                        <td style="padding: 1.25rem 0.5rem; text-align: right;">
                                            <div style="display: inline-flex; align-items: center; gap: 0.75rem;">
                                                <div style="width: 100px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; display: inline-block;">
                                                    <div style="width: ${completionPct}%; height: 100%; background: ${progressColor};"></div>
                                                </div>
                                                <span style="font-weight: 800; font-size: 0.85rem; color: ${progressColor};">${completionPct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('') : `
                                <tr>
                                    <td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">No department data available yet.</td>
                                </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- Right Column -->
            <div>
                <!-- Memo Board -->
                <div style="background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-ultra) 100%); color: white; padding: 2rem; border-radius: 20px; box-shadow: var(--shadow); margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        Department Alert
                    </h3>
                    <p style="font-size: 0.875rem; line-height: 1.5; margin: 0 0 1.25rem 0; opacity: 0.95;">
                        Terminal composite marks sheets for all senior class Science students are due for departmental submission this week.
                    </p>
                    <button onclick="Router.go('hod-students')" style="width: 100%; border: none; outline: none; background: white; color: var(--maroon); padding: 0.75rem; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
                        Review Student Grades
                    </button>
                </div>

                <!-- Academic Events List -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1.5rem 0;">Important Deadlines</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div style="display: flex; gap: 1rem; align-items: flex-start; border-left: 3px solid #C0392B; padding-left: 0.75rem;">
                            <div style="background: #FEF0EF; color: #C0392B; padding: 0.5rem; border-radius: 8px; text-align: center; min-width: 50px;">
                                <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">June</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">05</div>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Syllabus Audits</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Submit complete science logs to Principal office</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 1rem; align-items: flex-start; border-left: 3px solid #B87A00; padding-left: 0.75rem;">
                            <div style="background: #FFF8E5; color: #B87A00; padding: 0.5rem; border-radius: 8px; text-align: center; min-width: 50px;">
                                <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">June ...</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">12</div>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Science Fair Planning</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Board presentation of science project models</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>

    </div>
    `;

    UI.buildPortal(activePage, contentHtml);
}

/* =============================================
   DEPARTMENT SUBJECTS PORTAL
   ============================================= */
async function renderHodSubjects() {
    const data = await loadHodData();
    const teachers = data.teachers, schemes = data.schemes;
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Department Subject Curriculums</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Inspect syllabus milestones, tracking active progress loops, and course guidelines.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">Department Syllabus Metrics</h3>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">Code</th>
                            <th style="padding: 1rem 0.5rem;">Subject</th>
                            <th style="padding: 1rem 0.5rem;">Academic Term</th>
                            <th style="padding: 1rem 0.5rem;">Assigned Teacher</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Milestone Completeness</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers.length ? teachers.map(t => {
                            const teacherSchemes = schemes.filter(s => s.createdBy === t.id);
                            const completionPct = teacherSchemes.length
                              ? Math.round(teacherSchemes.filter(s => s.completed || s.approved).length / teacherSchemes.length * 100)
                              : 0;
                            let progressColor = '#2D9B6F';
                            if (completionPct < 70) progressColor = '#B87A00';
                            if (completionPct < 50) progressColor = '#C0392B';
                            const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-muted);">—</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${subj}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">Second Term</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${t.name}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;">
                                    <div style="display: inline-flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 100px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; display: inline-block;">
                                            <div style="width: ${completionPct}%; height: 100%; background: ${progressColor};"></div>
                                        </div>
                                        <span style="font-weight: 800; font-size: 0.85rem; color: ${progressColor};">${completionPct}%</span>
                                    </div>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;">
                                    <button onclick="inspectSyllabusDetails('${subj}')" class="btn-primary" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: var(--maroon); color: white; border: none; cursor: pointer;">
                                        Milestones
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('') : getMockDeptSubjects().map(s => {
                            const progressVal = parseInt(s.progress);
                            let progressColor = '#2D9B6F';
                            if (progressVal < 70) progressColor = '#B87A00';
                            if (progressVal < 50) progressColor = '#C0392B';
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-muted);">${s.code}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${s.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${s.term}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${s.teacher}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;">
                                    <div style="display: inline-flex; align-items: center; gap: 0.75rem;">
                                        <div style="width: 100px; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; display: inline-block;">
                                            <div style="width: ${s.progress}; height: 100%; background: ${progressColor};"></div>
                                        </div>
                                        <span style="font-weight: 800; font-size: 0.85rem; color: ${progressColor};">${s.progress}</span>
                                    </div>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;">
                                    <button onclick="inspectSyllabusDetails('${s.name}')" class="btn-primary" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: var(--maroon); color: white; border: none; cursor: pointer;">
                                        Milestones
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('hod-subjects', contentHtml);
}

/* =============================================
   TEACHER REVIEW BOARD
   ============================================= */
async function renderHodTeachers() {
    const data = await loadHodData();
    const teachers = data.teachers, lessonPlans = data.lessonPlans;
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Department Teacher Supervision</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Verify weekly schemes of work and approve teaching lesson plans before forwarding to the Principal.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">Syllabus Plans Review</h3>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">Instructor</th>
                            <th style="padding: 1rem 0.5rem;">Subject Field</th>
                            <th style="padding: 1rem 0.5rem;">Target Classes</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Lesson Plans Checked</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Status</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers.length ? teachers.map(t => {
                            const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
                            const planCount = teacherPlans.length;
                            const hasPending = teacherPlans.some(p => p.status === 'pending' || !p.status);
                            const isApproved = teacherPlans.length > 3;
                            let status = 'Needs Revision';
                            let badgeColor = '#C0392B';
                            let badgeBg = '#FEF0EF';
                            if (isApproved) { status = 'Approved'; badgeColor = '#2D9B6F'; badgeBg = '#E8F7F1'; }
                            else if (hasPending) { status = 'Pending Review'; badgeColor = '#B87A00'; badgeBg = '#FFF8E5'; }
                            const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                            const cls = (t.assignedClasses && t.assignedClasses.length) ? t.assignedClasses : ['—'];
                            return `
                            <tr id="tab-row-${t.id}" style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${t.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${subj}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${cls.join(', ')}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 700;">${planCount} checked</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;" class="status-cell">
                                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                        ${status}
                                    </span>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;" class="action-cell">
                                    ${hasPending ? `
                                    <div style="display: inline-flex; gap: 0.5rem; justify-content: flex-end;">
                                        <button onclick="rejectPlanDirect('${jsEsc(t.id)}', '${jsEsc(t.name)}')" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #C0392B; color: white; border: none; cursor: pointer; font-weight: 600;">
                                            Revise
                                        </button>
                                        <button onclick="approvePlanDirect('${jsEsc(t.id)}', '${jsEsc(t.name)}')" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #2D9B6F; color: white; border: none; cursor: pointer; font-weight: 600;">
                                            Verify
                                        </button>
                                    </div>
                                    ` : `
                                    <span style="font-size: 0.85rem; color: ${badgeColor}; font-weight: 700;">
                                        ${isApproved ? 'Verified (Principal Review)' : 'Revision Sent'}
                                    </span>
                                    `}
                                </td>
                            </tr>
                            `;
                        }).join('') : getMockDeptTeachers().map(t => {
                            let badgeColor = '#2D9B6F';
                            let badgeBg = '#E8F7F1';
                            if (t.status === 'Pending Review') { badgeColor = '#B87A00'; badgeBg = '#FFF8E5'; }
                            if (t.status === 'Needs Revision') { badgeColor = '#C0392B'; badgeBg = '#FEF0EF'; }
                            return `
                            <tr id="tab-row-${t.id}" style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${t.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${t.subject}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${t.classes.join(', ')}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 700;">${t.lessonPlans} checked</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;" class="status-cell">
                                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                        ${t.status}
                                    </span>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;" class="action-cell">
                                    ${t.status === 'Pending Review' ? `
                                    <div style="display: inline-flex; gap: 0.5rem; justify-content: flex-end;">
                                        <button onclick="rejectPlanDirect('${jsEsc(t.id)}', '${jsEsc(t.name)}')" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #C0392B; color: white; border: none; cursor: pointer; font-weight: 600;">
                                            Revise
                                        </button>
                                        <button onclick="approvePlanDirect('${jsEsc(t.id)}', '${jsEsc(t.name)}')" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #2D9B6F; color: white; border: none; cursor: pointer; font-weight: 600;">
                                            Verify
                                        </button>
                                    </div>
                                    ` : `
                                    <span style="font-size: 0.85rem; color: ${badgeColor}; font-weight: 700;">
                                        ${t.status === 'Approved' ? 'Verified (Principal Review)' : 'Revision Sent'}
                                    </span>
                                    `}
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('hod-teachers', contentHtml);
}

/* =============================================
   DEPARTMENT ANALYTICS & STUDENT LIST
   ============================================= */
async function renderHodStudents() {
    const data = await loadHodData();
    const students = data.students, results = data.results;
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Department Student Analytics</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Monitor student average scores across specific core Science subjects.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">Department Students Record Sheets</h3>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">Student ID</th>
                            <th style="padding: 1rem 0.5rem;">Name</th>
                            <th style="padding: 1rem 0.5rem;">Class Level</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Average Score</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Term Results</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.length ? students.map(s => {
                            const studentResults = results.filter(r => r.studentId === s.id || r.student === s.name);
                            const avg = studentResults.length
                              ? studentResults.reduce((sum, r) => sum + (Number(r.score) || Number(r.objectiveScore) + Number(r.theoryScore || 0) || 0), 0) / studentResults.length
                              : 0;
                            let avgColor = '#2D9B6F';
                            if (avg < 75) avgColor = '#B87A00';
                            if (avg < 60) avgColor = '#C0392B';
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 600; color: var(--text-muted);">${s.studentId || s.id || '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${s.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${s.class || '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 800; color: ${avgColor};">${studentResults.length ? avg.toFixed(1) + '%' : '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right; font-weight: 600;">${studentResults.length} result${studentResults.length !== 1 ? 's' : ''}</td>
                            </tr>
                            `;
                        }).join('') : getMockDeptStudents().map(s => {
                            let avgColor = '#2D9B6F';
                            if (s.avg < 75) avgColor = '#B87A00';
                            if (s.avg < 60) avgColor = '#C0392B';
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 600; color: var(--text-muted);">${s.id}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${s.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${s.class}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 800; color: ${avgColor};">${s.avg.toFixed(1)}%</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right; font-weight: 600;">4 subjects</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('hod-students', contentHtml);
}

/* =============================================
   HOD PORTAL SETTINGS
   ============================================= */
function renderHodSettings() {
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
        
        <div style="margin-bottom: 2.5rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Department Settings</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">View profile properties and science-department specific settings.</p>
        </div>

        <div style="background: var(--bg-card); padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow); margin-bottom: 2rem;">
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1.5rem 0;">Department Head Profile</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
                    <label style="display: block; font-weight: 700; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Instructor Name</label>
                    <input type="text" value="Dr. Sarah Ibrahim" disabled style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card2); color: var(--text-secondary); cursor: not-allowed;" />
                </div>
                <div>
                    <label style="display: block; font-weight: 700; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Academic Focus</label>
                    <input type="text" value="Science & Technology Department" disabled style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card2); color: var(--text-secondary); cursor: not-allowed;" />
                </div>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('hod-settings', contentHtml);
}

/* =============================================
   INTERACTION HANDLERS & NOTIFICATIONS
   ============================================= */

// Direct approval of SoW plan from HOD Dashboard & Teacher reviews
window.approvePlanDirect = function(id, teacherName) {
    const homeRow = document.getElementById(`row-${id}`);
    const reviewRow = document.getElementById(`tab-row-${id}`);
    
    const applyVerify = (rowEl) => {
        if (!rowEl) return;
        const statusCell = rowEl.querySelector('.status-cell');
        const actionCell = rowEl.querySelector('.action-cell');
        if (statusCell && actionCell) {
            statusCell.innerHTML = `
                <span style="background: #E8F7F1; color: #2D9B6F; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                    Approved
                </span>
            `;
            actionCell.innerHTML = `
                <span style="font-size: 0.85rem; color: #2D9B6F; font-weight: 700;">Verified (Principal Review)</span>
            `;
        }
    };

    applyVerify(homeRow);
    applyVerify(reviewRow);

    UI.toast(`Schemes of Work for ${teacherName} verified successfully! Escalated to Principal portal.`, 'success');
};

// Request revision / reject teaching plan
window.rejectPlanDirect = function(id, teacherName) {
    const rowEl = document.getElementById(`tab-row-${id}`);
    if (rowEl) {
        const statusCell = rowEl.querySelector('.status-cell');
        const actionCell = rowEl.querySelector('.action-cell');
        if (statusCell && actionCell) {
            statusCell.innerHTML = `
                <span style="background: #FEF0EF; color: #C0392B; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                    Needs Revision
                </span>
            `;
            actionCell.innerHTML = `
                <span style="font-size: 0.85rem; color: #C0392B; font-weight: 700;">Revision Sent</span>
            `;
            UI.toast(`Lesson plan revision request sent to ${teacherName}.`, 'warning');
        }
    }
};

// Inspect syllabus detail overlay
window.inspectSyllabusDetails = function(name) {
    const modalId = 'syllabus-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        
        modal.innerHTML = `
        <div style="background: var(--bg-card); padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-lg); max-width: 500px; width: 100%; position: relative;">
            <button onclick="document.getElementById('${modalId}').remove()" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1rem 0;">Syllabus Milestones</h3>
            <h4 id="syllabus-title" style="margin: 0 0 1.5rem 0; font-size: 1rem; color: var(--text-primary);">Course: Physics</h4>
            
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #2D9B6F; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;">&check;</div>
                    <span style="font-size: 0.9rem; color: var(--text-primary);">Unit 1: Linear Motion & Velocity-Time (Done)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #2D9B6F; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;">&check;</div>
                    <span style="font-size: 0.9rem; color: var(--text-primary);">Unit 2: Work, Energy & Power (Done)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: #B87A00; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">&bull;</div>
                    <span style="font-size: 0.9rem; color: var(--text-primary);">Unit 3: Electric Fields & Capacitance (Active)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background: var(--border); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;"></div>
                    <span style="font-size: 0.9rem; color: var(--text-secondary); opacity: 0.7;">Unit 4: Wave Motions & Optics (Locked)</span>
                </div>
            </div>

            <button onclick="document.getElementById('${modalId}').remove()" style="width: 100%; padding: 0.65rem; border-radius: 8px; background: var(--maroon); border: none; font-weight: 700; color: white; cursor: pointer;">Close Inspector</button>
        </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('syllabus-title').textContent = `Course Syllabus: ${name}`;
};
