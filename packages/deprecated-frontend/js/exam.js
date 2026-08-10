/**
 * ExamPro – Exam Engine
 */

const ExamEngine = (() => {
  let state = {
    exam: null,
    answers: {},    // questionIndex -> optionIndex
    flagged: {},    // questionIndex -> bool
    currentQ: 0,
    timerInterval: null,
    secondsLeft: 0,
    startTime: null,
    submitted: false
  };

  function start(examId) {
    const exam = getExamById(examId);
    if (!exam) return false;
    state = {
      exam,
      answers: {},
      flagged: {},
      currentQ: 0,
      timerInterval: null,
      secondsLeft: exam.duration * 60,
      startTime: Date.now(),
      submitted: false
    };
    return true;
  }

  function getState() { return { ...state }; }
  function getExam() { return state.exam; }
  function getCurrentQuestion() { return state.exam ? state.exam.questions[state.currentQ] : null; }
  function getTotalQuestions() { return state.exam ? state.exam.questions.length : 0; }

  function selectAnswer(qIndex, optionIndex) {
    if (state.submitted) return;
    state.answers[qIndex] = optionIndex;
  }

  function toggleFlag(qIndex) {
    if (state.submitted) return;
    state.flagged[qIndex] = !state.flagged[qIndex];
  }

  function goToQuestion(index) {
    if (index >= 0 && index < getTotalQuestions()) {
      state.currentQ = index;
    }
  }

  function next() { goToQuestion(state.currentQ + 1); }
  function prev() { goToQuestion(state.currentQ - 1); }

  function getAnsweredCount() { return Object.keys(state.answers).length; }
  function getFlaggedCount()  { return Object.values(state.flagged).filter(Boolean).length; }

  function startTimer(onTick, onExpire) {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.secondsLeft--;
      if (typeof onTick === 'function') onTick(state.secondsLeft);
      if (state.secondsLeft <= 0) {
        clearInterval(state.timerInterval);
        if (typeof onExpire === 'function') onExpire();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function calculateResults() {
    const exam = state.exam;
    if (!exam) return null;
    let score = 0;
    let totalPoints = 0;
    const details = exam.questions.map((q, i) => {
      totalPoints += q.points;
      const userAnswer = state.answers[i];
      const isCorrect = userAnswer !== undefined && userAnswer === q.correct;
      if (isCorrect) score += q.points;
      return {
        questionIndex: i,
        questionText: q.text,
        options: q.options,
        correctAnswer: q.correct,
        userAnswer: userAnswer !== undefined ? userAnswer : null,
        isCorrect,
        explanation: q.explanation,
        points: q.points
      };
    });

    const percentage = Math.round((score / totalPoints) * 100);
    const passed = percentage >= exam.passingScore;
    const timeTaken = Math.round((Date.now() - state.startTime) / 1000);

    return {
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      score,
      totalPoints,
      percentage,
      passed,
      answeredCount: getAnsweredCount(),
      totalQuestions: getTotalQuestions(),
      timeTaken,
      details,
      grade: getGrade(percentage),
      date: new Date().toISOString()
    };
  }

  function getGrade(pct) {
    if (pct >= 90) return { letter: 'A+', label: 'Outstanding!', color: 'var(--success)' };
    if (pct >= 80) return { letter: 'A',  label: 'Excellent!',   color: 'var(--success)' };
    if (pct >= 70) return { letter: 'B',  label: 'Very Good!',   color: 'var(--primary)' };
    if (pct >= 60) return { letter: 'C',  label: 'Good',         color: 'var(--accent)' };
    if (pct >= 50) return { letter: 'D',  label: 'Pass',         color: 'var(--warning)' };
    return { letter: 'F', label: 'Failed', color: 'var(--danger)' };
  }

  function submit() {
    state.submitted = true;
    stopTimer();
    const results = calculateResults();
    // Save to history
    const user = Auth.current();
    if (user) {
      const allResults = getResults();
      allResults.push({ userId: user.id, ...results });
      saveResults(allResults);
    }
    return results;
  }

  function reset() {
    stopTimer();
    state = {
      exam: null, answers: {}, flagged: {}, currentQ: 0,
      timerInterval: null, secondsLeft: 0, startTime: null, submitted: false
    };
  }

  return {
    start, getState, getExam, getCurrentQuestion, getTotalQuestions,
    selectAnswer, toggleFlag, goToQuestion, next, prev,
    getAnsweredCount, getFlaggedCount,
    startTimer, stopTimer, formatTime,
    calculateResults, submit, reset, getGrade
  };
})();
