import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import NewAssignmentForm from './NewAssignmentForm';

export default async function NewAssignmentPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  if (!session.user.teacherProfile) redirect('/dashboard');

  const subjects = await db.subject.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true },
  });

  return <NewAssignmentForm subjects={subjects} />;
}
