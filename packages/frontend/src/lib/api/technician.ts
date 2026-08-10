import { api } from './client';
import type { ApiResponse } from './types';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error || res.message || 'Request failed');
  return res.data as T;
}

export interface SystemHealth {
  status: string;
  api: boolean;
  database: boolean;
  uptime: number;
  hostname: string;
  cpus: number;
  loadAvg: number[];
  freeMemory: number;
  totalMemory: number;
  version: string;
  environment: string;
  activeSessions: number;
  timestamp: string;
}

export interface EnhancedDiagnostics {
  dbLatency: number;
  dbStatus: string;
  userCounts: {
    total: number;
    students?: number;
    teachers?: number;
    admins?: number;
    [key: string]: number | undefined;
  };
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
    cpus: number;
    memory: string;
    uptime: string;
    environment: string;
  };
  recentAuditEntries: AuditLogEntry[];
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorName?: string | null;
  actor?: string | null;
  details: string;
  timestamp: string;
  status: string;
}

export interface SystemService {
  name: string;
  displayName: string;
  status: string;
  type: string;
  throughput: string;
  limit: string;
}

export interface SystemQueue {
  name: string;
  displayName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  concurrency: number;
}

export interface RbacPolicy {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveDevice {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  status: 'active';
  lastSeen: string;
  expiresAt: string;
  sessionAge: number;
}

export interface DeviceTelemetry {
  sessionId: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  session: {
    createdAt: string;
    expiresAt: string;
    ageMinutes: number;
  };
  telemetryEvents?: Array<{ type: string; timestamp: number; details: any }>;
  serverMetrics: {
    uptime: number;
    memoryUsed: string;
    memoryTotal: string;
    loadAvg: number[];
    cpus: number;
  };
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: string;
  createdAt: string;
  acknowledged: boolean;
}

export const technicianApi = {
  getHealth: () =>
    api.get<ApiResponse<SystemHealth>>('/technician/system/health').then(unwrap),
  getEnhancedDiagnostics: () =>
    api.get<ApiResponse<EnhancedDiagnostics>>('/technician/system/diagnostics/enhanced').then(unwrap),
  getServices: () =>
    api.get<ApiResponse<SystemService[]>>('/technician/system/services').then(unwrap),
  getQueues: () =>
    api.get<ApiResponse<SystemQueue[]>>('/technician/system/queues').then(unwrap),
  getLogs: (params?: { limit?: number; entityType?: string; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.action) qs.set('action', params.action);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<AuditLogEntry[]>>(`/technician/system/logs${suffix}`).then(unwrap);
  },
  restartService: (serviceName: string) =>
    api.post<ApiResponse<{ service: string; status: string; message: string }>>(`/technician/services/${serviceName}/restart`, {}).then(unwrap),
  getRbacPolicies: () =>
    api.get<ApiResponse<RbacPolicy[]>>('/technician/rbac/policies').then(unwrap),
  getDevices: () =>
    api.get<ApiResponse<ActiveDevice[]>>('/technician/devices').then(unwrap),
  getDeviceTelemetry: (deviceId: string) =>
    api.get<ApiResponse<DeviceTelemetry>>(`/technician/devices/${deviceId}/telemetry`).then(unwrap),
  revokeDeviceSession: (deviceId: string) =>
    api.delete<ApiResponse<null>>(`/technician/devices/${deviceId}`).then(unwrap),
  getAlerts: () =>
    api.get<ApiResponse<SystemAlert[]>>('/technician/alerts').then(unwrap),
  acknowledgeAlert: (alertId: string, resolutionNote?: string) =>
    api.patch<ApiResponse<{ id: string; status: string }>>(`/technician/alerts/${alertId}/acknowledge`, { resolutionNote }).then(unwrap),
};
