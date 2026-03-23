import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    redirect('/auth/login');
  }

  const role = session.user.role;

  switch (role) {
    case 'TEACHER':
      redirect('/dashboard/teacher');
    case 'STUDENT':
      redirect('/dashboard/student');
    case 'PARENT':
      redirect('/dashboard/parent');
    case 'KLASSIJUHATAJA':
      redirect('/dashboard/klassijuhataja');
    case 'SCHOOL_ADMIN':
      redirect('/admin');
    case 'SUPERADMIN':
      redirect('/admin');
    case 'ADMIN':
      redirect('/admin');
    default:
      redirect('/auth/login');
  }
}
