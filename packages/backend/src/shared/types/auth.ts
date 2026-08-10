import type { User } from '../../db/schema/users.js';

export type Role = User['role'];

declare global {
  interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: Role;
  }
}

export interface AuthPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}