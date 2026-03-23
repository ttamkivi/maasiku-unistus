import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks (must come before the route import) ───────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: { count: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    session: { create: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { POST } from '@/app/api/auth/login/route';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

const mockAuditLogCount  = vi.mocked(db.auditLog.count);
const mockUserFindUnique = vi.mocked(db.user.findUnique);
const mockSessionCreate  = vi.mocked(db.session.create);
const mockAudit          = vi.mocked(audit);
const mockBcryptCompare  = vi.mocked(bcrypt.compare);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_USER = {
  id: 'user-1',
  name: 'Mari Mägi',
  email: 'mari@kool.ee',
  password: '$2b$12$hashed',
  role: 'TEACHER',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no recent failures, DB healthy
  mockAuditLogCount.mockResolvedValue(0);
  mockSessionCreate.mockResolvedValue({} as never);
  mockAuditLogCount.mockResolvedValue(0);
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/auth/login — input validation', () => {
  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({ password: 'secret123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/e-post/i);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'x' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty password', async () => {
    const res = await POST(makeRequest({ email: 'a@b.ee', password: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-object body', async () => {
    const res = await POST(makeRequest('just a string'));
    expect(res.status).toBe(400);
  });
});

// ─── Brute-force rate limiting ────────────────────────────────────────────────

describe('POST /api/auth/login — brute-force protection', () => {
  it('returns 429 when IP has ≥10 recent LOGIN_FAILED entries', async () => {
    mockAuditLogCount.mockResolvedValue(10);

    const res = await POST(makeRequest({ email: 'a@b.ee', password: 'x' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/liiga palju/i);
  });

  it('emits LOGIN_BLOCKED audit event when blocked', async () => {
    mockAuditLogCount.mockResolvedValue(15);

    await POST(makeRequest({ email: 'a@b.ee', password: 'x' }));
    expect(mockAudit).toHaveBeenCalledWith('LOGIN_BLOCKED', expect.objectContaining({
      details: expect.objectContaining({ reason: 'brute_force' }),
    }));
  });

  it('allows login when failure count is below threshold', async () => {
    mockAuditLogCount.mockResolvedValue(9);
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ email: 'a@b.ee', password: 'x' }));
    // Gets to the user lookup, not blocked — so 401 not 429
    expect(res.status).toBe(401);
  });

  it('queries auditLog with correct action and IP', async () => {
    mockAuditLogCount.mockResolvedValue(0);
    mockUserFindUnique.mockResolvedValueOnce(null);

    await POST(makeRequest({ email: 'a@b.ee', password: 'x' }, '5.6.7.8'));

    expect(mockAuditLogCount).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: 'LOGIN_FAILED',
        ipAddress: '5.6.7.8',
      }),
    }));
  });
});

// ─── Authentication logic ─────────────────────────────────────────────────────

describe('POST /api/auth/login — authentication', () => {
  it('returns 401 for unknown email', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ email: 'ghost@kool.ee', password: 'x' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Vale e-post või parool');
  });

  it('audits LOGIN_FAILED for unknown email', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    await POST(makeRequest({ email: 'ghost@kool.ee', password: 'x' }));
    expect(mockAudit).toHaveBeenCalledWith('LOGIN_FAILED', expect.any(Object));
  });

  it('returns 401 for wrong password', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(false as never);

    const res = await POST(makeRequest({ email: 'mari@kool.ee', password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('audits LOGIN_FAILED with userId for wrong password', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(false as never);

    await POST(makeRequest({ email: 'mari@kool.ee', password: 'wrong' }));
    expect(mockAudit).toHaveBeenCalledWith('LOGIN_FAILED', expect.objectContaining({
      userId: 'user-1',
    }));
  });

  it('returns 200 with user data on correct credentials', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(true as never);

    const res = await POST(makeRequest({ email: 'mari@kool.ee', password: 'correct' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.email).toBe('mari@kool.ee');
    expect(body.user.role).toBe('TEACHER');
    // Password must NOT be in the response
    expect(body.user.password).toBeUndefined();
  });

  it('sets httpOnly session cookie on successful login', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(true as never);

    const res = await POST(makeRequest({ email: 'mari@kool.ee', password: 'correct' }));
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toMatch(/mu_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('creates a session in the DB on successful login', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(true as never);

    await POST(makeRequest({ email: 'mari@kool.ee', password: 'correct' }));
    expect(mockSessionCreate).toHaveBeenCalledOnce();
  });

  it('audits LOGIN event on successful login', async () => {
    mockUserFindUnique.mockResolvedValueOnce(VALID_USER as never);
    mockBcryptCompare.mockResolvedValueOnce(true as never);

    await POST(makeRequest({ email: 'mari@kool.ee', password: 'correct' }));
    expect(mockAudit).toHaveBeenCalledWith('LOGIN', expect.objectContaining({
      userId: 'user-1',
    }));
  });

  it('normalises email before lookup (trims + lowercases)', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);

    await POST(makeRequest({ email: '  MARI@Kool.EE  ', password: 'x' }));
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { email: 'mari@kool.ee' } });
  });
});
