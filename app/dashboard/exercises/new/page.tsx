import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import NewExerciseClient from './NewExerciseClient';

export default async function NewExercisePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const subjects = await db.subject.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true },
  });

  return (
    <NewExerciseClient
      subjects={subjects}
      userName={session.user.name}
    />
  );
}
