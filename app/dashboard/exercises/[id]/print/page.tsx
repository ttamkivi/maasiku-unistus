import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';

interface FeedbackData {
  summary?: string;
  overallScore?: number | null;
  maxScore?: number;
  strengths?: string[];
  improvements?: string[];
  sections?: { title: string; content: string }[];
  recommendation?: string;
}

function parseFeedback(json: string | null | undefined): FeedbackData | null {
  if (!json) return null;
  try { return JSON.parse(json) as FeedbackData; } catch { return null; }
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function scoreColor(pct: number) {
  if (pct >= 70) return '#16a34a';
  if (pct >= 50) return '#c2410c';
  return '#dc2626';
}

export default async function ExercisePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) redirect('/auth/login');

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { studentProfile: true, teacherProfile: true } } },
  });
  if (!session || session.expiresAt < new Date()) redirect('/auth/login');

  const { id } = await params;
  const exercise = await db.exercise.findUnique({
    where: { id },
    include: { subject: true },
  });
  if (!exercise) notFound();

  const studentId = session.user.studentProfile?.id;
  const isTeacher = !!session.user.teacherProfile;
  const isOwner = exercise.studentId === studentId;
  if (!isOwner && !isTeacher) redirect('/dashboard');

  const fb = parseFeedback(exercise.rawFeedback);
  if (!fb || fb.summary?.startsWith('Analüüsimisel tekkis viga')) redirect(`/dashboard/exercises/${id}`);

  const hasPct = fb.overallScore != null && fb.maxScore != null && fb.maxScore > 0;
  const pct = hasPct ? Math.round((fb.overallScore! / fb.maxScore!) * 100) : null;
  const color = pct != null ? scoreColor(pct) : '#1C2832';

  const studentName = exercise.studentName ?? session.user.name;
  const subjectName = exercise.subject?.name ?? null;
  const dateStr = formatDate(exercise.createdAt);
  const pdfTitle = [studentName, subjectName, dateStr, exercise.topic].filter(Boolean).join(' - ');

  return (
    <html lang="et">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pdfTitle}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 12pt;
            color: #1a1a1a;
            line-height: 1.65;
            background: #fff;
            padding: 0;
          }
          .page {
            max-width: 720px;
            margin: 0 auto;
            padding: 40px 48px 60px;
          }

          /* Header */
          .header { margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #1C2832; }
          .logo { font-size: 10pt; font-weight: 700; letter-spacing: 0.05em; color: #6b6b6b; text-transform: uppercase; margin-bottom: 10px; font-family: Arial, sans-serif; }
          .topic { font-size: 22pt; font-weight: 700; color: #1C2832; margin-bottom: 4px; font-family: Arial, sans-serif; }
          .meta { font-size: 10pt; color: #6b6b6b; font-family: Arial, sans-serif; }

          /* Score box */
          .score-box {
            display: flex;
            align-items: center;
            gap: 24px;
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 14px 18px;
            margin-bottom: 22px;
            font-family: Arial, sans-serif;
          }
          .score-number { font-size: 28pt; font-weight: 700; }
          .score-label { font-size: 10pt; color: #6b6b6b; }
          .bar-wrap { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 4px; }

          /* Summary */
          .summary { font-size: 12pt; line-height: 1.7; margin-bottom: 24px; color: #222; }

          /* Sections */
          .section { margin-bottom: 22px; }
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 10px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ddd;
            font-family: Arial, sans-serif;
          }
          .section-title.green { color: #15803d; border-color: #bbf7d0; }
          .section-title.orange { color: #c2410c; border-color: #fed7aa; }
          .section-title.blue { color: #1d4ed8; border-color: #bfdbfe; }
          .section-title.gray { color: #374151; border-color: #e5e7eb; }

          ul { padding-left: 18px; }
          li { margin-bottom: 6px; font-size: 11.5pt; }

          /* Per-exercise sections */
          .exercise { margin-bottom: 16px; page-break-inside: avoid; }
          .exercise-title { font-weight: 700; font-size: 11pt; color: #1C2832; margin-bottom: 4px; font-family: Arial, sans-serif; }
          .exercise-content { font-size: 11pt; color: #333; line-height: 1.65; }

          /* Recommendation */
          .rec-box {
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 6px;
            padding: 14px 18px;
            margin-top: 20px;
            page-break-inside: avoid;
            font-family: Arial, sans-serif;
          }
          .rec-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #92400e; margin-bottom: 5px; }
          .rec-text { font-size: 11.5pt; color: #1a1a1a; line-height: 1.6; }

          /* Footer */
          .footer {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #9ca3af;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body { padding: 0; }
            .page { padding: 20px 32px 40px; }
            .no-print { display: none !important; }
          }

          /* Print button — only visible on screen */
          .print-btn {
            position: fixed;
            top: 16px;
            right: 16px;
            background: #1C2832;
            color: #F8F3DA;
            border: none;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            font-family: Arial, sans-serif;
            z-index: 99;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onclick="window.print()">
          ⬇ Laadi alla PDF
        </button>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="logo">Maasiku Unistus · AI tagasiside</div>
            <div className="topic">{exercise.topic}</div>
            <div className="meta">
              {exercise.studentName ?? session.user.name}
              {exercise.subject ? ` · ${exercise.subject.name}` : ''}
              {exercise.grade ? ` · ${exercise.grade}. klass` : ''}
              {' · '}{formatDate(exercise.createdAt)}
            </div>
          </div>

          {/* Score */}
          {hasPct && (
            <div className="score-box">
              <div>
                <div className="score-number" style={{ color }}>{pct}%</div>
                <div className="score-label">{fb.overallScore} / {fb.maxScore} punkti</div>
              </div>
              <div className="bar-wrap">
                <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          )}

          {/* Summary */}
          {fb.summary && <p className="summary">{fb.summary}</p>}

          {/* Strengths */}
          {(fb.strengths?.length ?? 0) > 0 && (
            <div className="section">
              <div className="section-title green">✓ Mis läks hästi</div>
              <ul>
                {fb.strengths!.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {(fb.improvements?.length ?? 0) > 0 && (
            <div className="section">
              <div className="section-title orange">→ Mida harjutada</div>
              <ul>
                {fb.improvements!.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Per-exercise sections */}
          {(fb.sections?.length ?? 0) > 0 && (
            <div className="section">
              <div className="section-title blue">Ülesannete kaupa</div>
              {fb.sections!.map((sec, i) => (
                <div key={i} className="exercise">
                  <div className="exercise-title">{sec.title}</div>
                  <div className="exercise-content">{sec.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {fb.recommendation && (
            <div className="rec-box">
              <div className="rec-label">Järgmine samm</div>
              <div className="rec-text">{fb.recommendation}</div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <span>Maasiku Unistus — isiklik AI tagasiside</span>
            <span>Genereeritud {formatDate(new Date())}</span>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />
      </body>
    </html>
  );
}
