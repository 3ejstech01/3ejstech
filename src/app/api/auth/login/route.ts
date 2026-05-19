import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/unified-db';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const users = await getAllUsers();
    const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id || user.username,
        username: user.username,
        name: user.username,
        email: `${user.username}@3jes.local`,
        role: user.role || 'view_only',
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.createdAt || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}