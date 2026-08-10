/* =============================================
   ASSIGNMENT QUIZ & THEORY PAGES
   ============================================= */

// Register routes
Router.register('assignment-quiz', renderAssignmentQuiz);
Router.register('assignment-theory', renderAssignmentTheory);

function renderAssignmentQuiz() {
  try {
    if (!Auth.guard()) {
      UI.toast('Please login first', 'error');
      Router.go('login');
      return;
    }
    
    const user = Auth.current();
    const assignId = sessionStorage.getItem('currentAssignmentQuiz');
    
    if (!assignId) {
      UI.toast('No assignment selected', 'error');
      Router.go('assign');
      return;
    }
    
    const assignments = getAssignments();
    const assignment = assignments.find(a => a.id === assignId);
    
    if (!assignment) {
      UI.toast('Assignment not found', 'error');
      Router.go('assign');
      return;
    }
    
    if (assignment.type !== 'mcq' && assignment.format !== 'mcq') {
      UI.toast('This is not an MCQ assignment', 'error');
      Router.go('assign');
      return;
    }
    
    const questions = assignment.questionsList || [];
    if (!questions || questions.length === 0) {
      UI.toast('No questions in this assignment', 'error');
      Router.go('assign');
      return;
    }
    
    if (isExamLocked(assignId, user.id)) {
      UI.toast('You have already submitted this assignment! You cannot re-enter.', 'error');
      Router.go('assign');
      return;
    }
    
    console.log('Assignment Quiz:', assignment);
    console.log('Questions:', questions);
    
    const content = `
    <div class="exam-session-page" style="padding:0; max-width:none;">
      <div style="position:sticky; top:0; z-index:100; background:var(--bg); border-bottom:1px solid var(--border); padding:1rem 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div style="flex:1; min-width:200px;">
          <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin:0;">${assignment.title}</h2>
          <p style="font-size:0.875rem; color:var(--text-secondary); margin:0.25rem 0 0 0;">${assignment.subject} | ${questions.length} Questions</p>
        </div>
        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
          <button onclick="submitAssignmentQuiz()" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px; font-weight:700; white-space:nowrap;">
            <i class="fas fa-paper-plane"></i> Submit
          </button>
        </div>
      </div>

      <div style="padding:2rem; max-width:900px; margin:0 auto;">
        ${questions.map((q, idx) => `
          <div class="theory-question-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; margin-bottom:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1.5rem;">
              <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <span style="width:48px; height:48px; background:var(--maroon); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.25rem; flex-shrink:0;">Q${idx + 1}</span>
                <div style="flex:1; min-width:200px;">
                  <p style="font-size:1.05rem; font-weight:600; color:var(--text-primary); margin:0; line-height:1.5;">${q.text || q.question}</p>
                </div>
              </div>
            </div>
            <div class="mcq-options-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              ${q.options.map((opt, oIdx) => `
                <label class="mcq-option-btn" data-q="${idx}" data-opt="${oIdx}" style="display:flex; align-items:center; padding:1.25rem 1.5rem; border-radius:12px; border:2px solid var(--border); cursor:pointer; transition:all 0.2s; background:white;">
                  <span class="opt-letter" style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; background:#7B1D3C; color:white; font-weight:900; font-size:1.25rem; border-radius:10px; margin-right:1rem;">${String.fromCharCode(65 + oIdx)}</span>
                  <span class="opt-text" style="flex:1; font-size:1rem; font-weight:500;">${opt}</span>
                  <input type="radio" name="aq${idx}" value="${oIdx}" style="display:none;">
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}

        <div style="display:flex; justify-content:center; margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border);">
          <button onclick="submitAssignmentQuiz()" class="btn btn-primary" style="padding:1rem 3rem; border-radius:12px; font-weight:800; font-size:1.125rem;">
            <i class="fas fa-check-circle"></i> SUBMIT ASSIGNMENT
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = content;
  window.currentAssignmentQuiz = assignment;
  
  } catch (error) {
    console.error('Error in renderAssignmentQuiz:', error);
    UI.toast('Error loading assignment: ' + error.message, 'error');
    Router.go('assign');
  }
}

window.submitAssignmentQuiz = async function() {
  if (window._submittingExam) return;
  if (!confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;
  
  window._submittingExam = true;
  
  // Disable all submit buttons
  document.querySelectorAll('[onclick="submitAssignmentQuiz()"]').forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spinner-spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span> Submitting...';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });

  try {
    const user = Auth.current();
    const assignment = window.currentAssignmentQuiz;
    if (!assignment) return;
    
    // Set localStorage lockout flag IMMEDIATELY
    const lockoutKey = `yems_exam_locked_${assignment.id}_${user?.id || 'unknown'}`;
    localStorage.setItem(lockoutKey, JSON.stringify({
      lockedAt: new Date().toISOString(),
      examId: assignment.id,
      studentId: user?.id
    }));
    
    const questions = assignment.questionsList || [];
    const answers = [];
    let score = 0;
    
    questions.forEach((q, idx) => {
      const selected = document.querySelector(`input[name="aq${idx}"]:checked`);
      const userAnswer = selected ? parseInt(selected.value) : -1;
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) score++;
      
      answers.push({
        questionId: q.id || idx,
        userAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: isCorrect
      });
    });
    
    await addSubmission({
      assignmentId: assignment.id,
      studentId: user.id,
      answers: {
        type: 'assignment-mcq',
        responses: answers,
        score: Math.round((score / questions.length) * 100),
        totalQuestions: questions.length,
        correctAnswers: score
      }
    });
    
    UI.toast('Assignment submitted! Score: ' + Math.round((score / questions.length) * 100) + '%', 'success');
    Router.go('assign');
    
  } catch (error) {
    if (error.status === 409) {
      UI.toast('You have already submitted this assignment.', 'warning');
      Router.go('assign');
    } else {
      UI.toast('Failed to submit: ' + error.message, 'error');
      document.querySelectorAll('[onclick="submitAssignmentQuiz()"]').forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
        btn.style.opacity = '';
        btn.style.cursor = '';
      });
    }
  } finally {
    window._submittingExam = false;
  }
};

function renderAssignmentTheory() {
  try {
    if (!Auth.guard()) {
      UI.toast('Please login first', 'error');
      Router.go('login');
      return;
    }
    
    const user = Auth.current();
    const assignId = sessionStorage.getItem('currentAssignmentTheory');
    
    if (!assignId) {
      UI.toast('No assignment selected', 'error');
      Router.go('assign');
      return;
    }
    
    const assignments = getAssignments();
    const assignment = assignments.find(a => a.id === assignId);
    
    if (!assignment) {
      UI.toast('Assignment not found', 'error');
      Router.go('assign');
      return;
    }
    
    if (assignment.type !== 'theory' && assignment.format !== 'theory') {
      UI.toast('This is not a theory assignment', 'error');
      Router.go('assign');
      return;
    }
    
    const questions = assignment.questionsList || [];
    if (isExamLocked(assignId, user.id)) {
      UI.toast('You have already submitted this assignment! You cannot re-enter.', 'error');
      Router.go('assign');
      return;
    }
    
    console.log('Assignment Theory:', assignment);
    console.log('Questions:', questions);
    console.log('Has file:', !!assignment.fileData);
    
    const content = `
    <div class="exam-session-page" style="padding:0; max-width:none;">
      <div style="position:sticky; top:0; z-index:100; background:var(--bg); border-bottom:1px solid var(--border); padding:1rem 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div style="flex:1; min-width:200px;">
          <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin:0;">${assignment.title}</h2>
          <p style="font-size:0.875rem; color:var(--text-secondary); margin:0.25rem 0 0 0;">${assignment.subject} | ${questions.length} Questions</p>
        </div>
        <button onclick="submitAssignmentTheory()" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px; font-weight:700; white-space:nowrap;">
          <i class="fas fa-paper-plane"></i> Submit
        </button>
      </div>

      <div style="padding:2rem; max-width:900px; margin:0 auto;">
        ${questions.length > 0 ? questions.map((q, idx) => `
          <div class="theory-question-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:2rem; margin-bottom:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1.5rem;">
              <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                <span style="width:48px; height:48px; background:var(--maroon); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.25rem; flex-shrink:0;">Q${idx + 1}</span>
                <div style="flex:1; min-width:200px;">
                  <p style="font-size:1.05rem; font-weight:600; color:var(--text-primary); margin:0; line-height:1.5;">${q.text || q.question || 'No question text'}</p>
                  ${q.marks ? `<span style="font-size:0.75rem; color:var(--text-muted);">Marks: ${q.marks}</span>` : ''}
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
        `).join('') : '<div style="text-align:center; padding:3rem; color:var(--text-muted); background:var(--bg-card); border-radius:16px; margin-bottom:1.5rem;"><p style="font-size:1.25rem; font-weight:600; margin-bottom:0.5rem;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> File Upload Assignment</p><p>Please upload your answer file below.</p></div>'}

        ${assignment.fileData ? `
          <div style="background:var(--bg-card2); border:1px solid var(--border); border-radius:16px; padding:1.5rem; margin-bottom:1.5rem;">
            <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin:0 0 1rem 0;"><svg class="icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Question Paper</h3>
            <div style="background:white; border-radius:8px; padding:1rem; text-align:center;">
              <p style="color:var(--text-secondary); margin-bottom:1rem;">${assignment.fileName || 'Download the question paper'}</p>
              ${assignment.fileData.startsWith('data:') ? `<a href="${assignment.fileData}" download="${assignment.fileName || 'question.pdf'}" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px;"><i class="fas fa-download"></i> Download</a>` : '<p style="color:var(--text-muted); font-size:0.875rem;">File uploaded by teacher</p>'}
            </div>
          </div>
        ` : ''}

        <div style="display:flex; justify-content:center; margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border);">
          <button onclick="submitAssignmentTheory()" class="btn btn-primary" style="padding:1rem 3rem; border-radius:12px; font-weight:800; font-size:1.125rem;">
            <i class="fas fa-check-circle"></i> SUBMIT ASSIGNMENT
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = content;
  window.currentAssignmentTheory = assignment;
  
  } catch (error) {
    console.error('Error in renderAssignmentTheory:', error);
    UI.toast('Error loading assignment: ' + error.message, 'error');
    Router.go('assign');
  }
}

window.submitAssignmentTheory = async function() {
  if (window._submittingExam) return;
  if (!confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;
  
  window._submittingExam = true;
  
  // Disable all submit buttons
  document.querySelectorAll('[onclick="submitAssignmentTheory()"]').forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spinner-spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span> Submitting...';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });

  try {
    const user = Auth.current();
    const assignment = window.currentAssignmentTheory;
    if (!assignment) return;
    
    // Set localStorage lockout flag IMMEDIATELY
    const lockoutKey = `yems_exam_locked_${assignment.id}_${user?.id || 'unknown'}`;
    localStorage.setItem(lockoutKey, JSON.stringify({
      lockedAt: new Date().toISOString(),
      examId: assignment.id,
      studentId: user?.id
    }));
    
    const answers = [];
    document.querySelectorAll('.theory-answer-input').forEach(textarea => {
      answers.push({ questionId: textarea.dataset.question, answer: textarea.value });
    });
    
    await addSubmission({
      assignmentId: assignment.id,
      studentId: user.id,
      answers: {
        type: 'assignment-theory',
        responses: answers
      }
    });
    
    UI.toast('Assignment submitted successfully!', 'success');
    Router.go('assign');
    
  } catch (error) {
    if (error.status === 409) {
      UI.toast('You have already submitted this assignment.', 'warning');
      Router.go('assign');
    } else {
      UI.toast('Failed to submit: ' + error.message, 'error');
      document.querySelectorAll('[onclick="submitAssignmentTheory()"]').forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> SUBMIT ASSIGNMENT';
        btn.style.opacity = '';
        btn.style.cursor = '';
      });
    }
  } finally {
    window._submittingExam = false;
  }
};
