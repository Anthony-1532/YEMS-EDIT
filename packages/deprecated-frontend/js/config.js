/* =============================================
   API CONFIG — YEMS Runtime Configuration
   Environment-driven: inject before loading via:
   <script>window.YEMS_ENV = 'production';</script>
   <script src="js/config.js"></script>
   ============================================= */

// Get environment from window or default to development
const ENV = window.YEMS_ENV || 'development';

// Determine API base URL early - this MUST be set before api.js loads
function getApiBaseUrl() {
  // Explicit override (highest priority)
  if (window.YEMS_API_BASE_URL) {
    return window.YEMS_API_BASE_URL;
  }
  
  // Determine if we're running behind Caddy (port 80/443/8080) vs direct local dev
  // Port 8080 is the docker-compose Caddy exposure: host:8080 → caddy:80 → backend:8080
  const isDockerOrProduction = !window.location.port || window.location.port === '80' || window.location.port === '443' || window.location.port === '8080';

  // If served through Caddy (80/443/8080), use relative /api (Caddy proxies it to the backend)
  // If opened on any other port (local dev without Docker), hit the backend directly on :4000
  if (isDockerOrProduction) {
    return '/api';  // relative to current origin (Caddy proxies /api to backend)
  } else {
    return `http://${window.location.hostname}:4000/api`;  // direct backend access in dev
  }
}

// Set the API base URL globally BEFORE api.js loads
window.YEMS_API_BASE_URL = getApiBaseUrl();

// Get API config
function getApiConfig() {
  return {
    baseUrl: window.YEMS_API_BASE_URL,
    timeout: 30000,
    debug: true,
    autoSync: true
  };
}

// Rest of config
window.YEMS_CONFIG = window.YEMS_CONFIG || {
  API: getApiConfig(),
  ENV: ENV,
  AUTH: {
    tokenRefreshThreshold: 300,
    autoLogoutOnExpiry: true,
    rememberMeDefault: false
  },
  APP: {
    name: 'Yeshua Educational Platform',
    version: '1.1.0',
    session: '2024/2025',
    term: 'Second Term'
  },
  FEATURES: {
    enableRemoteAuth: true,
    enableSync: true,
    enableNotifications: true,
    enableLiveClasses: true
  }
};

if (window.API && typeof API.configure === 'function') {
  API.configure({
    baseUrl: window.YEMS_CONFIG.API.baseUrl,
    timeout: window.YEMS_CONFIG.API.timeout,
    debug: window.YEMS_CONFIG.API.debug
  });
}


