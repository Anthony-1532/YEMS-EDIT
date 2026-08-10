import { db } from '../../config/db.js';
import { auditLogs } from '../../db/schema/audit-logs.js';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorId: string;
  details?: Record<string, unknown> | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorId: entry.actorId,
      details: entry.details ?? null,
    });
  } catch {
    // Audit failures must never break the main request
  }
}
