// DELETED — this endpoint was a one-time use utility
// Keeping empty file to be removed in next cleanup
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been disabled' }, { status: 410 });
}
