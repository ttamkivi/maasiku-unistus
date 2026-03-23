import { NextRequest, NextResponse } from 'next/server';

// KlassijuhatajProfile has been removed from the schema.
// This endpoint is no longer functional. It returns a 410 Gone response.
export async function PATCH(
  _request: NextRequest,
  _ctx: { params: Promise<{ studentId: string }> }
) {
  return NextResponse.json(
    { error: 'Klassijuhataja määramine on eemaldatud. Funktsionaalsus uueneb peagi.' },
    { status: 410 }
  );
}
