import { NextRequest, NextResponse } from 'next/server';
import { getAllEload, createEload, deleteEload, updateEload, checkAndUpdateInstallationForLoad } from '@/lib/unified-db';
import { validateELoadTransaction } from '@/lib/validation';

export async function GET() {
  try {
    const eload = await getAllEload();
    return NextResponse.json(eload);
  } catch (error) {
    console.error('Error fetching E-Load transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch E-Load transactions', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validation = validateELoadTransaction(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { gcashAcct, accountNo, time, timeLoaded, markedUp, createdAt, ...rest } = data;
    const eloadData = {
      gcashHandler: gcashAcct,
      accountNumber: accountNo,
      timeLoaded: time || timeLoaded,
      markup: markedUp,
      createdAt,
      ...rest,
    };

    const eload = await createEload(eloadData);
    
    if (accountNo) {
      const loadCreatedAt = createdAt || new Date().toISOString();
      await checkAndUpdateInstallationForLoad(accountNo, loadCreatedAt);
    }
    
    return NextResponse.json(eload, { status: 201 });
  } catch (error) {
    console.error('Error creating E-Load transaction:', error);
    return NextResponse.json({ error: 'Failed to create E-Load transaction' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
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