import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import SubmissionShareButton from './SubmissionShareButton';

interface FeedbackSection {
  title: string;
  content: string;
  type?: 'positive' | 'improvement' | 'neutral';
}

interface AssignmentFeedback {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  sections?: FeedbackSection[];
  overallScore?: number;
  maxScore?: number;
  recommendation?: string;
}

function parseFeedback(raw: string | null | undefined): AssignmentFeedback | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as AssignmentFeedback; } catch { return null; }
}

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { teacherProfile: true, studentProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { user } = session;

  const submission = await db.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { teacher: { include: { user: true } }, subject: true },
      },
      student: { include: { user: true } },
      photos: true,
    },
  });

  if (!submission || submission.assignmentId !== id) redirect(`/dashboard/assignments/${id}`);

  const isTeacher = !!user.teacherProfile && submission.assignment.teacher.userId === user.id;
  const isStudent = !!user.studentProfile && submission.studentId === user.studentProfile.id;

  if (!isTeacher && !isStudent) redirect('/dashboard');

  const feedback = parseFeedback(submission.rawFeedback);
  const hasScore = feedback?.overallScore != null && feedback?.maxScore != null;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/dashboard/assignments/${id}`}
          style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}
        >
          ← {submission.assignment.title}
        </Link>
      </div>

      {/* Header */}
      <div style={{
        background: '#F8F3DA',
        border: '1px solid #DAD0A1',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: 1 }}>
              {submission.assignment.subject?.name || 'KODUTÖÖ'}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1C2832', marginTop: 2 }}>
              {submission.assignment.title}
            </h1>
            {isTeacher && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Õpilane: {submission.studentName || submission.student?.user?.name || 'Nimetu'}
              </div>
            )}
          </div>
          {hasScore && (
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#1C2832' }}>
                {feedback!.overallScore}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/{feedback!.maxScore}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>punkti</div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      {!feedback && submission.status !== 'SUBMITTED' && submission.status !== 'ANALYZING' && (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <p>Tagasiside pole veel valmis. Proovi veidi hiljem uuesti.</p>
        </div>
      )}

      {(submission.status === 'ANALYZING') && (
        <div style={{
          background: '#ede9fe',
          border: '1px solid #c4b5fd',
          borderRadius: 8,
          padding: 20,
          textAlign: 'center',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🤖</div>
          <p style={{ fontWeight: 600, color: '#6d28d9' }}>AI analüüsib sinu tööd…</p>
        </div>
      )}

      {feedback && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary */}
          {feedback.summary && (
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 20,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 10 }}>
                📋 Üldine hinnang
              </h2>
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>{feedback.summary}</p>
              {feedback.recommendation && (
                <div style={{
                  marginTop: 12,
                  background: '#F8F3DA',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontSize: 14,
                  color: '#1C2832',
                  fontStyle: 'italic',
                }}>
                  💡 {feedback.recommendation}
                </div>
              )}
            </div>
          )}

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: 20,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#15803d', marginBottom: 12 }}>
                ✅ Hästi tehtud
              </h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feedback.strengths.map((s, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: 8,
              padding: 20,
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#c2410c', marginBottom: 12 }}>
                📈 Arenguruumid
              </h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {feedback.improvements.map((s, i) => (
                  <li key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed sections */}
          {feedback.sections && feedback.sections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedback.sections.map((sec, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C2832', marginBottom: 6 }}>
                    {sec.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{sec.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student's note */}
      {submission.studentNote && (
        <div style={{
          marginTop: 20,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>SINU KOMMENTAAR</div>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{submission.studentNote}</p>
        </div>
      )}

      {/* Teacher note (only visible to teacher) */}
      {isTeacher && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            background: '#fef9c3',
            border: '1px solid #fde047',
            borderRadius: 8,
            padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 6 }}>
              🔒 PRIVAATNE MÄRKUS (ainult õpetajale)
            </div>
            {submission.teacherNote ? (
              <p style={{ fontSize: 14, color: '#1C2832', margin: 0 }}>{submission.teacherNote}</p>
            ) : (
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontStyle: 'italic' }}>Märkust pole lisatud</p>
            )}
          </div>
        </div>
      )}

      {/* Photos */}
      {submission.photos.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C2832', marginBottom: 12 }}>
            Esitatud fotod ({submission.photos.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {submission.photos.map((photo, i) => (
              <div key={photo.id}>
                <img
                  src={`data:image/jpeg;base64,${photo.base64Data}`}
                  alt={`Foto ${i + 1}`}
                  style={{
                    width: '100%',
                    aspectRatio: '3/4',
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                  }}
                />
                {photo.caption && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{photo.caption}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share with teacher button (student only) */}
      {isStudent && feedback && submission.status === 'FEEDBACK_READY' && (
        <div style={{ marginTop: 24 }}>
          <SubmissionShareButton submissionId={submissionId} />
        </div>
      )}

      {isStudent && submission.status === 'SHARED_WITH_TEACHER' && (
        <div style={{
          marginTop: 24,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '14px 16px',
          fontSize: 14,
          color: '#15803d',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          ✅ Jagatud õpetajaga
        </div>
      )}
    </div>
  );
}
