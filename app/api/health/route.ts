import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    // Lightweight DB ping — count sessions table
    await db.session.count();
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      latencyMs,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error('Health check DB error:', err);
    return NextResponse.json(
      {
        status: 'error',
        db: 'error',
        latencyMs,
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
