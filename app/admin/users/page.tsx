import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import UsersClient from './UsersClient';

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN:   'Superadmin',
  SCHOOL_ADMIN: 'Kooli admin',
  TEACHER:      'Õpetaja',
  STUDENT:      'Õpilane',
  PARENT:       'Lapsevanem',
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !['SUPERADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) {
    redirect('/auth/login');
  }

  const { role: roleFilter } = await searchParams;

  const now = new Date();

  const usersRaw = await db.user.findMany({
    where: roleFilter ? { role: roleFilter as 'SUPERADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      studentProfile: {
        select: {
          id: true,
          isEligible: true,
          consentGrants: {
            where: {
              status: 'ACTIVE',
              OR: [
                { duration: 'INFINITE' },
                { duration: 'DATED', endDate: { gt: now } },
              ],
            },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: {
              startDate: true,
              parent: {
                select: { user: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const users = usersRaw.map((u) => {
    const sp = u.studentProfile;
    const activeConsent = sp?.consentGrants[0] ?? null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      createdAtStr: formatDate(u.createdAt),
      roleLabel: ROLE_LABELS[u.role] ?? u.role,
      // AI consent info (students only)
      aiConsent: sp ? {
        hasConsent: !!activeConsent,
        consentBy: activeConsent?.parent?.user?.name ?? null,
        consentAt: activeConsent ? formatDate(activeConsent.startDate) : null,
        isEligible: sp.isEligible,
        eligibleAt: null,
      } : null,
      studentProfileId: sp?.id ?? null,
    };
  });

  return (
    <UsersClient
      users={users}
      callerRole={session.user.role}
      callerId={session.user.id}
      roleFilter={roleFilter}
    />
  );
}
