import { NextRequest, NextResponse } from 'next/server';
import { getAllEload, createEload, deleteEload, updateEload, checkAndUpdateInstallationForLoad } from '@/lib/unified-db';
import { validateELoadTransaction } from '@/lib/validation';
import { requireRole } from '@/lib/auth-guard';
import { UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.E_LOAD]);
    if ('response' in auth) return auth.response;
    const eload = await getAllEload();
    return NextResponse.json(eload);
  } catch (error) {
    console.error('Error fetching E-Load transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch E-Load transactions', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.E_LOAD]);
    if ('response' in auth) return auth.response;
    const data = await request.json();
    const validation = validateELoadTransaction(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.data as Record<string, unknown>;

    const eloadData: Record<string, unknown> = {
      ...payload,
      gcashHandler: payload.gcashAcct,
      accountNumber: payload.accountNo,
      timeLoaded: payload.time || payload.timeLoaded,
      markup: payload.markedUp,
    };
    delete eloadData.gcashAcct;
    delete eloadData.accountNo;
    delete eloadData.time;
    delete eloadData.timeLoaded;
    delete eloadData.markedUp;

    const existing = await getAllEload();
    if (payload.gcashReference) {
      const duplicate = existing.find(row => row.gcashReference === payload.gcashReference);
      if (duplicate) {
        return NextResponse.json({ error: 'GCash reference already exists' }, { status: 409 });
      }
    }

    const eload = await createEload(eloadData as Parameters<typeof createEload>[0]);

    if (payload.accountNo) {
      const loadCreatedAt = (payload.createdAt as string | undefined) || new Date().toISOString();
      await checkAndUpdateInstallationForLoad(String(payload.accountNo), loadCreatedAt);
    }

    return NextResponse.json(eload, { status: 201 });
  } catch (error) {
    console.error('Error creating E-Load transaction:', error);
    return NextResponse.json({ error: 'Failed to create E-Load transaction' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.E_LOAD]);
    if ('response' in auth) return auth.response;
    const { id, gcashAcct, accountNo, time, timeLoaded, markedUp, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updates: Record<string, unknown> = { ...data };
    if (gcashAcct) updates.gcashHandler = gcashAcct;
    if (accountNo) updates.accountNumber = accountNo;
    if (time || timeLoaded) updates.timeLoaded = time || timeLoaded;
    if (markedUp !== undefined) updates.markup = markedUp;

    const updated = await updateEload(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'E-Load transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error updating E-Load transaction:', error);
    return NextResponse.json({ error: 'Failed to update E-Load transaction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN, UserRole.E_LOAD]);
    if ('response' in auth) return auth.response;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await deleteEload(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting E-Load transaction:', error);
    return NextResponse.json({ error: 'Failed to delete E-Load transaction' }, { status: 500 });
  }
}