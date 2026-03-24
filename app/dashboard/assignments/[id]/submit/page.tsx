import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import AssignmentSubmitClient from './AssignmentSubmitClient';

export default async function AssignmentSubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) redirect('/auth/login?from=' + encodeURIComponent(`/dashboard/assignments/${id}/submit`));

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const assignment = await db.assignment.findUnique({
    where: { id },
    include: { subject: true, teacher: { include: { user: true } } },
  });

  if (!assignment || assignment.deletedAt || assignment.status !== 'PUBLISHED') {
    redirect('/dashboard/assignments');
  }

  // Check for existing submission
  if (session.user.studentProfile) {
    const existing = await db.assignmentSubmission.findFirst({
      where: { assignmentId: id, studentId: session.user.studentProfile.id },
    });
    if (existing) {
      redirect(`/dashboard/assignments/${id}/submissions/${existing.id}`);
    }
  }

  return (
    <AssignmentSubmitClient
      assignmentId={id}
      assignmentTitle={assignment.title}
      assignmentDescription={assignment.description}
      subjectName={assignment.subject?.name || null}
      teacherName={assignment.teacher.user.name}
      studentName={session.user.name}
    />
  );
}
