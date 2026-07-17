import { NextRequest, NextResponse } from 'next/server';
import { archivePreviousYears } from '@/lib/unified-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawYear = body?.currentYear;
    const now = new Date();
    const yearToArchive = rawYear === undefined || rawYear === null || rawYear === ''
      ? now.getFullYear()
      : Number(rawYear);

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