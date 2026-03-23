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

// Auth continued
export const ForgotPasswordSchema = z.object({
  email: z.string({ required_error: 'E-posti aadress on kohustuslik' })
    .trim().toLowerCase().email('Vigane e-posti aadress').max(254),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(128),
  password: z.string({ required_error: 'Parool on kohustuslik' })
    .min(8, 'Parool peab olema vähemalt 8 tähemärki').max(128),
});

// Consent continued
export const ConsentRespondSchema = z.object({
  token: z.string().min(1).max(128),
  response: z.enum(['approve', 'decline']),
  declineReason: z.string().trim().max(500).optional(),
});

// Tests
export const CreateTestSchema = z.object({
  title: z.string().trim().min(1, 'Pealkiri on kohustuslik').max(200),
  subjectId: z.string().min(1).max(36),
  class: z.string().trim().max(50).optional(),
  topic: z.string().trim().max(200).optional(),
  rubric: z.string().trim().max(5000).optional(),
  answerKey: z.string().trim().max(5000).optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

export const ConsentCheckActionSchema = z.object({
  action: z.enum(['merge', 'delete_without_consent']),
  consentedNames: z.array(z.string().trim().max(100)).optional(),
});

// Exercises
export const CreateExerciseSchema = z.object({
  subjectId: z.string().min(1).max(36),
  topic: z.string().trim().min(1, 'Teema on kohustuslik').max(200),
  photos: z.array(z.string().min(1)).min(1, 'Vähemalt üks foto on kohustuslik').max(20),
  rubric: z.string().trim().max(5000).optional(),
});

// User feedback to devs
export const UserFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'other']),
  message: z.string().trim().min(1, 'Sõnum on kohustuslik').max(2000),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('')),
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
