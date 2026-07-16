import { NextRequest, NextResponse } from 'next/server';
import { archivePreviousYears } from '@/lib/unified-db';
import { requireRole } from '@/lib/auth-guard';
import { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN]);
    if ('response' in auth) return auth.response;
    const body = await request.json().catch(() => ({}));
    const rawYear = body?.currentYear;
    const now = new Date();
    const yearToArchive = rawYear === undefined || rawYear === null || rawYear === ''
      ? now.getFullYear()
      : Number(rawYear);

    if (!Number.isFinite(yearToArchive) || yearToArchive <= 2000) {
      return NextResponse.json({ error: 'Invalid archive year' }, { status: 400 });
    }

    if (yearToArchive > now.getFullYear()) {
      return NextResponse.json({ error: 'Archive year cannot be in the future' }, { status: 400 });
    }

    const archivedCount = await archivePreviousYears(yearToArchive);

    return NextResponse.json({
      success: true,
      archivedCount,
      message: `Successfully archived ${archivedCount} installations from years before ${yearToArchive}`
    });
  } catch (error) {
    console.error('Error archiving previous years:', error);
    return NextResponse.json({
      error: 'Failed to archive previous years',
      details: String(error)
    }, { status: 500 });
  }
}