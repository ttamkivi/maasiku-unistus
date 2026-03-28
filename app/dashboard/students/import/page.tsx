import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import ImportClient from './ImportClient';

const ALLOWED_ROLES = ['TEACHER', 'SCHOOL_ADMIN'];

export default async function StudentsImportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) redirect('/auth/login');
  const isPreview = session.user.role === 'SUPERADMIN' && !!cookieStore.get('ot_preview_role')?.value;
  if (!ALLOWED_ROLES.includes(session.user.role) && !isPreview) redirect('/dashboard');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C2832', marginBottom: 4 }}>
          Impordi õpilased CSV-st
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280' }}>
          Laadi üles CSV-fail või kleebi sisu tekstiväljale, et luua mitu õpilaskontot korraga.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
