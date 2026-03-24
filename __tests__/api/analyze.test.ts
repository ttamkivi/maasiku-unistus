import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks (must come before route import) ────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    session:    { findUnique: vi.fn() },
    testResult: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/claude', () => ({
  analyzeTest: vi.fn().mockResolvedValue({ summary: 'Hea töö.', details: [] }),
}));

vi.mock('@/lib/consent', () => ({
  hasAIConsent: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from '@/app/api/analyze/route';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hasAIConsent } from '@/lib/consent';

const mockCookies       = vi.mocked(cookies);
const mockSessionFind   = vi.mocked(db.session.findUnique);
const mockResultFind    = vi.mocked(db.testResult.findUnique);
const mockHasAIConsent  = vi.mocked(hasAIConsent);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  klass: '9.B',
  teema: 'Mehaanika',
  opilane: 'Mari Mägi',
  images: ['data:image/jpeg;base64,abc123'],
};

function makeSession(role: string) {
  return {
    expiresAt: new Date(Date.now() + 1_000_000),
    user: {
      id: 'user-1',
      role,
      teacherProfile: role === 'TEACHER' ? { id: 'tp-1' } : null,
    },
  };
}

function setupCookies(token: string | null) {
  const store = {
    get: (name: string) => (name === 'mu_session' && token ? { value: token } : undefined),
  };
  mockCookies.mockResolvedValue(store as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no rate-limit issue — use unique IPs per test suite
});

// ─── 10a. Auth tests ──────────────────────────────────────────────────────────

describe('POST /api/analyze — auth', () => {
  it('returns 401 when no session cookie is present', async () => {
    setupCookies(null);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.1'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/logi sisse/i);
  });

  it('returns 401 when session token is not found in DB', async () => {
    setupCookies('invalid-token');
    mockSessionFind.mockResolvedValueOnce(null);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.2'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when session is expired', async () => {
    setupCookies('expired-token');
    mockSessionFind.mockResolvedValueOnce({
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1', role: 'TEACHER', teacherProfile: { id: 'tp-1' } },
    } as never);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.3'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/aegunud/i);
  });

  it('returns 403 when role is STUDENT', async () => {
    setupCookies('student-token');
    mockSessionFind.mockResolvedValueOnce(makeSession('STUDENT') as never);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.4'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/õpetajad/i);
  });

  it('returns 403 when role is PARENT', async () => {
    setupCookies('parent-token');
    mockSessionFind.mockResolvedValueOnce(makeSession('PARENT') as never);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.5'));
    expect(res.status).toBe(403);
  });

  it('passes auth for TEACHER role', async () => {
    setupCookies('teacher-token');
    mockSessionFind.mockResolvedValueOnce(makeSession('TEACHER') as never);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.6'));
    // Auth passes — will succeed (200)
    expect(res.status).toBe(200);
  });

  it('passes auth for SCHOOL_ADMIN role', async () => {
    setupCookies('admin-token');
    mockSessionFind.mockResolvedValueOnce(makeSession('SCHOOL_ADMIN') as never);

    const res = await POST(makeRequest(VALID_BODY, '10.0.0.7'));
    expect(res.status).toBe(200);
  });
});

// ─── 10b. Validation tests ────────────────────────────────────────────────────

describe('POST /api/analyze — input validation', () => {
  beforeEach(() => {
    setupCookies('teacher-token');
    mockSessionFind.mockResolvedValue(makeSession('TEACHER') as never);
  });

  it('returns 400 when klass is missing', async () => {
    const { klass: _klass, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body, '10.1.0.1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when klass is empty string', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, klass: '' }, '10.1.0.2'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when images array is empty', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, images: [] }, '10.1.0.3'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/foto/i);
  });

  it('returns 400 when images array has more than 8 items', async () => {
    const res = await POST(makeRequest({
      ...VALID_BODY,
      images: Array(9).fill('data:image/jpeg;base64,abc'),
    }, '10.1.0.4'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 fotot/i);
  });

  it('returns 400 when teema is missing', async () => {
    const { teema: _teema, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body, '10.1.0.5'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when opilane is missing', async () => {
    const { opilane: _opilane, ...body } = VALID_BODY;
    const res = await POST(makeRequest(body, '10.1.0.6'));
    expect(res.status).toBe(400);
  });
});

// ─── 10c. Consent tests ───────────────────────────────────────────────────────

describe('POST /api/analyze — consent', () => {
  beforeEach(() => {
    setupCookies('teacher-token');
    mockSessionFind.mockResolvedValue(makeSession('TEACHER') as never);
  });

  it('returns 404 when testResultId references a non-existent result', async () => {
    mockResultFind.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ ...VALID_BODY, testResultId: 'missing-id' }, '10.2.0.1'));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/tulemust ei leitud/i);
  });

  it('returns 403 with Estonian error when student has no AI consent', async () => {
    mockResultFind.mockResolvedValue({
      testId: 'test-1',
      studentId: 'student-1',
      test: { teacherId: 'tp-1', subjectId: 'subj-1' },
    } as never);
    mockHasAIConsent.mockResolvedValueOnce(false);

    const res = await POST(makeRequest({ ...VALID_BODY, testResultId: 'result-1' }, '10.2.0.2'));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/lapsevanema nõusolek/i);
  });

  it('proceeds with analysis when student has AI consent', async () => {
    mockResultFind.mockResolvedValue({
      testId: 'test-1',
      studentId: 'student-1',
      test: { teacherId: 'tp-1', subjectId: 'subj-1' },
    } as never);
    mockHasAIConsent.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ ...VALID_BODY, testResultId: 'result-1' }, '10.2.0.3'));
    expect(res.status).toBe(200);
  });

  it('skips consent check when no studentId is linked to the result', async () => {
    mockResultFind.mockResolvedValue({
      testId: 'test-1',
      studentId: null,   // no linked student
      test: { teacherId: 'tp-1', subjectId: 'subj-1' },
    } as never);

    const res = await POST(makeRequest({ ...VALID_BODY, testResultId: 'result-1' }, '10.2.0.4'));
    expect(mockHasAIConsent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('skips consent check entirely when no testResultId provided', async () => {
    const res = await POST(makeRequest(VALID_BODY, '10.2.0.5'));
    expect(mockHasAIConsent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
