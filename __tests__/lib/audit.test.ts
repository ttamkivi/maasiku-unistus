import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB before importing audit
vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { audit } from '@/lib/audit';
import { db } from '@/lib/db';

const mockCreate = vi.mocked(db.auditLog.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('audit()', () => {
  it('creates an audit log entry with all provided fields', async () => {
    mockCreate.mockResolvedValueOnce({} as never);

    await audit('LOGIN', {
      userId: 'user-1',
      targetType: 'User',
      targetId: 'user-1',
      details: { role: 'TEACHER' },
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0]![0];
    expect(call.data.action).toBe('LOGIN');
    expect(call.data.userId).toBe('user-1');
    expect(call.data.ipAddress).toBe('1.2.3.4');
    expect(call.data.details).toBe(JSON.stringify({ role: 'TEACHER' }));
  });

  it('creates entry with null fields when opts are omitted', async () => {
    mockCreate.mockResolvedValueOnce({} as never);

    await audit('CRON_CLEANUP');

    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0]![0];
    expect(call.data.userId).toBeNull();
    expect(call.data.details).toBeNull();
    expect(call.data.ipAddress).toBeNull();
  });

  it('NEVER throws even if the DB write fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB connection lost'));

    // Must not throw — audit failure must never break the calling flow
    await expect(audit('LOGIN_FAILED', { ip: '1.2.3.4' })).resolves.toBeUndefined();
  });

  it('NEVER throws even if DB throws synchronously', async () => {
    mockCreate.mockImplementationOnce(() => { throw new Error('sync error'); });

    await expect(audit('DATA_EXPORT')).resolves.toBeUndefined();
  });

  it('logs DB failures to console.error without rethrowing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('timeout'));

    await audit('RESULT_APPROVED');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AuditLog]'),
      'RESULT_APPROVED',
      expect.any(Error)
    );
  });

  it('serialises details as JSON string', async () => {
    mockCreate.mockResolvedValueOnce({} as never);
    const details = { studentId: 's-1', teacherModifiedAI: true };

    await audit('RESULT_APPROVED', { details });

    const call = mockCreate.mock.calls[0]![0];
    expect(JSON.parse(call.data.details as string)).toEqual(details);
  });
});
