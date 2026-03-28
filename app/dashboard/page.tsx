import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    redirect('/auth/login');
  }

  // If SUPERADMIN is previewing another role, use the preview role for routing
  let role: string = session.user.role;
  if (session.user.role === 'SUPERADMIN') {
    const previewRole = cookieStore.get('ot_preview_role')?.value;
    if (previewRole && previewRole !== 'SUPERADMIN') {
      role = previewRole;
    }
  }

  switch (role) {
    case 'TEACHER':
    case 'KLASSIJUHATAJA':
      redirect('/dashboard/teacher');
    case 'STUDENT':
      redirect('/dashboard/student');
    case 'PARENT':
      redirect('/dashboard/parent');
    case 'SCHOOL_ADMIN':
      redirect('/admin');
    case 'SUPERADMIN':
      redirect('/admin');
    default:
      redirect('/auth/login');
  }
}
