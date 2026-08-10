/* =============================================
   DATA.JS — Yeshua Educational Platform
   Data Access Layer - API-synced in-memory cache
   ============================================= */

const DATA_KEYS = {
  users: 'yep_users',
  subjects: 'yep_subjects',
  exams: 'yep_exams',
  notes: 'yep_notes',
  assignments: 'yep_assignments',
  results: 'yep_results',
  notifications: 'yep_notifications',
  lessons: 'yep_lessons',
  submissions: 'yep_submissions',
  schemes: 'yep_schemes',
  lessonPlans: 'yep_lesson_plans',
  midtermResults: 'yep_midterm_results',
  reports: 'yep_reports',
  admissions: 'yep_admissions',
  auditLogs: 'yep_audit_logs',
  classes: 'yep_classes'
};

const DATA_CACHE = window.__YEMS_DATA_CACHE || (window.__YEMS_DATA_CACHE = Object.create(null));

function readJson(key, fallback) {
  let value = DATA_CACHE[key];
  if (value === undefined) {
    // Hydrate from localStorage on cache miss
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        value = JSON.parse(stored);
        DATA_CACHE[key] = value;
        return value;
      }
    } catch (e) {
      console.error(`[Data] Failed to read localStorage key "${key}":`, e);
    }
    return fallback;
  }
  return value;
}

function writeJson(key, value) {
  DATA_CACHE[key] = value;
  // Persist to localStorage so data survives page reloads
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
    console.error(`[Data] Failed to write localStorage key "${key}":`, e);
  }
  window.dispatchEvent(new CustomEvent('yems:data-refreshed', { detail: { key, value } }));
}

function formatDisplayDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildDueMeta(dueDate) {
  if (!dueDate) {
    return { dueLabel: 'No due date', dueClass: 'due-later' };
  }
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return { dueLabel: String(dueDate), dueClass: 'due-later' };
  }
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { dueLabel: 'Overdue', dueClass: 'due-overdue' };
  if (diffDays === 0) return { dueLabel: 'Due Today', dueClass: 'due-today' };
  if (diffDays === 1) return { dueLabel: '1 Day Left', dueClass: 'due-day' };
  return { dueLabel: `${diffDays} Days Left`, dueClass: 'due-days' };
}

function buildInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'U';
}

function normalizeUser(user) {
  const role = user.role || user.roles?.[0]?.name || user.roles?.[0] || 'student';
  const name = user.name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return {
    ...user,
    id: user.id || user.userId,
    name,
    initials: user.initials || buildInitials(name),
    role,
    class: user.class || user.className || '',
    session: user.session || '2024/2025',
    term: user.term || 'Second Term',
    isClassTeacher: user.isClassTeacher === true || !!user.classTeacherOf,
    classTeacherOf: user.classTeacherOf || '',
    teacherId: user.teacherId || ''
  };
}

function normalizeExam(exam) {
  const rawList = Array.isArray(exam.questionsList) && exam.questionsList.length
    ? exam.questionsList
    : (Array.isArray(exam.questions) ? exam.questions : []);
  const questionsList = rawList.map(q => ({
    ...q,
    correct: q.correct ?? q.correctIndex ?? q.correctAnswer ?? 0,
    marks: q.marks ?? q.points ?? 1
  }));

  // Map backend 'type' to frontend 'category'
  const typeToCategory = {
    'quiz': 'exam',
    'midterm': 'midterm',
    'final': 'exam',
    'practice': 'exam'
  };

  const questionCount = typeof exam.questionsCount === 'number'
    ? exam.questionsCount
    : (typeof exam.questions === 'number'
      ? exam.questions
      : (Array.isArray(exam.questions) ? exam.questions.length : questionsList.length));

  return {
    ...exam,
    id: exam.id,
    title: exam.title,
    desc: exam.desc || exam.description || '',
    duration: Number(exam.duration || 0),
    questions: questionCount,
    questionsList,
    format: exam.format || (questionsList.some(q => !Array.isArray(q.options) || q.options.length === 0) ? 'theory' : 'mcq'),
    status: exam.status || 'not-started',
    subject: exam.subject || 'General',
    startTime: exam.startTime || null,
    category: exam.category || typeToCategory[exam.type] || 'exam'
  };
}

function normalizeNote(note) {
  return {
    ...note,
    id: note.id,
    subject: note.subject?.name || note.subject || note.subjectId || 'General',
    week: note.week || '--',
    title: note.title || 'Untitled Note',
    desc: note.desc || note.content || '',
    term: note.term || 'Second Term',
    date: note.date || formatDisplayDate(note.createdAt)
  };
}

function normalizeAssignment(assignment) {
  const dueMeta = buildDueMeta(assignment.dueDate);
  return {
    ...assignment,
    id: assignment.id,
    desc: assignment.desc || assignment.description || '',
    dueLabel: assignment.dueLabel || dueMeta.dueLabel,
    dueClass: assignment.dueClass || dueMeta.dueClass,
    est: assignment.est || '1 hour',
    status: assignment.status || 'active'
  };
}

function normalizeResult(result) {
  return {
    ...result,
    id: result.id,
    examTitle: result.examTitle || result.subject || 'Result',
    totalScore: result.totalScore ?? result.totalPoints ?? 100,
    date: result.date || formatDisplayDate(result.createdAt),
    status: result.status || 'published',
    visibleToStudents: result.visibleToStudents !== false
  };
}

function normalizeNotification(notification) {
  return {
    ...notification,
    id: notification.id,
    date: notification.date || formatDisplayDate(notification.createdAt),
    read: Boolean(notification.read)
  };
}

function normalizeLesson(lesson) {
  return {
    ...lesson,
    id: lesson.id,
    subject: lesson.subject || 'General',
    topic: lesson.topic || lesson.title || '',
    time: lesson.time || lesson.schedule || '',
    live: lesson.live ?? true
  };
}

function normalizeSubmission(submission) {
  const users = readJson(DATA_KEYS.users, []);
  const exams = readJson(DATA_KEYS.exams, []);
  const submissionType = submission.answers?.type || '';
  const assignmentId = submission.assignmentId || (submissionType.startsWith('assignment') ? submission.examId : null);
  const examId = submission.examId || submission.assignmentId;
  const student = users.find(user => user.id === submission.studentId);
  const exam = exams.find(item => item.id === (examId || assignmentId));
  const selectedAnswers = submission.answers?.selectedAnswers;
  let normalizedAnswers = Array.isArray(submission.answers)
    ? submission.answers
    : (selectedAnswers && typeof selectedAnswers === 'object'
      ? Object.entries(selectedAnswers)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([, value]) => Number(value))
      : submission.answers);
  // Handle theory exam format: { type: 'theory', responses: [...] }
  if (submission.answers && typeof submission.answers === 'object' && !Array.isArray(submission.answers)) {
    if (submission.answers.responses && Array.isArray(submission.answers.responses)) {
      normalizedAnswers = submission.answers.responses;
    }
  }
  return {
    ...submission,
    id: submission.id,
    examId,
    assignmentId,
    studentName: submission.studentName || student?.name || submission.studentId || 'Unknown',
    studentClass: submission.studentClass || student?.class || '-',
    examTitle: submission.examTitle || exam?.title || '',
    answers: normalizedAnswers,
    answerText: submission.answerText || submission.answers?.answerText || '',
    score: submission.score ?? submission.answers?.score ?? null,
    date: submission.date || formatDisplayDate(submission.submittedAt || submission.createdAt)
  };
}

function normalizeSubjects(subjects) {
  const grouped = { junior: [], senior: { science: [], art: [], commercial: [], general: [] } };
  (Array.isArray(subjects) ? subjects : []).forEach(subject => {
    const entry = subject.name || subject;
    if (subject.category === 'junior') {
      grouped.junior.push(entry);
      return;
    }
    const department = subject.department || 'science';
    if (!grouped.senior[department]) grouped.senior[department] = [];
    grouped.senior[department].push(entry);
  });
  return grouped;
}

async function syncResource(storageKey, fetcher, normalize = data => data) {
  if (!window.API) throw new Error('API client is unavailable');
  const token = (typeof Auth !== 'undefined' && Auth?.getToken) ? Auth.getToken() : window.Auth?.getToken?.();
  if (!token) return [];
  let response;
  try {
    response = await fetcher();
  } catch (error) {
    console.error(`[Sync] Failed to fetch ${storageKey}:`, error?.message || error);
    if (storageKey === DATA_KEYS.exams) {
      const syncState = window.__YEMS_RUNTIME_STATE || (window.__YEMS_RUNTIME_STATE = {});
      if (!syncState.examSyncErrorShown) {
        syncState.examSyncErrorShown = true;
        window.UI?.toast?.(`Unable to load exams/tests: ${error?.message || 'request failed'}`, 'error');
      }
    }
    const cached = readJson(storageKey, []);
    console.error(`[Sync] Using cached data for ${storageKey} (${Array.isArray(cached) ? cached.length : '?'} items) — API failed, serving stale cache`);
    return cached;
  }
  const rawData = response?.data ?? response ?? [];
  try {
    const data = normalize(rawData);
    if (Array.isArray(data) && data.length > 0) {
      writeJson(storageKey, data);
    } else {
      // API returned empty — don't overwrite local data that may have unpersisted items
      const cached = readJson(storageKey, []);
      if (Array.isArray(cached) && cached.length > 0) {
        console.error(`[Sync] API returned empty for ${storageKey}, keeping ${cached.length} cached items — stale data served`);
        return cached;
      }
      writeJson(storageKey, data);
    }
    if (storageKey === DATA_KEYS.exams) {
      const syncState = window.__YEMS_RUNTIME_STATE || (window.__YEMS_RUNTIME_STATE = {});
      syncState.examSyncErrorShown = false;
    }
    return data;
  } catch (err) {
    console.error('[Sync] Normalization failed for', storageKey, ':', err);
    return [];
  }
}

/* ---- User Operations ---- */
function getAppUsers() {
  return readJson(DATA_KEYS.users, []);
}

function saveAppUsers(users) {
  writeJson(DATA_KEYS.users, users);
}

function addAppUser(user) {
  const users = getAppUsers();
  users.push(user);
  saveAppUsers(users);
}

function updateAppUser(userId, updates) {
  const users = getAppUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveAppUsers(users);
  }
}

function deleteAppUser(id) {
  const users = getAppUsers().filter(u => u.id !== id);
  saveAppUsers(users);
}

function getTeachers() {
  return getAppUsers().filter(u => u.role === 'teacher');
}

function getStudents() {
  return getAppUsers().filter(u => u.role === 'student');
}

function getClassTeacher(className) {
  return getAppUsers().find(u => u.role === 'teacher' && u.classTeacherOf === className);
}

/* ---- Notes Operations ---- */
function getNotes() {
  return readJson(DATA_KEYS.notes, []);
}

async function addNote(note, userId = null) {
  const result = await API.notes.create(note);
  if (result.success) {
    // Direct cache save — makes the note visible immediately in the teacher's UI
    const existing = getNotes();
    existing.push(note);
    writeJson(DATA_KEYS.notes, existing);

     const students = getStudents();
     students.forEach(student => {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'note',
         title: 'New Note Added',
         message: `New note: ${note.title} (${note.subject})`,
         noteId: note.id,
         fromUserId: userId,
         toUserId: student.id,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     });
     // Also notify the actor (teacher) about their own action
     if (userId) {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'note',
         title: 'New Note Added',
         message: `You created a new note: ${note.title} (${note.subject})`,
         noteId: note.id,
         fromUserId: userId,
         toUserId: userId,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     }
    // Also sync from API to get normalized data (result.success means API stored it)
    await window.DataSync?.refreshResource('notes').catch(() => {});
  }
  return result.data || result;
}

async function deleteNote(id) {
  await API.notes.delete(id);
  await window.DataSync?.refreshResource('notes').catch(() => {});
}

/* ---- Assignments Operations ---- */
function getAssignments() {
  return readJson(DATA_KEYS.assignments, []);
}

function saveAssignments(assignments) {
  writeJson(DATA_KEYS.assignments, assignments);
}

async function addAssignment(assignment, userId = null) {
  const result = await API.assignments.create(assignment);
  if (result.success && result.data) {
    const existing = getAssignments();
    existing.push(normalizeAssignment(result.data));
    writeJson(DATA_KEYS.assignments, existing);

     const students = getStudents();
     students.forEach(student => {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'assignment',
         title: 'New Assignment',
         message: `New assignment: ${assignment.title} (${assignment.subject})`,
         assignmentId: assignment.id,
         fromUserId: userId,
         toUserId: student.id,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     });
     // Also notify the actor (teacher) about their own action
     if (userId) {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'assignment',
         title: 'New Assignment',
         message: `You created a new assignment: ${assignment.title} (${assignment.subject})`,
         assignmentId: assignment.id,
         fromUserId: userId,
         toUserId: userId,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     }
    await window.DataSync?.refreshResource('assignments').catch(() => {});
  }
  return result.data || result;
}

async function deleteAssignment(id) {
  await API.assignments.delete(id);
  await window.DataSync?.refreshResource('assignments').catch(() => {});
}

/* ---- Exams Operations ---- */
function getExams() {
  return readJson(DATA_KEYS.exams, []);
}

function saveExams(exams) {
  writeJson(DATA_KEYS.exams, exams);
}

async function addExam(exam, userId = null) {
  const result = await API.exams.create(exam);
  if (result.success && result.data) {
    const existing = getExams();
    existing.push(normalizeExam(result.data));
    writeJson(DATA_KEYS.exams, existing);

     const students = getStudents();
     students.forEach(student => {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'exam',
         title: 'New Exam Added',
         message: `New ${result.data.format === 'mcq' ? 'MCQ' : 'Theory'} exam: ${result.data.title} (${result.data.subject || exam.subject || ''})`,
         examId: result.data.id,
         fromUserId: userId,
         toUserId: student.id,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     });
     // Also notify the actor (teacher) about their own action
     if (userId) {
       addNotification({
         id: 'notif' + Date.now() + Math.random(),
         type: 'exam',
         title: 'New Exam Added',
         message: `You created a new ${result.data.format === 'mcq' ? 'MCQ' : 'Theory'} exam: ${result.data.title} (${result.data.subject || exam.subject || ''})`,
         examId: result.data.id,
         fromUserId: userId,
         toUserId: userId,
         read: false,
         date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: Date.now()
       });
     }
    await window.DataSync?.refreshResource('exams').catch(() => {});
  }
  return result.data || result;
}

async function deleteExam(id) {
  await API.exams.delete(id);
  await window.DataSync?.refreshResource('exams').catch(() => {});
}

/* ---- Results Operations ---- */
function getResults() {
  return readJson(DATA_KEYS.results, []);
}

function saveResults(results) {
  writeJson(DATA_KEYS.results, results);
}

async function addResult(result) {
  try {
    const res = await API.results.create(result);
    return res.data || res;
  } catch (e) {
    // API unavailable — result was already saved locally by the caller
    console.warn('Could not sync result to server:', e?.message || e);
    return result;
  }
}

async function deleteResult(id) {
  await API.results.delete(id);
  await window.DataSync?.refreshResource('results').catch(() => {});
}

function getStudentResults(studentId) {
  return getResults().filter(r => r.studentId === studentId);
}

/* ---- Notifications Operations ---- */
function getNotifications() {
  return readJson(DATA_KEYS.notifications, []);
}

function saveNotifications(notifications) {
  writeJson(DATA_KEYS.notifications, notifications);
}

async function addNotification(notif) {
  const result = await API.notifications.create(notif);
  await window.DataSync?.refreshResource('notifications').catch(() => {});
  return result.data;
}

async function markNotificationRead(id) {
  await API.notifications.markAsRead(id);
  await window.DataSync?.refreshResource('notifications').catch(() => {});
}

async function clearNotifications() {
  await API.notifications.clearAll();
  await window.DataSync?.refreshResource('notifications').catch(() => {});
}

/* ---- Users Operations ---- */
function getUsers() {
  return readJson(DATA_KEYS.users, []);
}

function getUserById(id) {
  return getUsers().find(u => u.id === id);
}

function searchUsers(query) {
  const q = query.toLowerCase();
  return getUsers().filter(u => 
    u.name?.toLowerCase().includes(q) || 
    u.email?.toLowerCase().includes(q)
  );
}

/* ---- Schemes of Work Operations ---- */
function getSchemesOfWork() {
  return readJson(DATA_KEYS.schemes, []);
}

function saveSchemesOfWork(schemes) {
  writeJson(DATA_KEYS.schemes, schemes);
}

async function addSchemeOfWork(scheme) {
  const result = await API.schemes.create(scheme);
  await window.DataSync?.refreshResource('schemes').catch(() => {});
  return result.data || result;
}

async function deleteSchemeOfWork(id) {
  await API.schemes.delete(id);
  await window.DataSync?.refreshResource('schemes').catch(() => {});
}

/* ---- Lesson Plans Operations ---- */
function getLessonPlans() {
  return readJson(DATA_KEYS.lessonPlans, []);
}

function saveLessonPlans(plans) {
  writeJson(DATA_KEYS.lessonPlans, plans);
}

async function addLessonPlan(plan) {
  const result = await API.lessonPlans.create(plan);
  await window.DataSync?.refreshResource('lessonPlans').catch(() => {});
  return result.data || result;
}

async function deleteLessonPlan(id) {
  await API.lessonPlans.delete(id);
  await window.DataSync?.refreshResource('lessonPlans').catch(() => {});
}

/* ---- Mid-Term Results Operations ---- */
function getMidTermResults() {
  return readJson(DATA_KEYS.midtermResults, []);
}

function saveMidTermResults(results) {
  writeJson(DATA_KEYS.midtermResults, results);
}

async function addMidTermResult(result) {
  const res = await API.midtermResults.create(result);
  await window.DataSync?.refreshResource('midtermResults').catch(() => {});
  return res.data || res;
}

async function updateMidTermResult(result) {
  await API.midtermResults.update(result.id, result);
  await window.DataSync?.refreshResource('midtermResults').catch(() => {});
}

async function deleteMidTermResult(id) {
  await API.midtermResults.delete(id);
  await window.DataSync?.refreshResource('midtermResults').catch(() => {});
}

function getMidTermResultsByClass(className) {
  return getMidTermResults().filter(r => r.class === className);
}

function getMidTermResultsByStudent(studentId) {
  return getMidTermResults().filter(r => r.studentId === studentId);
}

/* ---- Reports Operations ---- */
function getReports() {
  return readJson(DATA_KEYS.reports, []);
}

function saveReports(reports) {
  writeJson(DATA_KEYS.reports, reports);
}

async function addReport(report) {
  const result = await API.reports.create(report);
  await window.DataSync?.refreshResource('reports').catch(() => {});
  return result.data || result;
}

async function markReportRead(id) {
  await API.reports.markAsRead(id);
  await window.DataSync?.refreshResource('reports').catch(() => {});
}

async function deleteReport(id) {
  await API.reports.delete(id);
  await window.DataSync?.refreshResource('reports').catch(() => {});
}

/* ---- Lessons Operations ---- */
function getLessons() {
  return readJson(DATA_KEYS.lessons, []);
}

function saveLessons(lessons) {
  writeJson(DATA_KEYS.lessons, lessons);
}

async function addLesson(lesson) {
  const result = await API.lessons.create(lesson);
  await window.DataSync?.refreshResource('lessons').catch(() => {});
  return result.data || result;
}

async function deleteLesson(id) {
  await API.lessons.delete(id);
  await window.DataSync?.refreshResource('lessons').catch(() => {});
}

/* ---- Submissions Operations ---- */
function getSubmissions() {
  return readJson(DATA_KEYS.submissions, []);
}

function saveSubmissions(submissions) {
  writeJson(DATA_KEYS.submissions, submissions);
}

function getExamSubmissions(examId) {
  return getSubmissions().filter(s => s.examId === examId);
}

function getStudentSubmissions(studentId) {
  return getSubmissions().filter(s => s.studentId === studentId);
}

function getSubmissionForStudent(examId, studentId) {
  return getSubmissions().find(s => s.examId === examId && s.studentId === studentId) || null;
}

function hasStudentSubmitted(examId, studentId) {
  return Boolean(getSubmissionForStudent(examId, studentId));
}

function isExamLocked(examId, studentId) {
  // Check backend submission record first
  if (hasStudentSubmitted(examId, studentId)) return true;
  // Check localStorage lockout flag (survives API failures)
  const lockoutKey = `yems_exam_locked_${examId}_${studentId}`;
  const lockData = localStorage.getItem(lockoutKey);
  if (lockData) {
    try {
      const parsed = JSON.parse(lockData);
      if (parsed.examId === examId && parsed.studentId === studentId) return true;
    } catch (e) {
      console.error(`[Data] Corrupted exam lockout data for key "${lockoutKey}":`, e);
      // Corrupted data, treat as locked to be safe
      return true;
    }
  }
  return false;
}

async function addSubmission(submission) {
  const payload = {
    examId: submission.examId || submission.assignmentId,
    studentId: submission.studentId,
    answers: submission.answers || {}
  };
  const result = await API.submissions.create(payload);
  await window.DataSync?.refreshResource('submissions').catch(() => {});
  return result.data || result;
}

/* ---- Get by ID Utilities ---- */
function getUserById(id) { return getAppUsers().find(u => u.id === id); }
function getNoteById(id) { return getNotes().find(n => n.id === id); }
function getExamById(id) { return getExams().find(e => e.id === id); }
function getResultById(id) { return getResults().find(r => r.id === id); }
function getAssignmentById(id) { return getAssignments().find(a => a.id === id); }
function getSchemeById(id) { return getSchemesOfWork().find(s => s.id === id); }
function getLessonPlanById(id) { return getLessonPlans().find(p => p.id === id); }
function getMidTermResultById(id) { return getMidTermResults().find(r => r.id === id); }
function getReportById(id) { return getReports().find(r => r.id === id); }
function getAdmissionById(id) {
  return getAdmissions().find(a => a.id === id);
}

/* ---- Academic Info ---- */
function getAcademicInfo() {
  try {
    const users = getAppUsers();
    if (users && users.length > 0) {
      const firstUser = users.find(u => u.session) || users[0];
      return { session: firstUser?.session || '2024/2025', term: firstUser?.term || 'Second Term' };
    }
  } catch (e) {
    console.warn('Error getting academic info:', e);
  }
  return { session: '2024/2025', term: 'Second Term' };
}

/* ---- Subjects Operations ---- */
function getSubjects() {
  const data = readJson(DATA_KEYS.subjects, { junior: [], senior: { science: [], art: [], commercial: [], general: [] } });
  return {
    junior: data.junior || [],
    senior: data.senior || { science: [], art: [], commercial: [], general: [] }
  };
}

function saveSubjects(subjects) {
  writeJson(DATA_KEYS.subjects, subjects);
}

function getJuniorSubjects() {
  return getSubjects().junior || [];
}

function getSeniorSubjects() {
  return getSubjects().senior || { science: [], art: [], commercial: [], general: [] };
}

async function addJuniorSubject(subject) {
  await API.subjects.create({ name: subject, category: 'junior' });
}

async function addSeniorSubject(subject, department) {
  await API.subjects.create({ name: subject, category: 'senior', department });
}

async function deleteJuniorSubject(subject) {
  const result = await API.subjects.getAll();
  const allSubjects = Array.isArray(result.data) ? result.data : [];
  const subjectToDelete = allSubjects.find(
    s => s && s.category === 'junior' && (s.name === subject || s === subject)
  );
  if (subjectToDelete?.id) {
    await API.subjects.delete(subjectToDelete.id);
    await window.DataSync?.refreshResource('subjects').catch(() => {});
  }
}

async function deleteSeniorSubject(subject, department) {
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
}

/* ---- Class Streams Operations ---- */
function getClasses() {
  const result = readJson(DATA_KEYS.classes, []);
  console.log('[DEBUG] getClasses() returning:', Array.isArray(result) ? `array[${result.length}]` : typeof result, result.length ? result.map(c => c.displayName) : 'empty');
  return result;
}

async function addClass(level, stream) {
  const classes = getClasses();
  const exists = classes.some(c => c.level === level && c.stream === stream.trim().toLowerCase());
  if (exists) return false;
  if (!window.API) {
    const newClass = {
      id: 'cls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      level,
      stream: stream.trim(),
      displayName: level + ' ' + stream.trim()
    };
    const updated = [...classes, newClass];
    writeJson(DATA_KEYS.classes, updated);
    return true;
  }
  try {
    const createRes = await API.admin.createClass({ level, stream });
    const createdClass = createRes?.data;
    if (createdClass) {
      // Update cache with newly created class immediately
      const updated = [...classes, createdClass];
      writeJson(DATA_KEYS.classes, updated);
    }
    await window.DataSync?.refreshResource('classes').catch(() => {});
    return true;
  } catch (e) {
    console.error('[Data] Failed to create class via API:', e.message);
    return false;
  }
}

async function deleteClass(id) {
  if (!window.API) {
    const updated = getClasses().filter(c => c.id !== id);
    writeJson(DATA_KEYS.classes, updated);
    return;
  }
  try {
    await API.admin.deleteClass(id);
    await window.DataSync?.refreshResource('classes').catch(() => {});
  } catch (e) {
    console.error('[Data] Failed to delete class via API:', e.message);
  }
}

/* ---- Admissions Operations ---- */
function getAdmissions() {
  return readJson(DATA_KEYS.admissions, []);
}

function saveAdmissions(admissions) {
  writeJson(DATA_KEYS.admissions, admissions);
}

async function addAdmission(admission) {
  const result = await API.admissions.create(admission);
  await window.DataSync?.refreshResource('admissions').catch(() => {});
  return result.data || result;
}

async function deleteAdmission(id) {
  await API.admissions.delete(id);
  await window.DataSync?.refreshResource('admissions').catch(() => {});
}

const DataSync = (() => {
  function getExamFetcher() {
    const role = Auth.current()?.role;
    if (role === 'student' || role === 'parent') {
      return () => API.student.getExams();
    }
    if (role === 'teacher') {
      return () => API.teacher.getExams();
    }
    return () => API.exams.getAll();
  }

  async function refreshCore() {
    const examFetcher = getExamFetcher();
    const tasks = [
      syncResource(DATA_KEYS.exams, examFetcher, data => data.map(normalizeExam)),
      syncResource(DATA_KEYS.notes, () => API.notes.getAll(), data => data.map(normalizeNote)),
      syncResource(DATA_KEYS.assignments, () => API.assignments.getAll(), data => data.map(normalizeAssignment)),
      syncResource(DATA_KEYS.results, () => API.results.getAll(), data => data.map(normalizeResult)),
      syncResource(DATA_KEYS.lessons, () => API.lessons.getAll(), data => data.map(normalizeLesson)),
      syncResource(DATA_KEYS.notifications, () => API.notifications.getAll(), data => data.map(normalizeNotification)),
      syncResource(DATA_KEYS.submissions, () => API.submissions.getAll(), data => data.map(normalizeSubmission)),
      syncResource(DATA_KEYS.schemes, () => API.schemes.getAll(), data => data || []),
      syncResource(DATA_KEYS.lessonPlans, () => API.lessonPlans.getAll(), data => data || []),
      syncResource(DATA_KEYS.midtermResults, () => API.midtermResults.getAll(), data => data || []),
      syncResource(DATA_KEYS.reports, () => API.reports.getAll(), data => data || []),
      syncResource(DATA_KEYS.admissions, () => API.admissions.getAll(), data => data || []),
      syncResource(DATA_KEYS.classes, () => API.admin.getClasses(), data => data || []),
      syncResource(DATA_KEYS.auditLogs, () => API.admin.getAuditLogs(), data => data || [])
    ];

    const user = Auth.current();
    if (user && ['admin', 'superadmin', 'principal', 'hod', 'teacher', 'platform_admin'].includes(user.role)) {
      tasks.push(
        syncResource(DATA_KEYS.users, () => API.users.getUsers(), data => data.map(normalizeUser)),
        syncResource(DATA_KEYS.subjects, () => API.subjects.getAll(), normalizeSubjects)
      );
    }

    const result = await Promise.allSettled(tasks);
    return result;
  }

  async function refreshResource(name) {
    const examFetcher = getExamFetcher();
    const resources = {
      users: () => syncResource(DATA_KEYS.users, () => API.users.getUsers(), data => data.map(normalizeUser)),
      subjects: () => syncResource(DATA_KEYS.subjects, () => API.subjects.getAll(), normalizeSubjects),
      exams: () => syncResource(DATA_KEYS.exams, examFetcher, data => data.map(normalizeExam)),
      notes: () => syncResource(DATA_KEYS.notes, () => API.notes.getAll(), data => data.map(normalizeNote)),
      assignments: () => syncResource(DATA_KEYS.assignments, () => API.assignments.getAll(), data => data.map(normalizeAssignment)),
      results: () => syncResource(DATA_KEYS.results, () => API.results.getAll(), data => data.map(normalizeResult)),
      notifications: () => syncResource(DATA_KEYS.notifications, () => API.notifications.getAll(), data => data.map(normalizeNotification)),
      lessons: () => syncResource(DATA_KEYS.lessons, () => API.lessons.getAll(), data => data.map(normalizeLesson)),
      submissions: () => syncResource(DATA_KEYS.submissions, () => API.submissions.getAll(), data => data.map(normalizeSubmission)),
      schemes: () => syncResource(DATA_KEYS.schemes, () => API.schemes.getAll(), data => data || []),
      lessonPlans: () => syncResource(DATA_KEYS.lessonPlans, () => API.lessonPlans.getAll(), data => data || []),
      midtermResults: () => syncResource(DATA_KEYS.midtermResults, () => API.midtermResults.getAll(), data => data || []),
      reports: () => syncResource(DATA_KEYS.reports, () => API.reports.getAll(), data => data || []),
      admissions: () => syncResource(DATA_KEYS.admissions, () => API.admissions.getAll(), data => data || []),
      classes: () => syncResource(DATA_KEYS.classes, () => API.admin.getClasses(), data => data || []),
      auditLogs: () => syncResource(DATA_KEYS.auditLogs, () => API.admin.getAuditLogs(), data => data || [])
    };

    if (!resources[name]) {
      throw new Error(`Unknown resource: ${name}`);
    }
    return resources[name]();
  }

  async function clearCachedAssignments() {
    try {
      await API.assignments.deleteAll();
    } catch (e) {
      console.error('[DataSync] Backend deleteAll failed, clearing local cache anyway:', e.message);
    }
    writeJson(DATA_KEYS.assignments, []);
    const cache = window.__YEMS_DATA_CACHE;
    if (cache) cache[DATA_KEYS.assignments] = [];
    localStorage.removeItem(DATA_KEYS.assignments);
    return refreshResource('assignments');
  }

  return { refreshCore, refreshResource, clearCachedAssignments };
})();

window.DataSync = DataSync;
window.clearAssignmentsCache = () => DataSync.clearCachedAssignments();

/**
 * PORTAL_DATA helps with aggregated access to common UI needs
 */
const PORTAL_DATA = {
  getSchoolInfo: () => getAcademicInfo(),
  get deadlines() {
    const assignments = readJson(DATA_KEYS.assignments, []);
    return assignments.map(a => ({
      name: a.title,
      due: a.dueLabel,
      color: a.iconColor || 'var(--maroon)'
    }));
  },
  get lessons() {
    return readJson(DATA_KEYS.lessons, []);
  },
  get tests() {
    const exams = readJson(DATA_KEYS.exams, []);
    return exams.filter(e => (!e.format || e.format === 'mcq') && (e.category === 'midterm' || !e.category));
  }
};
window.PORTAL_DATA = PORTAL_DATA;
