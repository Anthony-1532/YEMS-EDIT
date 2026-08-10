/* =============================================
   INIT.JS — Yeshua Educational Platform
   Data Initialization - Backend-first cache bootstrap
   ============================================= */

const DataInit = (() => {
  function init() {
    const cache = window.__YEMS_DATA_CACHE || (window.__YEMS_DATA_CACHE = Object.create(null));
    // Hydrate from localStorage first so readJson can access persisted data.
    // Only set empty defaults when there is truly nothing stored.
    function hydrate(key, fallback) {
      if (cache[key] === undefined) {
        try {
          const stored = localStorage.getItem(key);
          if (stored !== null) {
            cache[key] = JSON.parse(stored);
            return;
          }
        } catch (e) {
          console.error(`[Init] Failed to hydrate "${key}" from localStorage:`, e);
        }
        cache[key] = fallback;
      }
    }
    hydrate('yep_users', []);
    hydrate('yep_subjects', { junior: [], senior: { science: [], art: [], commercial: [] } });
    hydrate('yep_exams', []);
    hydrate('yep_lessons', []);
    hydrate('yep_notes', []);
    hydrate('yep_assignments', []);
    hydrate('yep_results', []);
    hydrate('yep_submissions', []);
    hydrate('yep_admissions', []);
    hydrate('yep_reports', []);
    hydrate('yep_schemes', []);
    hydrate('yep_lesson_plans', []);
    hydrate('yep_midterm_results', []);
    hydrate('yep_notifications', []);
    hydrate('yep_classes', []);
  }

  function resetCache() {
    window.__YEMS_DATA_CACHE = Object.create(null);
  }

  function exportData() {
    const cache = window.__YEMS_DATA_CACHE || {};
    return {
      users: cache.yep_users || [],
      subjects: cache.yep_subjects || {},
      exams: cache.yep_exams || [],
      lessons: cache.yep_lessons || [],
      notes: cache.yep_notes || [],
      assignments: cache.yep_assignments || [],
      results: cache.yep_results || [],
      submissions: cache.yep_submissions || [],
      admissions: cache.yep_admissions || [],
      reports: cache.yep_reports || [],
      schemes: cache.yep_schemes || [],
      lessonPlans: cache.yep_lesson_plans || [],
      midtermResults: cache.yep_midterm_results || [],
      notifications: cache.yep_notifications || [],
      classes: cache.yep_classes || [],
      exportedAt: new Date().toISOString()
    };
  }

  function importData(data) {
    const cache = window.__YEMS_DATA_CACHE || (window.__YEMS_DATA_CACHE = Object.create(null));
    if (data.users) cache.yep_users = data.users;
    if (data.subjects) cache.yep_subjects = data.subjects;
    if (data.exams) cache.yep_exams = data.exams;
    if (data.lessons) cache.yep_lessons = data.lessons;
    if (data.notes) cache.yep_notes = data.notes;
    if (data.assignments) cache.yep_assignments = data.assignments;
    if (data.results) cache.yep_results = data.results;
    if (data.submissions) cache.yep_submissions = data.submissions;
    if (data.admissions) cache.yep_admissions = data.admissions;
    if (data.reports) cache.yep_reports = data.reports;
    if (data.schemes) cache.yep_schemes = data.schemes;
    if (data.lessonPlans) cache.yep_lesson_plans = data.lessonPlans;
    if (data.midtermResults) cache.yep_midterm_results = data.midtermResults;
    if (data.notifications) cache.yep_notifications = data.notifications;
    if (data.classes) cache.yep_classes = data.classes;
  }

  return {
    init,
    reset: resetCache,
    exportData,
    importData
  };
})();

window.DataInit = DataInit;
DataInit.init();
