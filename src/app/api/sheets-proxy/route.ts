import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { UserRole } from '@/lib/types';

const ALLOWED_SHEETS = ['installations', 'eload', 'users', 'historicaldata'];

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY]);
    if ('response' in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const sheet = searchParams.get('sheet') || 'installations';
    if (!ALLOWED_SHEETS.includes(sheet)) {
      return NextResponse.json({ error: 'Sheet not allowed' }, { status: 400 });
    }
    const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';

    if (!WEBAPP_URL) {
      return NextResponse.json({ error: 'Google Sheets Web App URL not configured' }, { status: 500 });
    }

    const url = `${WEBAPP_URL}?sheet=${encodeURIComponent(sheet)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('[Sheets Proxy GET] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.TECHNICIAN, UserRole.E_LOAD, UserRole.VIEW_ONLY]);
    if ('response' in auth) return auth.response;

    const payload = await request.json();
    const sheet = payload.sheet;
    if (!ALLOWED_SHEETS.includes(sheet)) {
      return NextResponse.json({ error: 'Sheet not allowed' }, { status: 400 });
    }
    const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL || '';

    if (!WEBAPP_URL) {
      return NextResponse.json({ error: 'Google Sheets Web App URL not configured' }, { status: 500 });
    }

    const res = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}: ${res.statusText}` }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('[Sheets Proxy POST] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
