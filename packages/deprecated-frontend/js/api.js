/* =============================================
   API.JS — YEMS API Service Layer
   Remote backend only
   ============================================= */

const API = (() => {
function normalizeBaseUrl(url) {
  if (typeof url !== 'string') return url;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

const CONFIG = {
  // Base URL for API - checks explicit override first, then infers from location
  baseUrl: normalizeBaseUrl(window.YEMS_API_BASE_URL || (window.location.port ? `http://${window.location.hostname}:4000/api` : '/api')),

    // API Endpoints
    endpoints: {
      // Auth
      login: '/auth/login',
      logout: '/auth/logout',
      register: '/auth/register',
      refreshToken: '/auth/refresh',
      me: '/auth/me',

      // Admin
      adminUsers: '/admin/users',
      adminSubjects: '/admin/subjects',
      adminAuditLogs: '/admin/audit/logs',
      adminClasses: '/admin/classes',
      adminHealth: '/admin/health',

      // Teacher
      teacherExams: '/teacher/exams',

      // Student
      studentExams: '/student/exams',

      // Technician
      technicianHealth: '/technician/system/health',
      technicianDiagnostics: '/technician/system/diagnostics',
      technicianLogs: '/technician/system/logs',
      technicianDevices: '/technician/devices',
      technicianAlerts: '/technician/alerts',
      technicianRbacPolicies: '/technician/rbac/policies',

      // Exams
      exams: '/exams',
      examsByType: '/exams/type/',
      examsStart: '/exams/start',
      examsSubmit: '/exams/submit',

      // Notes
      notes: '/notes/',

      // Assignments
      assignments: '/assignments/',

      // Health
      health: '/health',
      metrics: '/metrics',
      statusMetrics: '/status/metrics'
    },

    // Request timeout (ms)
    timeout: 30000,

    // Debug mode
    debug: false
  };

  // Server connection monitoring state
  let _serverOnline = true;
  let _serverMonitorInterval = null;
  const SERVER_MONITOR_INTERVAL = 15000; // 15 seconds between health pings

  // Get auth token from Auth module
  function getToken() {
    if (typeof Auth !== 'undefined') {
      return Auth.getToken();
    }
    return null;
  }

  // Build full URL
  function buildUrl(endpoint) {
    // Remove leading slash if endpoint has it and baseUrl ends with /api
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    // Strip trailing slash — Hono routes don't match trailing slashes on sub-routes
    if (cleanEndpoint.endsWith('/')) cleanEndpoint = cleanEndpoint.slice(0, -1);
    return `${normalizeBaseUrl(CONFIG.baseUrl)}/${cleanEndpoint}`;
  }

  // Get headers for requests
  function getHeaders(includeAuth = true, contentType = 'application/json') {
    const headers = {};

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    if (includeAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Handle API response
  async function handleResponse(response) {
    if (!response.ok) {
      let errorData = { message: `HTTP ${response.status}` };
      try {
        errorData = await response.json();
      } catch (e) {
      }
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = errorData.code;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return { success: true };
  }

  // Online/offline state
  let isOnline = navigator.onLine;
  window.addEventListener('online', () => { isOnline = true; console.log('[API] Back online'); });
  window.addEventListener('offline', () => { isOnline = false; console.warn('[API] Went offline'); });

  function checkOnline() {
    if (!isOnline) {
      if (CONFIG.debug) {
        console.warn('[API] Browser reports offline; attempting request anyway');
      }
    }
  }

  // Make API request
  async function request(method, endpoint, data = null, includeAuth = true, isFormData = false) {
    checkOnline();
    
    const url = buildUrl(endpoint);
    const headers = getHeaders(includeAuth, isFormData ? undefined : 'application/json');

    const options = {
      method,
      headers
    };

    if (data) {
      if (isFormData) {
        options.body = data;
        delete headers['Content-Type'];
      } else {
        options.body = JSON.stringify(data);
      }
    }

    if (CONFIG.debug) {
      console.log(`[API] ${method} ${url}`, data || '');
    }

    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        return await handleResponse(response);
      } catch (error) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          if (attempt === maxRetries) {
            throw new Error('Request timeout after ' + maxRetries + ' attempts');
          }
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        
        // Don't retry client errors (4xx) - they are not transient
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    
    throw lastError;
  }

  // HTTP Methods
  const get = (endpoint, includeAuth = true) => request('GET', endpoint, null, includeAuth);
  const post = (endpoint, data, includeAuth = true) => request('POST', endpoint, data, includeAuth);
  const put = (endpoint, data, includeAuth = true) => request('PUT', endpoint, data, includeAuth);
  const patch = (endpoint, data, includeAuth = true) => request('PATCH', endpoint, data, includeAuth);
  const del = (endpoint, includeAuth = true) => request('DELETE', endpoint, null, includeAuth);

  // Auth API Calls
  const auth = {
    login: (email, password) => {
      return post('/auth/login', { email, password }, false);
    },
    register: (data) => {
      return post('/auth/register', data, false);
    },
    logout: () => {
      return post('/auth/logout', {});
    },
    refreshToken: (refreshToken) => {
      return post('/auth/refresh', { refreshToken }, false);
    },
    me: () => {
      return get('/auth/me');
    }
  };

  // Admin API Calls
  const admin = {
    // Users
    getUsers: () => get('/admin/users'),
    getUserById: (id) => get(`/admin/users/${id}`),
    createUser: (data) => post('/admin/users', data),
    updateUser: (id, data) => patch(`/admin/users/${id}`, data),
    deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
    updateUserRole: (id, role) => patch(`/admin/users/${id}/role`, { role }),
    suspendUser: (id, reason) => post(`/admin/users/${id}/suspend`, { reason }),

    // Subjects
    getSubjects: (search, category) => get(`/admin/subjects?search=${search || ''}&category=${category || ''}`),
    getSubjectById: (id) => get(`/admin/subjects/${id}`),
    createSubject: (data) => post('/admin/subjects', {
      name: data.name,
      code: data.code,
      description: data.description,
      category: data.category,
      department: data.department
    }),
    updateSubject: (id, data) => patch(`/admin/subjects/${id}`, data),
    deleteSubject: (id) => request('DELETE', `/admin/subjects/${id}`),

    // Audit Logs
    getAuditLogs: () => get('/admin/audit/logs'),

    // Classes
    getClasses: () => get('/admin/classes'),
    createClass: (data) => post('/admin/classes', data),
    deleteClass: (id) => del(`/admin/classes/${id}`),

    // Health
    getHealth: () => get('/admin/health')
  };

  // Users API (for general user operations)
  const users = {
    getUsers: () => get('/admin/users'),
    getUserById: (id) => get(`/admin/users/${id}`),
    searchUsers: (query) => get(`/admin/users?search=${query}`),
  };

  // Subjects API
  const subjects = {
    getAll: () => get('/admin/subjects'),
    getById: (id) => get(`/admin/subjects/${id}`),
    create: (data) => post('/admin/subjects', data),
    update: (id, data) => patch(`/admin/subjects/${id}`, data),
    delete: (id) => request('DELETE', `/admin/subjects/${id}`),
    getJunior: () => get('/admin/subjects?category=junior'),
    getSenior: (department) => get(`/admin/subjects?category=senior&department=${department || ''}`),
  };

  // Notifications API
  const notifications = {
    getAll: () => get('/notifications/'),
    getUnreadCount: () => get('/notifications/unread-count'),
    getById: (id) => get(`/notifications/${id}`),
    create: (data) => post('/notifications/', data),
    markAsRead: (id) => patch(`/notifications/${id}/read`),
    markAllAsRead: () => patch('/notifications/read-all'),
    delete: (id) => request('DELETE', `/notifications/${id}`),
    clearAll: () => request('DELETE', '/notifications/clear'),
  };

  // Teacher API Calls
  const teacher = {
    getExams: () => get('/teacher/exams')
  };

  // Student API Calls
  const student = {
    getExams: () => get('/student/exams')
  };

  // Technician API Calls
  const technician = {
    getHealth: () => get('/technician/system/health'),
    getDiagnostics: () => get('/technician/system/diagnostics'),
    getEnhancedDiagnostics: () => get('/technician/system/diagnostics/enhanced'),
    getLogs: () => get('/technician/system/logs'),
    getDevices: () => get('/technician/devices'),
    getDeviceTelemetry: (id) => get(`/technician/devices/${id}/telemetry`),
    getAlerts: () => get('/technician/alerts'),
    acknowledgeAlert: (id, status, resolutionNote) => patch(`/technician/alerts/${id}/acknowledge`, {
      status,
      resolutionNote
    }),
    restartService: (service, idempotencyKey) => post(`/technician/services/${service}/restart`, {
      idempotencyKey
    }),
    getRbacPolicies: () => get('/technician/rbac/policies')
  };

  // Accountant API Calls
  const accountant = {
    getBills: () => get('/accountant/bills'),
    createBill: (data) => post('/accountant/bills', data),
    updateBill: (id, data) => patch(`/accountant/bills/${id}`, data),
    getPayments: () => get('/accountant/payments'),
    createPayment: (data) => post('/accountant/payments', data),
    getSettings: () => get('/accountant/settings'),
    updateSettings: (data) => patch('/accountant/settings', data),
  };

  // Superadmin API Calls
  const superadmin = {
    getInstitutions: () => get('/superadmin/institutions'),
    createInstitution: (data) => post('/superadmin/institutions', data),
    updateInstitution: (id, data) => patch(`/superadmin/institutions/${id}`, data),
    deleteInstitution: (id) => request('DELETE', `/superadmin/institutions/${id}`),

    getPlatformSettings: () => get('/superadmin/platform-settings'),
    updatePlatformSettings: (data) => patch('/superadmin/platform-settings', data),

    getBackups: () => get('/superadmin/backups'),
    createBackup: (data) => post('/superadmin/backups', data || {}),
    deleteBackup: (id) => request('DELETE', `/superadmin/backups/${id}`),

    getAuditLogs: (limit) => get(`/superadmin/audit-logs${limit ? `?limit=${limit}` : ''}`),
    clearAuditLogs: () => request('DELETE', '/superadmin/audit-logs'),

    getRbacRoles: () => get('/superadmin/rbac/roles'),
    createRbacRole: (data) => post('/superadmin/rbac/roles', data),
    updateRbacRole: (id, data) => patch(`/superadmin/rbac/roles/${id}`, data),
    deleteRbacRole: (id) => request('DELETE', `/superadmin/rbac/roles/${id}`),
  };

  // Exams API Calls
  const exams = {
    getAll: () => get('/exams'),
    getByType: (type) => get(`/exams/type/${type}`),
    getById: (id) => get(`/exams/${id}`),
    getQuestions: (id) => get(`/exams/${id}/questions`),
    getQuestionById: (examId, questionId) => get(`/exams/${examId}/questions/${questionId}`),
    getTheoryMarkingQueue: (id) => get(`/exams/${id}/questions/theory/marking-queue`),
    getProgress: (examId, studentId) => get(`/exams/${examId}/progress/${studentId}`),

    // Create/Update
    create: (data) => post('/exams', data),
    update: (id, data) => patch(`/exams/${id}`, data),
    delete: (id) => request('DELETE', `/exams/${id}`),

    // Questions
    addQuestion: (examId, data) => post(`/exams/${examId}/questions`, data),
    updateQuestion: (examId, questionId, data) => put(`/exams/${examId}/questions/${questionId}`, data),
    deleteQuestion: (examId, questionId) => request('DELETE', `/exams/${examId}/questions/${questionId}`),

    // Bulk operations
    bulkAddObjectiveQuestions: (examId, data) => post(`/exams/${examId}/questions/objective/bulk`, {
      sectionId: data.sectionId,
      rawQuestions: data.rawQuestions,
      optionCount: data.optionCount,
      marksPerQuestion: data.marksPerQuestion,
      startOrder: data.startOrder,
      questionType: data.questionType
    }),
    uploadTheoryQuestions: (examId, data) => post(`/exams/${examId}/questions/theory/upload`, {
      sectionId: data.sectionId,
      rawQuestions: data.rawQuestions,
      marksPerQuestion: data.marksPerQuestion,
      startOrder: data.startOrder,
      questionType: data.questionType
    }),

    // Exam session
    start: (examId, studentId) => post('/exams/start', { examId, studentId }),
    submitAnswers: (examId, data) => post(`/exams/${examId}/answers`, {
      questionId: data.questionId,
      answerText: data.answerText,
      selectedOptionIds: data.selectedOptionIds,
      isDraft: data.isDraft
    }),
    submit: (examId, studentId, answers) => post('/exams/submit', { examId, studentId, answers })
  };

  // Notes API Calls
  const notes = {
    getAll: () => get('/notes/'),
    getById: (id) => get(`/notes/${id}`),
    create: (data) => post('/notes/', {
      title: data.title,
      content: data.desc || data.content,
      subject: data.subject,
      subjectId: data.subjectId,
      week: data.week,
      date: data.date,
      fileData: data.fileData,
      fileName: data.fileName
    }),
    update: (id, data) => patch(`/notes/${id}`, {
      title: data.title,
      content: data.desc || data.content,
      subject: data.subject,
      subjectId: data.subjectId,
      week: data.week,
      date: data.date,
      fileData: data.fileData,
      fileName: data.fileName
    }),
    delete: (id) => request('DELETE', `/notes/${id}`)
  };

  const assignments = {
    getAll: () => get('/assignments/'),
    getById: (id) => get(`/assignments/${id}`),
    create: (data) => post('/assignments/', data),
    update: (id, data) => patch(`/assignments/${id}`, data),
    delete: (id) => request('DELETE', `/assignments/${id}`),
    deleteAll: () => request('DELETE', '/assignments/')
  };

  const results = {
    getAll: () => get('/results/'),
    getById: (id) => get(`/results/${id}`),
    getByStudent: (studentId) => get(`/results/student/${studentId}`),
    create: (data) => post('/results/', {
      studentId: data.studentId,
      examId: data.examId,
      subject: data.subject,
      score: data.score,
      totalScore: data.totalScore,
      grade: data.grade,
      remarks: data.remarks,
      class: data.class,
      session: data.session,
      term: data.term,
      examTitle: data.examTitle,
      date: data.date
    }),
    update: (id, data) => patch(`/results/${id}`, data),
    delete: (id) => request('DELETE', `/results/${id}`)
  };



  const lessons = {
    getAll: () => get('/lessons/'),
    getLive: () => get('/lessons/live'),
    getById: (id) => get(`/lessons/${id}`),
    create: (data) => post('/lessons/', data),
    update: (id, data) => patch(`/lessons/${id}`, data),
    delete: (id) => request('DELETE', `/lessons/${id}`)
  };

  const admissions = {
    getAll: () => get('/admissions/'),
    getPending: () => get('/admissions/pending'),
    getById: (id) => get(`/admissions/${id}`),
    create: (data) => post('/admissions/', data),
    update: (id, data) => patch(`/admissions/${id}`, data),
    approve: (id) => patch(`/admissions/${id}/approve`, {}),
    reject: (id, reason) => patch(`/admissions/${id}/reject`, reason ? { reason } : {}),
    delete: (id) => request('DELETE', `/admissions/${id}`)
  };

  const submissions = {
    getAll: () => get('/submissions'),
    getById: (id) => get(`/submissions/${id}`),
    getByStudent: (studentId) => get(`/submissions/student/${studentId}`),
    getByAssignment: (assignmentId) => get(`/submissions/assignment/${assignmentId}`),
    create: (data) => post('/submissions', data),
    update: (id, data) => patch(`/submissions/${id}`, data),
    grade: (id, data) => patch(`/submissions/${id}/grade`, data),
    delete: (id) => request('DELETE', `/submissions/${id}`)
  };

  const schemes = {
    getAll: () => get('/schemes/'),
    getById: (id) => get(`/schemes/${id}`),
    getBySubject: (subject) => get(`/schemes/subject/${subject}`),
    create: (data) => post('/schemes/', data),
    update: (id, data) => patch(`/schemes/${id}`, data),
    delete: (id) => request('DELETE', `/schemes/${id}`)
  };

  const lessonPlans = {
    getAll: () => get('/lesson-plans/'),
    getById: (id) => get(`/lesson-plans/${id}`),
    getByTeacher: (teacherId) => get(`/lesson-plans/teacher/${teacherId}`),
    create: (data) => post('/lesson-plans/', data),
    update: (id, data) => patch(`/lesson-plans/${id}`, data),
    delete: (id) => request('DELETE', `/lesson-plans/${id}`)
  };

  const midtermResults = {
    getAll: () => get('/midterm-results/'),
    getById: (id) => get(`/midterm-results/${id}`),
    getByStudent: (studentId) => get(`/midterm-results/student/${studentId}`),
    create: (data) => post('/midterm-results/', data),
    update: (id, data) => patch(`/midterm-results/${id}`, data),
    delete: (id) => request('DELETE', `/midterm-results/${id}`)
  };

  const reports = {
    getAll: () => get('/reports/'),
    getById: (id) => get(`/reports/${id}`),
    getByUser: (userId) => get(`/reports/user/${userId}`),
    create: (data) => post('/reports/', data),
    update: (id, data) => patch(`/reports/${id}`, data),
    markAsRead: (id) => patch(`/reports/${id}/read`),
    resolve: (id, data) => patch(`/reports/${id}/resolve`, data),
    delete: (id) => request('DELETE', `/reports/${id}`)
  };



  // Configure API settings
  function configure(options) {
    if (options.baseUrl) {
     options.baseUrl = normalizeBaseUrl(options.baseUrl);
    }
    Object.assign(CONFIG, options);
    if (options.debug !== undefined) {
     console.log(`[API] Debug mode: ${options.debug ? 'ON' : 'OFF'}`);
    }
  }

   // Check if API is available
   function getHealthCheckUrl() {
     const baseUrl = normalizeBaseUrl(CONFIG.baseUrl);
     if (baseUrl.endsWith('/api')) {
       return `${baseUrl.slice(0, -4)}/health`;
     }
     return `${baseUrl}/health`;
   }

   async function checkConnection() {
     const url = getHealthCheckUrl();
     try {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 5000);
       const response = await fetch(url, { method: 'GET', signal: controller.signal });
       clearTimeout(timeoutId);
       return response.ok;
     } catch (error) {
       return false;
     }
    }

   async function health() {
     return get('/health');
   }

   async function metrics() {
     return get('/metrics');
   }

   async function statusMetrics() {
     return get('/status/metrics');
   }

   /* ---- Server connection monitor ---- */

   async function checkServerConnection() {
     const wasOnline = _serverOnline;
     const isOnline = await checkConnection();
     _serverOnline = isOnline;

     if (wasOnline !== isOnline) {
       if (isOnline) {
         console.log('[API] Server is back online');
         window.dispatchEvent(new CustomEvent('yems:server-up'));
       } else {
         console.warn('[API] Server went offline');
         window.dispatchEvent(new CustomEvent('yems:server-down'));
       }
     }
   }

   function startServerMonitor() {
     if (_serverMonitorInterval) return;
     checkServerConnection();
     _serverMonitorInterval = setInterval(checkServerConnection, SERVER_MONITOR_INTERVAL);
   }

   function stopServerMonitor() {
     if (_serverMonitorInterval) {
       clearInterval(_serverMonitorInterval);
       _serverMonitorInterval = null;
     }
   }

   function isServerOnline() {
     return _serverOnline;
   }

   // Initialize
   function init() {
     if (CONFIG.debug) {
       console.log('[API] Initialized with baseUrl:', CONFIG.baseUrl);
     }
     startServerMonitor();
   }

   init();

  return {
    CONFIG,
    configure,
    checkConnection,
    startServerMonitor,
    stopServerMonitor,
    isServerOnline,
    get,
    post,
    put,
    patch,
    delete: del,
    request,
    auth,
    admin,
    users,
    subjects,
    notifications,
    teacher,
    student,
    technician,
    accountant,
    superadmin,
    exams,
    notes,
    assignments,
    results,
    lessons,
    admissions,
    submissions,
    schemes,
    lessonPlans,
    midtermResults,
    reports,
    health
  };
})();

window.API = API;
