/* =============================================
   GRADE-ALL.JS - Centralized Grading Interface
   ============================================= */

(function boot() {
    UI.initTheme();

    const user = Auth.current();
    if (!user || user.role !== 'teacher') {
        window.location.href = 'index.html#login';
        return;
    }

    Router.register('grade-all-home', renderGradeAllHome);
    Router.init();

    if (!window.location.hash) Router.go('grade-all-home');
})();

function renderGradeAllHome() {
    if (!Auth.guard()) return;
    const user = Auth.current();
    
    const exams = getExams();
    const assignments = getAssignments();
    const submissions = getSubmissions();
    const assignmentSubmissions = submissions.filter(s => s.assignmentId && s.assignmentId !== s.examId);
    
    // Get all pending grading items
    const pendingTheory = submissions.filter(s => {
        const exam = exams.find(e => e.id === s.examId);
        return exam?.format === 'theory' && (s.score === null || s.score === undefined);
    });
    
    const pendingAssignments = assignmentSubmissions.filter(s => {
        const assignment = assignments.find(a => a.id === s.assignmentId);
        return assignment?.type === 'theory' && !s.graded;
    });
    
    const pendingMCQ = submissions.filter(s => s.score === null && s.examId);
    
    const allPending = [
        ...pendingTheory.map(s => ({ ...s, type: 'theory_exam' })),
        ...pendingAssignments.map(s => ({ ...s, type: 'theory_assignment' })),
        ...pendingMCQ.map(s => ({ ...s, type: 'mcq_exam' }))
    ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    const content = `
    <div style="padding: 2rem; max-width: 1400px; margin: 0 auto;">
      <!-- Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="padding: 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #B45309 0%, #D97706 100%); color: white; box-shadow: var(--shadow);">
          <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Theory Exams</div>
          <div style="font-size: 2rem; font-weight: 800;">${pendingTheory.length}</div>
          <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Pending Grading</div>
        </div>
        <div style="padding: 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #7B1D3C 0%, #9B2D54 100%); color: white; box-shadow: var(--shadow);">
          <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Theory Assignments</div>
          <div style="font-size: 2rem; font-weight: 800;">${pendingAssignments.length}</div>
          <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Pending Grading</div>
        </div>
        <div style="padding: 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; box-shadow: var(--shadow);">
          <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> MCQ Exams</div>
          <div style="font-size: 2rem; font-weight: 800;">${pendingMCQ.length}</div>
          <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Auto-graded</div>
        </div>
        <div style="padding: 1.5rem; border-radius: 16px; background: linear-gradient(135deg, #2D9B6F 0%, #4ADE80 100%); color: white; box-shadow: var(--shadow);">
          <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Total Pending</div>
          <div style="font-size: 2rem; font-weight: 800;">${allPending.length}</div>
          <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">Submissions</div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="filterGradeAll('all')" style="border-radius: 20px;">All (${allPending.length})</button>
        <button class="btn btn-ghost" onclick="filterGradeAll('theory_exam')" style="border-radius: 20px; border: 2px solid #B45309; color: #B45309;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Theory Exams (${pendingTheory.length})</button>
        <button class="btn btn-ghost" onclick="filterGradeAll('theory_assignment')" style="border-radius: 20px; border: 2px solid #7B1D3C; color: #7B1D3C;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Assignments (${pendingAssignments.length})</button>
        <button class="btn btn-ghost" onclick="filterGradeAll('mcq_exam')" style="border-radius: 20px; border: 2px solid #1E90FF; color: #1E90FF;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> MCQ (${pendingMCQ.length})</button>
      </div>

      <!-- Submissions List -->
      <div class="section-card" style="padding: 0;">
        <div style="padding: 1.5rem 2rem; border-bottom: 1px solid var(--border);">
          <h3 style="font-size: 1.1rem; font-weight: 800; margin: 0;">All Submissions</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="teacher-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 1rem;">Student</th>
                <th style="text-align: left; padding: 1rem;">Type</th>
                <th style="text-align: left; padding: 1rem;">Title</th>
                <th style="text-align: left; padding: 1rem;">Subject</th>
                <th style="text-align: left; padding: 1rem;">Submitted</th>
                <th style="text-align: left; padding: 1rem;">Status</th>
                <th style="text-align: left; padding: 1rem;">Actions</th>
              </tr>
            </thead>
            <tbody id="grade-all-table">
              ${allPending.length === 0 ? '<tr><td colspan="7" style="padding: 3rem; text-align: center; color: var(--text-muted);">No pending submissions! <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></td></tr>' : ''}
              ${allPending.map(item => renderSubmissionRow(item, exams, assignments)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    `;

    document.getElementById('app').innerHTML = content;
}

function renderSubmissionRow(item, exams, assignments) {
    let exam, assignment, title, subject;
    
    if (item.type === 'theory_exam' || item.type === 'mcq_exam') {
        exam = exams.find(e => e.id === item.examId);
        title = exam?.title || 'Unknown Exam';
        subject = exam?.subject || 'N/A';
    } else {
        assignment = assignments.find(a => a.id === item.assignmentId);
        title = assignment?.title || 'Unknown Assignment';
        subject = assignment?.subject || 'N/A';
    }
    
    const typeIcons = {
        'theory_exam': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        'theory_assignment': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        'mcq_exam': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    };
    
    const typeLabels = {
        'theory_exam': 'Theory Exam',
        'theory_assignment': 'Theory Assignment',
        'mcq_exam': 'MCQ Exam'
    };
    
    return `
    <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1E90FF 0%, #00CFFF 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">${item.studentName.charAt(0).toUpperCase()}</div>
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">${item.studentName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${item.studentClass || 'N/A'}</div>
                </div>
            </div>
        </td>
        <td style="padding: 1rem;">
            <span style="padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${item.type === 'mcq_exam' ? 'var(--blue-bg)' : (item.type === 'theory_exam' ? 'var(--warning-bg)' : 'var(--maroon-bg)')}; color: ${item.type === 'mcq_exam' ? 'var(--blue)' : (item.type === 'theory_exam' ? 'var(--warning)' : 'var(--maroon)')};">
                ${typeIcons[item.type]} ${typeLabels[item.type]}
            </span>
        </td>
        <td style="padding: 1rem; font-weight: 600; color: var(--text-primary);">${title}</td>
        <td style="padding: 1rem; color: var(--text-secondary);">${subject}</td>
        <td style="padding: 1rem; color: var(--text-secondary); font-size: 0.875rem;">${new Date(item.submittedAt).toLocaleDateString()}</td>
        <td style="padding: 1rem;">
            <span style="padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: ${item.score !== null ? 'var(--success-bg)' : 'var(--warning-bg)'}; color: ${item.score !== null ? 'var(--success)' : 'var(--warning)'};">
                ${item.score !== null ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Graded' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Pending'}
            </span>
        </td>
        <td style="padding: 1rem;">
            <button class="btn btn-primary btn-sm" onclick="openGradingModal('${item.id}', '${item.type}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                ${item.type === 'mcq_exam' ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>️️ View' : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>️️ Grade'}
            </button>
        </td>
    </tr>
    `;
}

window.filterGradeAll = function(type) {
    const exams = getExams();
    const assignments = getAssignments();
    const submissions = getSubmissions();
    const assignmentSubmissions = submissions.filter(s => s.assignmentId && s.assignmentId !== s.examId);
    
    let filtered = [];
    
    if (type === 'all') {
        const pendingTheory = submissions.filter(s => {
            const exam = exams.find(e => e.id === s.examId);
            return exam?.format === 'theory' && (s.score === null || s.score === undefined);
        });
        
        const pendingAssignments = assignmentSubmissions.filter(s => {
            const assignment = assignments.find(a => a.id === s.assignmentId);
            return assignment?.type === 'theory' && !s.graded;
        });
        
        const pendingMCQ = submissions.filter(s => s.score === null && s.examId);
        
        filtered = [
            ...pendingTheory.map(s => ({ ...s, type: 'theory_exam' })),
            ...pendingAssignments.map(s => ({ ...s, type: 'theory_assignment' })),
            ...pendingMCQ.map(s => ({ ...s, type: 'mcq_exam' }))
        ];
    } else {
        if (type === 'theory_exam') {
            filtered = submissions.filter(s => {
                const exam = exams.find(e => e.id === s.examId);
                return exam?.format === 'theory' && (s.score === null || s.score === undefined);
            }).map(s => ({ ...s, type: 'theory_exam' }));
        } else if (type === 'theory_assignment') {
            filtered = assignmentSubmissions.filter(s => {
                const assignment = assignments.find(a => a.id === s.assignmentId);
                return assignment?.type === 'theory' && !s.graded;
            }).map(s => ({ ...s, type: 'theory_assignment' }));
        } else if (type === 'mcq_exam') {
            filtered = submissions.filter(s => s.score === null && s.examId).map(s => ({ ...s, type: 'mcq_exam' }));
        }
    }
    
    filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    const tbody = document.getElementById('grade-all-table');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.length === 0 ? '<tr><td colspan="7" style="padding: 3rem; text-align: center; color: var(--text-muted);">No pending submissions! <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></td></tr>' : filtered.map(item => renderSubmissionRow(item, exams, assignments)).join('');
    
    // Update button styles
    document.querySelectorAll('[onclick^="filterGradeAll"]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
    });
    event.target.classList.remove('btn-ghost');
    event.target.classList.add('btn-primary');
};

window.openGradingModal = function(submissionId, type) {
    if (type === 'mcq_exam') {
        viewSubmissionDetails(submissionId);
        return;
    }
    
    const submissions = getSubmissions();
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
        UI.toast('Submission not found', 'error');
        return;
    }
    
    const exams = getExams();
    const exam = exams.find(e => e.id === submission.examId);
    const questions = exam?.questionsList || [];
    
    let detailsHTML = '<div style="max-height:600px; overflow-y:auto;">';
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
            
            <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <label style="font-size:0.875rem; font-weight:600; color:var(--text-sec);">Marks Awarded:</label>
                <input type="number" id="marks-${q.id}" class="form-input" value="${marksAwarded}" min="0" max="${q.marks || 5}" style="width:80px; text-align:center;" onchange="updateTheoryMarks('${submissionId}', '${q.id}', this.value)" />
                <span style="font-size:0.875rem; color:var(--text-muted);">/ ${q.marks || 5} marks</span>
                <button class="btn btn-primary btn-sm" onclick="updateTheoryMarks('${submissionId}', '${q.id}', ${q.marks || 5})" style="background:#2D9B6F;">Full Marks</button>
                <button class="btn btn-ghost btn-sm" onclick="updateTheoryMarks('${submissionId}', '${q.id}', 0)" style="color:#DC2626;">Zero</button>
            </div>
        </div>
        `;
    });
    
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
    
    detailsHTML += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:900px; max-height:90vh; overflow-y:auto;">
            <div class="modal-header" style="background:#7B1D3C; color:white; padding:1.5rem; border-radius:16px 16px 0 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="color:white; margin:0; font-size:1.25rem;">${submission.studentName}'s Submission</h3>
                        <p style="color:rgba(255,255,255,0.8); margin:0.25rem 0 0 0; font-size:0.875rem;">${exam?.title || 'Unknown Exam'}</p>
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
                        <p style="font-weight:600; color:${submission.score !== null ? 'var(--success)' : 'var(--warning)'}; margin:0.25rem 0 0 0;">${submission.score !== null ? 'Graded' : 'Pending Grading'}</p>
                    </div>
                </div>
                ${detailsHTML}
            </div>
            <div class="modal-footer" style="padding:1.5rem; border-top:1px solid var(--border); display:flex; gap:0.75rem; flex-wrap:wrap;">
                <button class="btn btn-primary" style="background:#2D9B6F; flex:1;" onclick="saveTheoryGrading('${submission.id}', '${exam.id}')">
                    <svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Grading
                </button>
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};
