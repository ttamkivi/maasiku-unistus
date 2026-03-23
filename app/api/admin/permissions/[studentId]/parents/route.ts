import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('mu_session')?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  const role = session.user.role;
  if (!['ADMIN', 'SCHOOL_ADMIN', 'SUPERADMIN'].includes(role)) return null;
  return session.user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;
    const search = request.nextUrl.searchParams.get('search') ?? '';

    if (!search.trim()) {
      return NextResponse.json({ parents: [] });
    }

    // Get already-linked parent IDs for this student
    const existingLinks = await db.parentStudentLink.findMany({
      where: { studentId },
      select: { parentId: true },
    });
    const linkedParentIds = existingLinks.map((l) => l.parentId);

    const parentUsers = await db.user.findMany({
      where: {
        role: 'PARENT',
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
        parentProfile: {
          id: { notIn: linkedParentIds },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        parentProfile: { select: { id: true } },
      },
      take: 10,
    });

    const parents = parentUsers
      .filter((u) => u.parentProfile !== null)
      .map((u) => ({
        id: (u.parentProfile as { id: string }).id,
        userId: u.id,
        name: u.name,
        email: u.email,
      }));

    return NextResponse.json({ parents });
  } catch (error) {
    console.error('GET parents error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;
    const body = await request.json();
    const { parentId } = body as { parentId: string };

    if (!parentId) {
      return NextResponse.json({ error: 'parentId on kohustuslik' }, { status: 400 });
    }

    await db.parentStudentLink.create({
      data: { parentId, studentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST parents error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: 'Juurdepääs keelatud' }, { status: 403 });
    }

    const { studentId } = await params;
    const body = await request.json();
    const { parentId } = body as { parentId: string };

    if (!parentId) {
      return NextResponse.json({ error: 'parentId on kohustuslik' }, { status: 400 });
    }

    await db.parentStudentLink.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE parents error:', error);
    return NextResponse.json({ error: 'Serveriviga' }, { status: 500 });
  }
}
