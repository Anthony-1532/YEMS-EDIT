import { api } from './client';
import type { ApiResponse, User } from './types';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

interface LoginPayload {
  user: User;
  tokens?: { accessToken?: string; refreshToken?: string };
  token?: string;
  refreshToken?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await api.post<ApiResponse<LoginPayload> & LoginPayload>('/auth/login', { email, password }, false);
  const payload = (res.data || res) as LoginPayload;
  const accessToken = payload.tokens?.accessToken || payload.token;
  const refreshToken = payload.tokens?.refreshToken || payload.refreshToken;
  if (!payload.user || !accessToken) {
    throw new Error('Login failed: no token received');
  }
  return { user: payload.user, accessToken, refreshToken };
}

export async function me(): Promise<User | null> {
  try {
    const res = await api.get<ApiResponse<User> & { data?: User }>('/auth/me');
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch {
    // ignore
  }
}
