import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/unified-db';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users.map(u => ({
      id: u.id || u.username,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.username || !data.role) {
      return NextResponse.json({ error: 'Username and role are required' }, { status: 400 });
    }
    if (data.username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    const user = await createUser({
      username: data.username,
      password: data.password || 'default',
      role: data.role,
    });

    return NextResponse.json({ id: user.id, username: user.username, role: user.role, createdAt: user.createdAt }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updated = await updateUser(id, {
      username: data.username,
      password: data.password,
      role: data.role,
    });

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ id, username: updated.username, role: updated.role });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}