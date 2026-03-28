import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';
import { Role, User } from './generated/prisma/client';

export const SESSION_COOKIE = 'ot_session';
export const PREVIEW_ROLE_COOKIE = 'ot_preview_role';
export const SESSION_DURATION_DAYS = 30;

/**
 * Valid roles that SUPERADMIN can preview.
 * Must match the Role enum in Prisma schema.
 */
const VALID_PREVIEW_ROLES: string[] = [
  'SUPERADMIN', 'SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'KLASSIJUHATAJA', 'STUDENT', 'PARENT',
];

/**
 * Get the effective role for the current request.
 * If the real user is SUPERADMIN and has an ot_preview_role cookie set,
 * returns the preview role. Otherwise returns the user's real role.
 * Also returns `realRole` so callers can check if this is an impersonation.
 */
export function getEffectiveRole(user: User): { effectiveRole: string; realRole: string; isPreview: boolean } {
  const realRole = user.role;

  // Only SUPERADMIN can preview other roles
  if (realRole !== 'SUPERADMIN') {
    return { effectiveRole: realRole, realRole, isPreview: false };
  }

  // Read preview role cookie (sync — cookies() is available in server components and route handlers)
  let previewRole: string | null = null;
  try {
    // Note: cookies() is async in Next.js 16 but we handle both cases
    const cookieStore = cookies() as ReturnType<typeof cookies>;
    // If it returns a promise, this won't work synchronously — but in practice
    // callers should use getEffectiveRoleAsync instead in route handlers
    if (cookieStore && typeof (cookieStore as Record<string, unknown>).get === 'function') {
      const cookie = (cookieStore as Awaited<ReturnType<typeof cookies>>).get(PREVIEW_ROLE_COOKIE);
      previewRole = cookie?.value || null;
    }
  } catch {
    // If cookies() fails (e.g. called outside request context), just use real role
  }

  if (previewRole && VALID_PREVIEW_ROLES.includes(previewRole) && previewRole !== 'SUPERADMIN') {
    return { effectiveRole: previewRole, realRole, isPreview: true };
  }

  return { effectiveRole: realRole, realRole, isPreview: false };
}

/**
 * Async version — use this in route handlers where cookies() returns a Promise.
 */
export async function getEffectiveRoleAsync(user: User): Promise<{ effectiveRole: string; realRole: string; isPreview: boolean }> {
  const realRole = user.role;

  if (realRole !== 'SUPERADMIN') {
    return { effectiveRole: realRole, realRole, isPreview: false };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(PREVIEW_ROLE_COOKIE);
    const previewRole = cookie?.value || null;

    if (previewRole && VALID_PREVIEW_ROLES.includes(previewRole) && previewRole !== 'SUPERADMIN') {
      return { effectiveRole: previewRole, realRole, isPreview: true };
    }
  } catch {
    // fallback
  }

  return { effectiveRole: realRole, realRole, isPreview: false };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  // Generate a cryptographically random token using the Web Crypto API
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function getSession(
  token: string
): Promise<{ userId: string; user: User } | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token } });
    return null;
  }

  return { userId: session.userId, user: session.user };
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.delete({ where: { token } }).catch(() => {
    // Ignore if session doesn't exist
  });
}
