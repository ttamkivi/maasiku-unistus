import 'server-only';
import { db } from './db';

export async function anonymizeFeedback(feedbackJson: string, studentName: string): Promise<string> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(feedbackJson);
  } catch {
    // If it's not valid JSON, just do string replacement
    return feedbackJson
      .replace(new RegExp(studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 'Õpilane');
  }

  // Replace student name in test_info
  if (parsed.test_info && typeof parsed.test_info === 'object') {
    const testInfo = parsed.test_info as Record<string, unknown>;
    testInfo.student = 'Õpilane';
    // Remove school name
    delete testInfo.school;
    delete testInfo.schoolName;
    delete testInfo.school_name;
    parsed.test_info = testInfo;
  }

  // Deep string replacement of student name
  const jsonStr = JSON.stringify(parsed);
  const escapedName = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anonymized = jsonStr.replace(new RegExp(escapedName, 'gi'), 'Õpilane');

  return anonymized;
}

export async function anonymizeTeacherNotes(notes: string | null | undefined, studentName: string): Promise<string | null> {
  if (!notes) return null;
  const escapedName = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return notes.replace(new RegExp(escapedName, 'gi'), 'Õpilane');
}

export async function createTrainingRecord(resultId: string, consentedBy: string, consentType: string): Promise<void> {
  const result = await db.testResult.findUnique({
    where: { id: resultId },
    include: {
      test: {
        include: {
          subject: true,
          school: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error(`TestResult ${resultId} ei leitud`);
  }

  const feedbackJson = result.editedFeedback ?? result.rawFeedback;
  if (!feedbackJson) {
    throw new Error('Tagasiside puudub');
  }

  const studentName = result.studentName ?? 'Õpilane';
  const anonymizedFeedback = await anonymizeFeedback(feedbackJson, studentName);
  const anonymizedNotes = await anonymizeTeacherNotes(result.teacherNotes, studentName);

  const now = new Date();

  // Create TrainingConsent and AnonymizedTrainingData in a transaction
  await db.$transaction(async (tx) => {
    const consent = await tx.trainingConsent.create({
      data: {
        testResultId: resultId,
        consentedBy,
        consentType,
        anonymizedAt: now,
      },
    });

    await tx.anonymizedTrainingData.create({
      data: {
        consentId: consent.id,
        grade: result.test.grade ?? null,
        subject: result.test.subject?.name ?? null,
        score: result.score ?? null,
        maxScore: result.maxScore ?? null,
        feedback: anonymizedFeedback,
        teacherNotes: anonymizedNotes ?? null,
        teacherComment: result.teacherComment ?? null,
      },
    });
  });
}
