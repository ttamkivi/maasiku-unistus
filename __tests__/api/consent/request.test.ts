import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: { count: vi.fn(), create: vi.fn() },
    session: { findUnique: vi.fn() },
    teacherProfile: { findUnique: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    consentRequest: { create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// Mock Resend to avoid real email sends (must use class syntax for `new` to work)
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn().mockResolvedValue({ id: 'email-1' }) };
  },
}));

// Mock next/headers (used by the route via cookies())
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'valid-session-token' }),
  }),
}));

import { POST } from '@/app/api/consent/request/route';
import { db } from '@/lib/db';

const mockAuditLogCount     = vi.mocked(db.auditLog.count);
const mockSessionFindUnique = vi.mocked(db.session.findUnique);
const mockTeacherFindUnique = vi.mocked(db.teacherProfile.findUnique);
const mockStudentFindUnique = vi.mocked(db.studentProfile.findUnique);
const mockConsentCreate     = vi.mocked(db.consentRequest.create);

const SESSION = {
  expiresAt: new Date(Date.now() + 86400_000),
  user: { id: 'user-1', role: 'TEACHER', name: 'Mari Mägi' },
};
const TEACHER = { id: 'teacher-1' };
const STUDENT = { id: 'student-1', user: { name: 'Jaan Tamm' } };

function makeRequest(body: unknown, ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/consent/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditLogCount.mockResolvedValue(0);
  mockSessionFindUnique.mockResolvedValue(SESSION as never);
  mockTeacherFindUnique.mockResolvedValue(TEACHER as never);
  mockStudentFindUnique.mockResolvedValue(STUDENT as never);
  mockConsentCreate.mockResolvedValue({ id: 'req-1' } as never);
});

describe('POST /api/consent/request — input validation', () => {
  it('returns 400 for missing studentId', async () => {
    const res = await POST(makeRequest({ parentEmail: 'vanem@gmail.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid parentEmail', async () => {
    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'not-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for parentName over 100 chars', async () => {
    const res = await POST(makeRequest({
      studentId: 's-1',
      parentEmail: 'p@p.ee',
      parentName: 'x'.repeat(101),
    }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/consent/request — rate limiting', () => {
  it('returns 429 when IP has sent ≥5 consent emails in the last hour', async () => {
    mockAuditLogCount.mockResolvedValue(5);

    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'p@p.ee' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/liiga palju/i);
  });

  it('allows request when count is below threshold', async () => {
    mockAuditLogCount.mockResolvedValue(4);

    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'p@p.ee' }));
    // Should proceed past rate limit — may succeed or fail for other reasons
    expect(res.status).not.toBe(429);
  });
});

describe('POST /api/consent/request — auth checks', () => {
  it('returns 401 when no session', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'p@p.ee' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-TEACHER role', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({
      ...SESSION,
      user: { ...SESSION.user, role: 'STUDENT' },
    } as never);

    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'p@p.ee' }));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/consent/request — happy path', () => {
  it('creates consent request and returns 200', async () => {
    const res = await POST(makeRequest({ studentId: 's-1', parentEmail: 'vanem@gmail.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe('req-1');
  });

  it('creates consent request in DB with correct fields', async () => {
    await POST(makeRequest({
      studentId: 's-1',
      parentEmail: 'VANEM@GMAIL.COM',
      parentName: 'Külli Tamm',
    }));

    expect(mockConsentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        studentId: 's-1',
        parentEmail: 'vanem@gmail.com', // lowercased by Zod
        parentName: 'Külli Tamm',
        status: 'PENDING',
      }),
    }));
  });
});
