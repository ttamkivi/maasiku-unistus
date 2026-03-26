import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/materials/by-codes?codes=F9.1.1,F9.1.2&limit=5
 *
 * Internal endpoint used by the AI feedback pipeline.
 * Fetches the best-rated learning resources matching given curriculum codes.
 * Returns materials sorted by quality (highest first), grouped by code.
 */
export async function GET(req: NextRequest) {
  const codesParam = req.nextUrl.searchParams.get('codes');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '5', 10);

  if (!codesParam) {
    return NextResponse.json({ materials: [] });
  }

  const codes = codesParam.split(',').map((c) => c.trim()).filter(Boolean);

  if (codes.length === 0) {
    return NextResponse.json({ materials: [] });
  }

  // Fetch materials for all codes, sorted by quality
  const materials = await db.learningResource.findMany({
    where: {
      curriculumCode: { in: codes },
    },
    orderBy: [{ quality: 'desc' }, { verified: 'desc' }],
    take: limit * codes.length, // generous limit, we'll trim per code below
  });

  // Group by curriculum code and take top N per code
  const grouped: Record<string, typeof materials> = {};
  for (const m of materials) {
    if (!grouped[m.curriculumCode]) grouped[m.curriculumCode] = [];
    if (grouped[m.curriculumCode].length < limit) {
      grouped[m.curriculumCode].push(m);
    }
  }

  return NextResponse.json({ materials: grouped });
}
