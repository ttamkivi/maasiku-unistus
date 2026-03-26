import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * GET /api/materials/:id — get single resource
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const resource = await db.learningResource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: 'Materjali ei leitud' }, { status: 404 });
  }

  return NextResponse.json({ resource });
}

/**
 * PATCH /api/materials/:id — update a resource (teacher/admin)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  const body = await req.json();
  const resource = await db.learningResource.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.language !== undefined && { language: body.language }),
      ...(body.isFree !== undefined && { isFree: body.isFree }),
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.quality !== undefined && { quality: body.quality }),
      ...(body.verified !== undefined && {
        verified: body.verified,
        verifiedAt: body.verified ? new Date() : null,
      }),
    },
  });

  return NextResponse.json({ resource });
}

/**
 * DELETE /api/materials/:id — remove a resource
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ot_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Logi sisse' }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Sessioon aegunud' }, { status: 401 });
  }

  await db.learningResource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
