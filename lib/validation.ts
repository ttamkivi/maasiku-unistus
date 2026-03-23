import { z } from 'zod';

// Auth
export const LoginSchema = z.object({
  email: z.string({ required_error: 'E-posti aadress on kohustuslik' })
    .trim().toLowerCase().email('Vigane e-posti aadress').max(254),
  password: z.string({ required_error: 'Parool on kohustuslik' })
    .min(1, 'Parool on kohustuslik').max(128),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Nimi peab olema vähemalt 2 tähemärki').max(100),
  email: z.string().trim().toLowerCase().email('Vigane e-posti aadress').max(254),
  password: z.string().min(8, 'Parool peab olema vähemalt 8 tähemärki').max(128),
  role: z.enum(['TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN']).optional(),
});

// Consent
export const ConsentRequestSchema = z.object({
  studentId: z.string().min(1).max(36),
  parentEmail: z.string().trim().toLowerCase().email('Vigane e-posti aadress').max(254),
  parentName: z.string().trim().max(100).optional(),
});

export const ConsentRevokeSchema = z.object({
  consentGrantId: z.string().min(1).max(36),
});

// Generic helpers — returns a discriminated union; check .error before accessing .data
export type ParseResult<T> =
  | { success: true;  data: T;    error: null }
  | { success: false; data: null; error: string };

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data, error: null };
  const firstIssue = result.error.issues[0];
  return { success: false, data: null, error: firstIssue?.message ?? 'Vigane sisend' };
}
