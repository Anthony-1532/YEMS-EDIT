/* =============================================
   PRINCIPAL.JS — Yeshua Educational Platform
   ============================================= */

// Mock data fallback if local cache is empty
function getMockTeachers() {
    return [
        { id: 'T-101', name: 'Mrs. Abigail Mensah', subject: 'Mathematics', classes: ['JSS1', 'JSS2', 'SS1'], lessonPlans: 4, schemes: 'Approved' },
        { id: 'T-102', name: 'Mr. David Olatunji', subject: 'English Language', classes: ['JSS3', 'SS2', 'SS3'], lessonPlans: 3, schemes: 'Pending Approval' },
        { id: 'T-103', name: 'Dr. Sarah Ibrahim', subject: 'Physics', classes: ['SS1', 'SS2', 'SS3'], lessonPlans: 5, schemes: 'Approved' },
        { id: 'T-104', name: 'Mr. Emmanuel Nwosu', subject: 'Chemistry', classes: ['SS2', 'SS3'], lessonPlans: 2, schemes: 'Needs Revision' },
        { id: 'T-105', name: 'Mrs. Chinyere Okafor', subject: 'Biology', classes: ['JSS2', 'SS1', 'SS2'], lessonPlans: 6, schemes: 'Approved' }
    ];
}

function getMockReports() {
    return [
        { id: 'REP-201', title: 'JSS3 Midterm Academic Report', term: 'Second Term', date: '2026-05-28', status: 'Pending Review', compiler: 'Dr. Sarah Ibrahim (HOD Science)' },
        { id: 'REP-202', title: 'SS2 Science Class Grade Sheets', term: 'Second Term', date: '2026-05-29', status: 'Pending Review', compiler: 'Mr. Emmanuel Nwosu' },
        { id: 'REP-203', title: 'SS3 Terminal Examination Results', term: 'Second Term', date: '2026-05-25', status: 'Approved', compiler: 'Admin Office' },
        { id: 'REP-204', title: 'Junior School Composite Report', term: 'Second Term', date: '2026-05-24', status: 'Approved', compiler: 'Mrs. Abigail Mensah (HOD Math)' }
    ];
}

function getMockStudents() {
    return [
        { id: 'S-201', name: 'Samuel Adebayo', class: 'SS3', avgScore: 84.5, attendance: '96%', behavior: 'Exemplary' },
        { id: 'S-202', name: 'Blessing Udoh', class: 'SS2', avgScore: 78.2, attendance: '92%', behavior: 'Good' },
        { id: 'S-203', name: 'Tunde Bakare', class: 'JSS3', avgScore: 91.0, attendance: '98%', behavior: 'Outstanding' },
        { id: 'S-204', name: 'Miracle Chinedu', class: 'SS1', avgScore: 65.4, attendance: '88%', behavior: 'Needs Focus' },
        { id: 'S-205', name: 'Aisha Bello', class: 'JSS2', avgScore: 73.8, attendance: '94%', behavior: 'Good' }
    ];
}

/* ---- REAL API DATA LOADER ---- */
let _principalDataCache = null;
async function loadPrincipalData() {
  if (_principalDataCache) return _principalDataCache;
  let teachers = [], students = [], results = [], midterms = [], schemes = [], lessonPlans = [];
  try {
    const [uRes, rRes, mRes, schRes, lpRes] = await Promise.all([
      API.admin.getUsers().catch(() => ({ data: [] })),
      API.results.getAll().catch(() => ({ data: [] })),
      API.midtermResults.getAll().catch(() => ({ data: [] })),
      API.schemes.getAll().catch(() => ({ data: [] })),
      API.lessonPlans.getAll().catch(() => ({ data: [] })),
    ]);
    const allUsers = (uRes && uRes.data) ? uRes.data : [];
    teachers = allUsers.filter(u => u && u.role === 'teacher');
    students = allUsers.filter(u => u && u.role === 'student');
    results = (rRes && rRes.data) ? rRes.data : [];
    midterms = (mRes && mRes.data) ? mRes.data : [];
    schemes = (schRes && schRes.data) ? schRes.data : [];
    lessonPlans = (lpRes && lpRes.data) ? lpRes.data : [];
  } catch (e) {}
  if (!teachers.length) teachers = getMockTeachers();
  if (!students.length) students = getMockStudents();
  _principalDataCache = { teachers, students, results, midterms, schemes, lessonPlans };
  return _principalDataCache;
}

/* ---- BOOTSTRAP ---- */
(function boot() {
    UI.initTheme();

    let user = Auth.current();
    if (!user || user.role !== 'principal') {
        // Create mock session for preview / login simplicity
        user = {
            id: 'PRIN-902',
            name: 'Rev. Dr. Joshua Adebayo',
            role: 'principal',
            initials: 'JA'
        };
        sessionStorage.setItem('yep_session', JSON.stringify(user));
        sessionStorage.setItem('yep_token', 'mock-principal-token');
    }

    // Register Principal Routes
    Router.register('principal-home', renderPrincipalHome);
    Router.register('principal-teachers', renderTeacherSupervision);
    Router.register('principal-students', renderStudentPerformance);
    Router.register('principal-reports', renderAcademicReports);
    Router.register('principal-settings', renderPrincipalSettings);

    Router.init();

    // Default route
    if (!window.location.hash || window.location.hash === '#login') {
        Router.go('principal-home');
    }
})();


/* =============================================
   PRINCIPAL HOME DASHBOARD
   ============================================= */
async function renderPrincipalHome() {
    const user = Auth.current() || { name: 'Rev. Dr. Joshua Adebayo', initials: 'JA' };
    const data = await loadPrincipalData();
    const teachers = data.teachers, students = data.students, results = data.results;
    const midterms = data.midterms, schemes = data.schemes, lessonPlans = data.lessonPlans;

    // Compute pass rate from results
    const scoredResults = results.filter(r => (r.score || r.objectiveScore) != null);
    const avgPassRate = scoredResults.length
      ? (scoredResults.reduce((sum, r) => sum + (Number(r.score) || Number(r.objectiveScore) + Number(r.theoryScore || 0) || 0), 0) / scoredResults.length).toFixed(1)
      : '—';
    const pendingReports = results.filter(r => r.status === 'pending' || !r.status).slice(0, 3);
    const reportItems = pendingReports.length ? pendingReports : getMockReports().filter(r => r.status === 'Pending Review').slice(0, 3);

    // Layout configuration: override UI's active sidebar items specifically
    const activePage = 'principal-home';
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 1.5rem 2rem; border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
            <div>
                <h1 style="font-size: 2rem; font-weight: 800; color: var(--maroon); margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                    Principal Portal
                </h1>
                <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Welcome, ${user.name}. Supervision dashboard for school academics, staff, and students.</p>
            </div>
            <div style="background: var(--maroon-bg); color: var(--maroon); padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.875rem; border: 1px solid rgba(123, 29, 60, 0.2);">
                Academic Year: 2024/2025 | Second Term
            </div>
        </div>

        <!-- Metric Stat Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
            
            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow); transition: all 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Overall School Pass Rate</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--maroon); margin-top: 0.25rem;">${avgPassRate}${avgPassRate !== '—' ? '%' : ''}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F7F1; color: #2D9B6F; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #2D9B6F; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;">
                    <span>${scoredResults.length} results</span> <span style="color: var(--text-muted); font-weight: 400;">this term</span>
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow); transition: all 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Total Student Enrollment</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--text-primary); margin-top: 0.25rem;">${students.length}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--maroon-bg); color: var(--maroon); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    Active Learners (Junior & Senior Schools)
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow); transition: all 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Staff & Instructors</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--text-primary); margin-top: 0.25rem;">${teachers.length}</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #E8F3FB; color: #1A6FA8; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: #2D9B6F; font-weight: 600;">
                    100% Active <span style="color: var(--text-muted); font-weight: 400;">in classrooms today</span>
                </div>
            </div>

            <div class="stat-card" style="padding: 1.75rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: var(--shadow); transition: all 0.25s ease;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Average Daily Attendance</div>
                        <div style="font-size: 2.25rem; font-weight: 900; color: var(--text-primary); margin-top: 0.25rem;">94.2%</div>
                    </div>
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #FFF8E5; color: #B87A00; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    Tracked from teacher class registers
                </div>
            </div>

        </div>

        <!-- Main Body Grid -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
            
            <!-- Left Side: Interactive Tables / Approvals -->
            <div>
                <!-- Recent Approvals List -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow); margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0;">Academic Reports Pending Approval</h3>
                        <a onclick="Router.go('principal-reports')" style="color: var(--maroon-light); font-weight: 600; text-decoration: none; font-size: 0.875rem; cursor: pointer;">View All Reports &rarr;</a>
                    </div>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                                    <th style="padding: 1rem 0.5rem;">Report Title</th>
                                    <th style="padding: 1rem 0.5rem;">Compiled By</th>
                                    <th style="padding: 1rem 0.5rem;">Term</th>
                                    <th style="padding: 1rem 0.5rem;">Date Submitted</th>
                                    <th style="padding: 1rem 0.5rem; text-align: center;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportItems.map(rep => {
                                  const title = rep.title || rep.subject || 'Result Package';
                                  const compiler = rep.compiler || rep.gradedBy || rep.teacherName || '—';
                                  const term = rep.term || 'Second Term';
                                  const date = rep.date || (rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : '—');
                                  const rid = rep.id || Math.random().toString(36).slice(2);
                                  return `
                                <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                    <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${title}</td>
                                    <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${compiler}</td>
                                    <td style="padding: 1.25rem 0.5rem;"><span style="background: var(--bg-card2); padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 600; font-size: 0.75rem;">${term}</span></td>
                                    <td style="padding: 1.25rem 0.5rem; color: var(--text-muted);">${date}</td>
                                    <td style="padding: 1.25rem 0.5rem; text-align: center;">
                                        <button onclick="approveReportDirect('${rid}')" class="btn-success" style="padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.8rem; background: #2D9B6F; color: white; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
                                            Approve
                                        </button>
                                    </td>
                                </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Teacher Progress Card -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0;">Academic Staff Supervision</h3>
                        <a onclick="Router.go('principal-teachers')" style="color: var(--maroon-light); font-weight: 600; text-decoration: none; font-size: 0.875rem; cursor: pointer;">Supervise Lessons &rarr;</a>
                    </div>
                    
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                                    <th style="padding: 1rem 0.5rem;">Teacher</th>
                                    <th style="padding: 1rem 0.5rem;">Main Subject</th>
                                    <th style="padding: 1rem 0.5rem;">Classes Taught</th>
                                    <th style="padding: 1rem 0.5rem; text-align: center;">Lesson Plans</th>
                                    <th style="padding: 1rem 0.5rem; text-align: right;">Curriculum Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teachers.slice(0, 4).map(t => {
                                    const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
                                    const teacherSchemes = schemes.filter(s => s.createdBy === t.id);
                                    const planCount = teacherPlans.length;
                                    const schemeStatus = teacherSchemes.length > 3 ? 'Approved' : teacherSchemes.length > 0 ? 'Pending Approval' : 'Needs Revision';
                                    let badgeColor = '#2D9B6F';
                                    let badgeBg = '#E8F7F1';
                                    if (schemeStatus === 'Pending Approval') { badgeColor = '#B87A00'; badgeBg = '#FFF8E5'; }
                                    if (schemeStatus === 'Needs Revision') { badgeColor = '#C0392B'; badgeBg = '#FEF0EF'; }
                                    const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                                    const cls = (t.assignedClasses && t.assignedClasses.length) ? t.assignedClasses : ['—'];
                                    return `
                                    <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                        <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${t.name}</td>
                                        <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${subj}</td>
                                        <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${cls.join(', ')}</td>
                                        <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 700;">${planCount}</td>
                                        <td style="padding: 1.25rem 0.5rem; text-align: right;">
                                            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                                ${schemeStatus}
                                            </span>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <!-- Right Side: Sidebar Calendar & Announcements -->
            <div>
                <!-- Announcement Board -->
                <div style="background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-ultra) 100%); color: white; padding: 2rem; border-radius: 20px; box-shadow: var(--shadow); margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                        Portal Broadcast
                    </h3>
                    <div style="background: rgba(255,255,255,0.1); padding: 1.25rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); margin-bottom: 1.25rem;">
                        <div style="font-size: 0.8rem; font-weight: 700; opacity: 0.8; text-transform: uppercase;">Latest Memo: Term Reviews</div>
                        <p style="font-size: 0.875rem; line-height: 1.5; margin: 0.5rem 0 0 0;">All Subject Heads must submit final lesson plan completion reports by Friday, 4 PM.</p>
                    </div>
                    <button onclick="Router.go('principal-settings')" style="width: 100%; border: none; outline: none; background: white; color: var(--maroon); padding: 0.75rem; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s ease;">
                        Write School Announcement
                    </button>
                </div>

                <!-- Academic Events List -->
                <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1.5rem 0;">Upcoming Academic Events</h3>
                    
                    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                        <div style="display: flex; gap: 1rem; align-items: flex-start; border-left: 3px solid #1A6FA8; padding-left: 0.75rem;">
                            <div style="background: #E8F3FB; color: #1A6FA8; padding: 0.5rem; border-radius: 8px; text-align: center; min-width: 50px;">
                                <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">June</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">02</div>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Midterm Exams Review</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Board of Academics evaluation</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 1rem; align-items: flex-start; border-left: 3px solid #2D9B6F; padding-left: 0.75rem;">
                            <div style="background: #E8F7F1; color: #2D9B6F; padding: 0.5rem; border-radius: 8px; text-align: center; min-width: 50px;">
                                <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">June</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">10</div>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">SS3 Mock Grading</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Deadline for teacher result entries</p>
                            </div>
                        </div>

                        <div style="display: flex; gap: 1rem; align-items: flex-start; border-left: 3px solid #B87A00; padding-left: 0.75rem;">
                            <div style="background: #FFF8E5; color: #B87A00; padding: 0.5rem; border-radius: 8px; text-align: center; min-width: 50px;">
                                <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">June</div>
                                <div style="font-size: 1.15rem; font-weight: 800;">18</div>
                            </div>
                            <div>
                                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Open Day Presentation</h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">Parent-Teacher Consultations</p>
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
   TEACHER SUPERVISION PORTAL
   ============================================= */
async function renderTeacherSupervision() {
    const data = await loadPrincipalData();
    const teachers = data.teachers, lessonPlans = data.lessonPlans, schemes = data.schemes;
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Academic Staff Supervision</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Inspect Schemes of Work, lesson plan counts, and classroom registers across junior and senior school departments.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">Teacher Curriculum Performance</h3>
                <div style="display: flex; gap: 0.75rem;">
                    <input type="text" placeholder="Search teacher or subject..." style="padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; width: 250px;" />
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">ID</th>
                            <th style="padding: 1rem 0.5rem;">Instructor</th>
                            <th style="padding: 1rem 0.5rem;">Departmental Focus</th>
                            <th style="padding: 1rem 0.5rem;">Assigned Classes</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Lesson Plans Checked</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Curriculum Status</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers.map(t => {
                            const teacherPlans = lessonPlans.filter(lp => lp.createdBy === t.id);
                            const teacherSchemes = schemes.filter(s => s.createdBy === t.id);
                            const planCount = teacherPlans.length;
                            const schemeStatus = teacherSchemes.length > 3 ? 'Approved' : teacherSchemes.length > 0 ? 'Pending Approval' : 'Pending Approval';
                            let badgeColor = '#2D9B6F';
                            let badgeBg = '#E8F7F1';
                            if (schemeStatus === 'Pending Approval') { badgeColor = '#B87A00'; badgeBg = '#FFF8E5'; }
                            if (schemeStatus === 'Needs Revision') { badgeColor = '#C0392B'; badgeBg = '#FEF0EF'; }
                            const subj = (t.assignedSubjects && t.assignedSubjects[0]) || '—';
                            const cls = (t.assignedClasses && t.assignedClasses.length) ? t.assignedClasses : ['—'];
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 600; color: var(--text-muted);">${t.id || t.teacherId || '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${t.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${subj}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${cls.join(', ')}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 700;">${planCount} / 6</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;">
                                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                        ${schemeStatus}
                                    </span>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;">
                                    <button onclick="toggleTeacherOverlay('${jsEsc(t.name)}', '${jsEsc(subj)}', '${jsEsc(schemeStatus)}')" class="btn-primary" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: var(--maroon); color: white; border: none; cursor: pointer;">
                                        Inspect Plans
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

    UI.buildPortal('principal-teachers', contentHtml);
}

/* =============================================
   STUDENT PERFORMANCE LIST
   ============================================= */
async function renderStudentPerformance() {
    const data = await loadPrincipalData();
    const students = data.students, results = data.results;
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Student Academic Records</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Inspect grades, general term performances, class levels, and student academic behaviors.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">All Registered Students</h3>
                <input type="text" placeholder="Filter by student name..." style="padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; width: 250px;" />
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">Student ID</th>
                            <th style="padding: 1rem 0.5rem;">Full Name</th>
                            <th style="padding: 1rem 0.5rem;">Class Level</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Average Grade Score</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Attendance Record</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Behavior Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            const studentResults = results.filter(r => r.studentId === s.id || r.student === s.name);
                            const avgScore = studentResults.length
                              ? (studentResults.reduce((sum, r) => sum + (Number(r.score) || Number(r.objectiveScore) + Number(r.theoryScore || 0) || 0), 0) / studentResults.length)
                              : null;
                            let gradeColor = '#2D9B6F';
                            if (avgScore !== null && avgScore < 75) gradeColor = '#B87A00';
                            if (avgScore !== null && avgScore < 60) gradeColor = '#C0392B';
                            const displayScore = avgScore !== null ? avgScore.toFixed(1) + '%' : '—';
                            return `
                            <tr style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 600; color: var(--text-muted);">${s.studentId || s.id || '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${s.name}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${s.class || '—'}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; font-weight: 800; color: ${gradeColor};">${displayScore}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center; color: var(--text-secondary);">—</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right; font-weight: 600; color: var(--text-primary);">—</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('principal-students', contentHtml);
}

/* =============================================
   ACADEMIC REPORTS PORTAL (SIGN & APPROVE)
   ============================================= */
async function renderAcademicReports() {
    const data = await loadPrincipalData();
    const midtermResults = data.midterms, results = data.results;
    const reports = midtermResults.length
        ? midtermResults.map(r => ({
            id: r.id,
            title: `Midterm Report - ${r.studentName || r.studentId || 'Student'}`,
            compiler: r.teacherName || '—',
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—',
            status: r.approved ? 'Approved' : 'Pending Review'
        }))
        : results.length
        ? results.slice(0, 10).map(r => ({
            id: r.id,
            title: `Term Result - ${r.student || r.studentId || 'Student'}`,
            compiler: 'Class Teacher',
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—',
            status: r.approved ? 'Approved' : (r.score ? 'Pending Review' : 'Draft')
        }))
        : [];
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
        
        <div style="margin-bottom: 2rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Academic Report Approvals</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Inspect midterm assessments, departmental aggregates, and terminal grade packages. Approved reports publish immediately to student and parent dashboards.</p>
        </div>

        <div style="background: var(--bg-card); border-radius: 18px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--maroon); margin: 0;">Term Results Packages</h3>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                            <th style="padding: 1rem 0.5rem;">Package Code</th>
                            <th style="padding: 1rem 0.5rem;">Report Title</th>
                            <th style="padding: 1rem 0.5rem;">Compiler</th>
                            <th style="padding: 1rem 0.5rem;">Submitted Date</th>
                            <th style="padding: 1rem 0.5rem; text-align: center;">Status</th>
                            <th style="padding: 1rem 0.5rem; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="reports-table-body">
                        ${reports.length ? reports.map(r => {
                            let badgeColor = '#B87A00';
                            let badgeBg = '#FFF8E5';
                            if (r.status === 'Approved') { badgeColor = '#2D9B6F'; badgeBg = '#E8F7F1'; }
                            return `
                            <tr id="row-${r.id}" style="border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                                <td style="padding: 1.25rem 0.5rem; font-weight: 600; color: var(--text-muted);">${r.id}</td>
                                <td style="padding: 1.25rem 0.5rem; font-weight: 700; color: var(--text-primary);">${r.title}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-secondary);">${r.compiler}</td>
                                <td style="padding: 1.25rem 0.5rem; color: var(--text-muted);">${r.date}</td>
                                <td style="padding: 1.25rem 0.5rem; text-align: center;" class="status-cell">
                                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                                        ${r.status}
                                    </span>
                                </td>
                                <td style="padding: 1.25rem 0.5rem; text-align: right;" class="action-cell">
                                    ${r.status === 'Pending Review' ? `
                                    <button onclick="approveReport('${r.id}')" class="btn-success" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; background: #2D9B6F; color: white; border: none; cursor: pointer; font-weight: 600;">
                                        Approve Report
                                    </button>
                                    ` : `
                                    <span style="font-size: 0.85rem; color: #2D9B6F; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Signed
                                    </span>
                                    `}
                                </td>
                            </tr>
                            `;
                        }).join('') : `
                        <tr>
                            <td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-muted);">No reports found. Submit exam results to generate report packages.</td>
                        </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    `;

    UI.buildPortal('principal-reports', contentHtml);
}

/* =============================================
   SETTINGS & GENERAL MEMO WRITER
   ============================================= */
function renderPrincipalSettings() {
    const contentHtml = `
    <div class="page" style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
        
        <div style="margin-bottom: 2.5rem;">
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--maroon); margin: 0;">Portal Configurations</h1>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Adjust academic preferences, post global announcements, and review your profile details.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 2.5rem;">
            
            <!-- Announcement Board Composer -->
            <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 0.5rem 0;">Publish Portal Broadcast</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.5rem 0;">Write a memo that will instantly appear on all Student, Teacher, and HOD dashboards.</p>
                
                <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div>
                        <label style="display: block; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.5rem;">Memo Title</label>
                        <input id="memo-title" type="text" placeholder="e.g. Mandatory Staff General Meeting" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem; outline: none;" />
                    </div>

                    <div>
                        <label style="display: block; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.5rem;">Announcement Content</label>
                        <textarea id="memo-content" rows="4" placeholder="Type school notification details..." style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem; font-family: inherit; outline: none; resize: vertical;"></textarea>
                    </div>

                    <div>
                        <button onclick="publishBroadcast()" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; background: var(--maroon); color: white; border: none; cursor: pointer; width: 100%;">
                            Publish Broadcast Announcement
                        </button>
                    </div>
                </div>
            </div>

            <!-- Profile Settings -->
            <div style="background: var(--bg-card); padding: 2rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow);">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1.5rem 0;">Principal Profile Information</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Full Name</label>
                        <input type="text" value="Rev. Dr. Joshua Adebayo" disabled style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card2); color: var(--text-secondary); cursor: not-allowed;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Portal Account Email</label>
                        <input type="text" value="principal@yems.local" disabled style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card2); color: var(--text-secondary); cursor: not-allowed;" />
                    </div>
                </div>
            </div>

        </div>

    </div>
    `;

    UI.buildPortal('principal-settings', contentHtml);
}

/* =============================================
   INTERACTION FUNCTIONS & DOM OVERLAYS
   ============================================= */

// Approve report from homepage and toast
window.approveReportDirect = function(id) {
    UI.toast(`Academic Report ${id} has been signed and approved successfully!`, 'success');
    setTimeout(() => {
        Router.go('principal-reports');
    }, 800);
};

// Approve report inside academic report tab
window.approveReport = function(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) {
        const statusCell = row.querySelector('.status-cell');
        const actionCell = row.querySelector('.action-cell');
        
        if (statusCell && actionCell) {
            statusCell.innerHTML = `
                <span style="background: #E8F7F1; color: #2D9B6F; padding: 0.35rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.75rem;">
                    Approved
                </span>
            `;
            actionCell.innerHTML = `
                <span style="font-size: 0.85rem; color: #2D9B6F; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Signed
                </span>
            `;
            UI.toast(`Package ${id} has been published immediately!`, 'success');
        }
    }
};

// Global broadcast publication
window.publishBroadcast = function() {
    const title = document.getElementById('memo-title').value.trim();
    const content = document.getElementById('memo-content').value.trim();

    if (!title || !content) {
        UI.toast('Please input a complete memo title and announcement content.', 'warning');
        return;
    }

    UI.toast('Broadcast announcement published globally!', 'success');
    document.getElementById('memo-title').value = '';
    document.getElementById('memo-content').value = '';
    
    setTimeout(() => {
        Router.go('principal-home');
    }, 1000);
};

// Inspector overlay modal for Teacher lesson plans
window.toggleTeacherOverlay = function(name, subject, schemes) {
    const modalId = 'teacher-inspect-modal';
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
        <div style="background: var(--bg-card); padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow-lg); max-width: 550px; width: 100%; position: relative;">
            <button onclick="document.getElementById('${modalId}').remove()" style="position: absolute; top: 1.25rem; right: 1.25rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
            <h3 id="modal-title" style="font-size: 1.25rem; font-weight: 800; color: var(--maroon); margin: 0 0 1.5rem 0;">Lesson Plan Inspector</h3>
            
            <div style="background: var(--bg-card2); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 1.5rem;">
                <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">INSTRUCTOR</div>
                <div id="modal-teacher-name" style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">Mrs. Abigail Mensah</div>
                
                <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">SUBJECT</div>
                        <div id="modal-teacher-subject" style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">Mathematics</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">CURRICULUM STATUS</div>
                        <div id="modal-teacher-status" style="font-size: 1rem; font-weight: 700; color: #2D9B6F; margin-top: 0.15rem;">Approved</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">Week 1: Quadratic Equations</span>
                    <span style="font-size: 0.8rem; color: #2D9B6F; font-weight: 700;">Completed</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">Week 2: Algebraic Fractions</span>
                    <span style="font-size: 0.8rem; color: #2D9B6F; font-weight: 700;">Completed</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">Week 3: Logarithms & Indices</span>
                    <span style="font-size: 0.8rem; color: #2D9B6F; font-weight: 700;">Completed</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">Week 4: Circle Geometry & Theorems</span>
                    <span style="font-size: 0.8rem; color: #B87A00; font-weight: 700;">In Progress</span>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="document.getElementById('${modalId}').remove()" style="padding: 0.6rem 1.2rem; border-radius: 8px; border: 1px solid var(--border); background: none; font-weight: 600; cursor: pointer; color: var(--text-primary);">Close</button>
                <button onclick="schemesApprovedAction()" style="padding: 0.6rem 1.2rem; border-radius: 8px; background: var(--maroon); border: none; font-weight: 700; color: white; cursor: pointer;">Sign Weekly Logs</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('modal-teacher-name').textContent = name;
    document.getElementById('modal-teacher-subject').textContent = subject;
    document.getElementById('modal-teacher-status').textContent = schemes;
    
    window.schemesApprovedAction = function() {
        UI.toast(`Successfully signed teaching logs for ${name}!`, 'success');
        modal.remove();
    };
};
