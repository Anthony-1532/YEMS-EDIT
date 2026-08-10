// Core fetch wrapper for the YEMS backend API.

const TOKEN_KEY = 'yems_token';
const REFRESH_KEY = 'yems_refresh_token';

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    const serverBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!serverBaseUrl) {
      throw new Error('NEXT_PUBLIC_API_BASE_URL must be set for server-side API requests');
    }
    return normalizeBaseUrl(serverBaseUrl);
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  }
  // Always use /api (proxied through Next.js rewrites) to avoid CORS
  return '/api';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
  sessionStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(endpoint: string): string {
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (cleanEndpoint.endsWith('/') && cleanEndpoint.length > 1) {
    cleanEndpoint = cleanEndpoint.slice(0, -1);
  }
  return `${getApiBaseUrl()}/${cleanEndpoint}`;
}

interface RequestOptions {
  includeAuth?: boolean;
  isFormData?: boolean;
}

export async function request<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { includeAuth = true, isFormData = false } = options;
  const url = buildUrl(endpoint);
  const headers: Record<string, string> = {};

  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (includeAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (data !== undefined && data !== null) {
    init.body = isFormData ? (data as BodyInit) : JSON.stringify(data);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  init.signal = controller.signal;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    clearTimeout(timeoutId);
    throw new ApiError('Network error — could not reach server', 0);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yems-session-expired'));
      }
    }
    let errorData: { message?: string; error?: string; code?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new ApiError(
      errorData.message || errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData.code
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return { success: true } as unknown as T;
}

export const api = {
  get: <T>(endpoint: string, includeAuth = true) => request<T>('GET', endpoint, null, { includeAuth }),
  post: <T>(endpoint: string, data?: unknown, includeAuth = true) =>
    request<T>('POST', endpoint, data, { includeAuth }),
  put: <T>(endpoint: string, data?: unknown, includeAuth = true) =>
    request<T>('PUT', endpoint, data, { includeAuth }),
  patch: <T>(endpoint: string, data?: unknown, includeAuth = true) =>
    request<T>('PATCH', endpoint, data, { includeAuth }),
  delete: <T>(endpoint: string, includeAuth = true) => request<T>('DELETE', endpoint, null, { includeAuth }),
};
