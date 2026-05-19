import { NextRequest, NextResponse } from 'next/server';
import { getAllInstallations, createInstallation, deleteInstallation } from '@/lib/unified-db';
import { validateInstallation } from '@/lib/validation';

function toCamelCaseInstallation(data: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    dateinstalled: 'dateInstalled', agentname: 'agentName',
    jonumber: 'joNumber', accountnumber: 'accountNumber', subsname: 'subscriberName',
    contact1: 'contactNumber1', contact2: 'contactNumber2',
    technician: 'assignedTechnician',
    modemserial: 'modemSerial', reelnum: 'reelNo', reelstart: 'reelStart',
    reelend: 'reelEnd', fiberopticcable: 'fiberOpticCable',
    mechconnector: 'mechanicalConnector', sclam: 'sClamp',
    patchcordapcsc: 'patchcordApsc', housebracket: 'houseBracket',
    midspan: 'midspan', cableclip: 'cableClip', ftthterminalbox: 'ftthTerminalBox',
    doublesidedtape: 'doubleSidedTape', cabletiewrap: 'cableTieWrap',
    monthinstalled: 'monthInstalled', yearinstalled: 'yearInstalled',
    loadexpire: 'loadExpire', notifstatus: 'notifyStatus', loadstatus: 'loadStatus',
    houseLat: 'houseLatitude', houseLong: 'houseLongitude',
    startLocation: 'startLocation', endLocation: 'endLocation',
    assignedTechnicians: 'assignedTechnician',
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[mapping[key] || key] = value;
  }
  return result;
}

export async function GET() {
  try {
    const installations = await getAllInstallations();
    return NextResponse.json(installations);
  } catch (error) {
    console.error('Error fetching installations:', error);
    return NextResponse.json({ error: 'Failed to fetch installations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const validation = validateInstallation(data);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const camelCaseData = toCamelCaseInstallation(data);
    const installation = await createInstallation(camelCaseData);
    return NextResponse.json(installation, { status: 201 });
  } catch (error) {
    console.error('Error creating installation:', error);
    return NextResponse.json({ error: 'Failed to create installation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await deleteInstallation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting installation:', error);
    return NextResponse.json({ error: 'Failed to delete installation' }, { status: 500 });
  }
}
