import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin session
    const cookieStore = await cookies();
    const token = cookieStore.get('ot_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Parse form data
    const formData = await request.formData();
    const status = formData.get('status') as string;

    if (!status || !['NEW', 'READ', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'Vigane staatus' }, { status: 400 });
    }

    const { id } = await params;

    // Update feedback status
    await db.userFeedback.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Redirect back to admin feedback page (303 = POST→GET)
    return NextResponse.redirect(new URL('/admin/feedback', request.url), 303);
  } catch (error) {
    console.error('Feedback status update error:', error);
    return NextResponse.redirect(new URL('/admin/feedback', request.url), 303);
  }
}
