import { db } from './db';

/**
 * Write an audit log entry. Never throws — audit failure must not break the calling flow.
 */
export async function audit(
  action: string,
  opts: {
    userId?: string;
    targetType?: string;
    targetId?: string;
    details?: object;
    ip?: string | null;
    userAgent?: string | null;
    consentRequestId?: string;
  } = {}
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        userId: opts.userId ?? null,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        details: opts.details ? JSON.stringify(opts.details) : null,
        ipAddress: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
        consentRequestId: opts.consentRequestId ?? null,
      },
    });
  } catch (e) {
    console.error('[AuditLog] write failed:', action, e);
  }
}
