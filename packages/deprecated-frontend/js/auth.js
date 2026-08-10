const Auth = (() => {
    const SESSION_KEY = 'yep_session';
    const TOKEN_KEY = 'yep_token';
    const REFRESH_KEY = 'yep_refresh_token';

    const ROLE_ROUTES = {
        student: 'home',
        teacher: 'teacher-home',
        admin: 'admin-home',
        superadmin: 'superadmin-home',
        principal: 'principal-home',
        hod: 'hod-home',
        accountant: 'accountant-home',
        platform_admin: 'superadmin-home',
        technician: 'technician-home',
        parent: 'parent-home'
    };

    // API Base URL from centralized config
    const API_BASE = window.YEMS_API_BASE_URL || (window.location.port ? `http://${window.location.hostname}:4000/api` : '/api');

    function normalizeAssignedList(value) {
        if (Array.isArray(value)) {
            return value
                .map((entry) => {
                    if (typeof entry === 'string') return entry.trim();
                    if (entry && typeof entry === 'object') {
                        const fromObject = entry.name ?? entry.label ?? entry.value;
                        return typeof fromObject === 'string' ? fromObject.trim() : '';
                    }
                    return '';
                })
                .filter(Boolean);
        }

        if (typeof value === 'string') {
            const raw = value.trim();
            if (!raw) return [];

            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return normalizeAssignedList(parsed);
                }
            } catch {
            }

            return raw
                .replace(/[{}]/g, '')
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean);
        }

        return [];
    }

    function normalizeSession(session) {
        return {
            ...session,
            assignedSubjects: normalizeAssignedList(session.assignedSubjects),
            assignedClasses: normalizeAssignedList(session.assignedClasses),
            isClassTeacher: session.isClassTeacher === true || !!session.classTeacherOf,
            classTeacherOf: session.classTeacherOf || '',
            teacherId: session.teacherId || ''
        };
    }

    function current() {
        try {
            const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            const token = getToken();
            if (!session || !token) return null;
            const normalizedSession = normalizeSession(session);
            const subjectsChanged = JSON.stringify(normalizedSession.assignedSubjects) !== JSON.stringify(session.assignedSubjects);
            const classesChanged = JSON.stringify(normalizedSession.assignedClasses) !== JSON.stringify(session.assignedClasses);
            if (subjectsChanged || classesChanged) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));
            }
            return normalizedSession;
        } catch { return null; }
    }

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function getRefreshToken() {
        return sessionStorage.getItem(REFRESH_KEY);
    }

    function getRedirectRoute(role) {
        return ROLE_ROUTES[role] || 'home';
    }

    // Store tokens and session
    function storeSession(user, accessToken, refreshToken, remember) {
        const session = {
            id: user.id || user.userId,
            name: user.name || user.fullName,
            email: user.email,
            role: user.role || (user.roles && user.roles[0]?.name) || 'student',
            roles: user.roles || [],
            assignedSubjects: normalizeAssignedList(user.assignedSubjects),
            assignedClasses: normalizeAssignedList(user.assignedClasses),
            isClassTeacher: user.isClassTeacher === true || !!user.classTeacherOf,
            classTeacherOf: user.classTeacherOf || '',
            teacherId: user.teacherId || '',
            token: accessToken
        };

        const storage = sessionStorage;
        storage.setItem(SESSION_KEY, JSON.stringify(session));
        storage.setItem(TOKEN_KEY, accessToken);
        if (refreshToken) {
            storage.setItem(REFRESH_KEY, refreshToken);
        }

        console.log('[Auth] Session stored for user:', session.id);
    }

    // Clear session
    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
    }

    // Login with remote API
    async function loginRemote(email, password) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            console.log('[Auth] Attempting login for:', email);

            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[Auth] Login response status:', response.status);

            if (!response.ok) {
                let errorText = await response.text().catch(() => '');
                console.error('[Auth] Login error response:', errorText);

                try {
                    const error = JSON.parse(errorText);
                    throw new Error(error.message || error.error || `HTTP ${response.status}`);
                } catch (e) {
                    throw new Error(`Login failed: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('[Auth] Login successful:', data);

            // API returns: { success: true, data: { user: {...}, tokens: { accessToken, refreshToken } } }
            const userData = data.data || data;
            const user = userData.user || userData;
            const tokens = userData.tokens || {};
            const token = tokens.accessToken || userData.token || data.token;
            const refreshToken = tokens.refreshToken || userData.refreshToken || data.refreshToken;

            return { user, token, refreshToken };
        } catch (error) {
            console.warn('[Auth] Remote login failed:', error.message);
            throw error;
        }
    }

    // Refresh token with remote API
    async function refreshRemote(refreshToken) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Refresh failed');
            }

            const data = await response.json();
            const tokenData = data.data || data;
            const tokens = tokenData.tokens || tokenData;

            return {
                accessToken: tokens.accessToken || tokens.token,
                refreshToken: tokens.refreshToken || tokens.refresh_token
            };
        } catch (error) {
            console.warn('Refresh token failed:', error.message);
            throw error;
        }
    }

    // Get current user from remote API
    async function fetchCurrentUser() {
        try {
            const token = getToken();
            if (!token) return null;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${API_BASE}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.warn('Fetch user failed:', error.message);
            return null;
        }
    }

    function login(email, password, remember = false) {
  console.log('[Auth] Login called for:', email);
  
  return loginRemote(email, password)
    .then(data => {
      console.log('[Auth] Login success:', data);
      
      const { user, token, refreshToken } = data;
      
       if (token && user) {
         storeSession(user, token, refreshToken, remember);
         console.log('[Auth] Logged in via remote API');
         window.DataSync?.refreshCore().catch(error => {
           console.warn('[Auth] Initial data sync failed:', error?.message || error);
         });
         // Return result object for compatibility
         return { ok: true, user, token, refreshToken };
        } else {
            console.error('[Auth] No token or user in response');
            if (window.UI) {
                window.UI.toast('Login failed: No token received', 'error');
            }
            const errObj = { ok: false, error: 'No token received', err: 'No token received' };
            return errObj;
        }
    })
       .catch((error) => {
        console.error('[Auth] Remote login error:', error.message);
        if (window.UI) {
            window.UI.toast('Login failed: ' + error.message, 'error');
        }
        return { ok: false, error: error.message, err: error.message };
    });
   }

async function register(name, email, password) {
    try {
        if (password.length < 6) {
            return { ok: false, err: 'Password must be at least 6 characters.' };
        }

        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let message = `Registration failed: ${response.status}`;
            try {
                const parsed = JSON.parse(errorText);
                message = parsed.message || parsed.error || message;
            } catch (parseErr) {
                console.error('[Auth] Failed to parse registration error response:', parseErr);
            }
            return { ok: false, err: message };
        }

        const payload = await response.json();
        const data = payload.data || payload;
        const user = data.user || data;
        const tokens = data.tokens || {};
        const accessToken = tokens.accessToken || data.token;
        const refreshToken = tokens.refreshToken || data.refreshToken;

        if (!user || !accessToken) {
            return { ok: false, err: 'Registration succeeded but no token was returned.' };
        }

        storeSession(user, accessToken, refreshToken, false);
        window.DataSync?.refreshCore().catch(() => { });
        return { ok: true, user };
    } catch (error) {
        return { ok: false, err: error.message || 'Registration failed' };
    }
}

function logout() {
    clearSession();
}

function isLoggedIn() { return !!current(); }

function guard(allowedRoles = []) {
    if (!isLoggedIn()) { Router.go('login'); return false; }
    const user = current();
    const adminRoles = ['admin', 'superadmin', 'principal', 'hod', 'platform_admin'];
    const allAllowedRoles = [...allowedRoles, ...adminRoles];
    if (allowedRoles.length && !allAllowedRoles.includes(user.role)) {
        Router.go(getRedirectRoute(user.role));
        return false;
    }
    return true;
}

async function updateProfile(name, email) {
    const c = current();
    if (!c) return { ok: false, err: 'Not logged in' };

    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() })
        });
        const json = await res.json();
        if (!json.success) {
            return { ok: false, err: json.message || 'Failed to update profile' };
        }
    } catch (e) {
        return { ok: false, err: 'Network error — could not reach server' };
    }

    const users = getAppUsers();
    const idx = users.findIndex(u => u.id === c.id);
    if (idx >= 0) {
        users[idx].name = name.trim();
        users[idx].email = email.trim().toLowerCase();
        users[idx].initials = name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
        saveAppUsers(users);
    }

    const updatedSession = { ...c, name: name.trim(), email: email.trim().toLowerCase(), initials: name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) };
    if (sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));

    return { ok: true, user: updatedSession };
}

async function updatePassword(oldPass, newPass) {
    const c = current();
    if (!c) return { ok: false, err: 'Not logged in' };

    if (newPass.length < 6) return { ok: false, err: 'New password must be at least 6 characters.' };

    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });
        const json = await res.json();
        if (!json.success) {
            return { ok: false, err: json.message || 'Failed to change password' };
        }
    } catch (e) {
        return { ok: false, err: 'Network error — could not reach server' };
    }

    return { ok: true };
}

// Auto-refresh token if needed
async function ensureValidToken() {
    const token = getToken();
    const refreshToken = getRefreshToken();

    if (!token) return null;

    // Try to fetch current user to validate token
    const user = await fetchCurrentUser();
    if (user) return token;

    // Token invalid, try refresh
    if (refreshToken) {
        try {
            const data = await refreshRemote(refreshToken);
            const newAccessToken = data.accessToken || data.token || data.access_token;
            const newRefreshToken = data.refreshToken || data.refresh_token;

            if (newAccessToken) {
                const storage = sessionStorage;
                storage.setItem(TOKEN_KEY, newAccessToken);
                if (newRefreshToken) {
                    storage.setItem(REFRESH_KEY, newRefreshToken);
                }
                return newAccessToken;
            }
        } catch (e) {
            clearSession();
        }
    }

    return null;
}

return {
    current,
    getToken,
    login,
    register,
    logout,
    isLoggedIn,
    guard,
    updateProfile,
    updatePassword,
    getRedirectRoute,
    fetchCurrentUser,
    ensureValidToken
};
}) ();
