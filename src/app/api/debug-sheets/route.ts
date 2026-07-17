import { NextResponse } from 'next/server';
import { sheets } from '@/lib/sheets';

export async function GET() {
  try {
    const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || '';

    const usersResponse = await sheets.fetch('users');
    const installationsResponse = await sheets.fetch('installations');

    return NextResponse.json({
      webAppUrl: webAppUrl ? 'Configured' : 'Not configured',
      users: {
        count: usersResponse.data?.length || 0,
        data: usersResponse.data || [],
        error: usersResponse.error
      },
      installations: {
        count: installationsResponse.data?.length || 0,
        error: installationsResponse.error
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
