import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export default async function KlassijuhatajaDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  // KLASSIJUHATAJA role no longer exists — redirect to dashboard
  redirect('/dashboard');
}
