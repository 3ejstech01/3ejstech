import { NextRequest, NextResponse } from 'next/server';
import { updateInstallation } from '@/lib/unified-db';
import { requireRole } from '@/lib/auth-guard';
import { UserRole } from '@/lib/types';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireRole(request, [UserRole.ADMIN]);
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const data = await request.json();
    
    const updated = await updateInstallation(id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating installation:', error);
    return NextResponse.json({ error: 'Failed to update installation' }, { status: 500 });
  }
}
