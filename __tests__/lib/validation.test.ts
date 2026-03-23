import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  RegisterSchema,
  ConsentRequestSchema,
  ConsentRevokeSchema,
  parseBody,
} from '@/lib/validation';

// ─── LoginSchema ─────────────────────────────────────────────────────────────

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'teacher@kool.ee', password: 'secret123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('teacher@kool.ee'); // already lowercased
    }
  });

  it('trims and lowercases email', () => {
    const result = LoginSchema.safeParse({ email: '  Teacher@Kool.EE  ', password: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('teacher@kool.ee');
  });

  it('rejects missing email', () => {
    expect(LoginSchema.safeParse({ password: 'secret' }).success).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(LoginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });

  it('rejects empty password', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.ee', password: '' }).success).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.ee', password: 'x'.repeat(129) }).success).toBe(false);
  });

  it('rejects email over 254 chars', () => {
    const long = 'a'.repeat(250) + '@b.ee'; // 255 chars > 254 limit
    expect(LoginSchema.safeParse({ email: long, password: 'x' }).success).toBe(false);
  });
});

// ─── RegisterSchema ──────────────────────────────────────────────────────────

describe('RegisterSchema', () => {
  const valid = { name: 'Mari Mägi', email: 'mari@kool.ee', password: 'parool123' };

  it('accepts valid registration', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults missing role gracefully (role is optional)', () => {
    const r = RegisterSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBeUndefined();
  });

  it('accepts valid role values', () => {
    for (const role of ['TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN']) {
      expect(RegisterSchema.safeParse({ ...valid, role }).success).toBe(true);
    }
  });

  it('rejects invalid role', () => {
    expect(RegisterSchema.safeParse({ ...valid, role: 'SUPERADMIN' }).success).toBe(false);
  });

  it('rejects name under 2 chars', () => {
    expect(RegisterSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('rejects password under 8 chars', () => {
    expect(RegisterSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('trims name and lowercases email', () => {
    const r = RegisterSchema.safeParse({ ...valid, name: '  Mari  ', email: 'MARI@KOOL.EE' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe('Mari');
      expect(r.data.email).toBe('mari@kool.ee');
    }
  });
});

// ─── ConsentRequestSchema ────────────────────────────────────────────────────

describe('ConsentRequestSchema', () => {
  const valid = { studentId: 'clxyz123', parentEmail: 'vanem@gmail.com' };

  it('accepts valid consent request', () => {
    expect(ConsentRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts optional parentName', () => {
    const r = ConsentRequestSchema.safeParse({ ...valid, parentName: 'Jüri Mägi' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parentName).toBe('Jüri Mägi');
  });

  it('rejects missing studentId', () => {
    expect(ConsentRequestSchema.safeParse({ parentEmail: 'x@x.ee' }).success).toBe(false);
  });

  it('rejects invalid parentEmail', () => {
    expect(ConsentRequestSchema.safeParse({ studentId: 'abc', parentEmail: 'not-email' }).success).toBe(false);
  });

  it('lowercases parentEmail', () => {
    const r = ConsentRequestSchema.safeParse({ studentId: 'abc', parentEmail: 'PARENT@GMAIL.COM' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parentEmail).toBe('parent@gmail.com');
  });

  it('trims parentName', () => {
    const r = ConsentRequestSchema.safeParse({ ...valid, parentName: '  Jüri  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.parentName).toBe('Jüri');
  });

  it('rejects parentName over 100 chars', () => {
    expect(ConsentRequestSchema.safeParse({ ...valid, parentName: 'x'.repeat(101) }).success).toBe(false);
  });
});

// ─── ConsentRevokeSchema ─────────────────────────────────────────────────────

describe('ConsentRevokeSchema', () => {
  it('accepts valid consentGrantId', () => {
    expect(ConsentRevokeSchema.safeParse({ consentGrantId: 'clxyz123' }).success).toBe(true);
  });

  it('rejects missing consentGrantId', () => {
    expect(ConsentRevokeSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(ConsentRevokeSchema.safeParse({ consentGrantId: '' }).success).toBe(false);
  });
});

// ─── parseBody helper ────────────────────────────────────────────────────────

describe('parseBody', () => {
  it('returns success:true and data on valid input', () => {
    const result = parseBody(LoginSchema, { email: 'a@b.ee', password: 'secret' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('a@b.ee');
      expect(result.error).toBeNull();
    }
  });

  it('returns success:false and Estonian error message on invalid input', () => {
    const result = parseBody(LoginSchema, { email: 'not-email', password: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Vigane e-posti aadress');
      expect(result.data).toBeNull();
    }
  });

  it('handles completely null/undefined input gracefully', () => {
    const result = parseBody(LoginSchema, null);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it('handles non-object input gracefully', () => {
    const result = parseBody(LoginSchema, 'just a string');
    expect(result.success).toBe(false);
  });
});
