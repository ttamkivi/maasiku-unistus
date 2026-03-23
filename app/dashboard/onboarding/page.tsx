import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { OnboardingWizard } from './OnboardingWizard';

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { user } = session;

  if (user.onboardingCompleted) redirect('/dashboard');

  if (user.role !== 'TEACHER' && user.role !== 'SCHOOL_ADMIN') redirect('/dashboard');

  return <OnboardingWizard />;
}
