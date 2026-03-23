import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import NewUserForm from './NewUserForm';

export default async function NewUserPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  const adminRoles = ['ADMIN', 'SUPERADMIN', 'SCHOOL_ADMIN'];
  if (!session || session.expiresAt < new Date() || !adminRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  const schoolsRaw = await db.school.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true, city: true },
  });

  const schools = schoolsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    city: s.city ?? '',
  }));

  return <NewUserForm schools={schools} callerRole={session.user.role} />;
}
