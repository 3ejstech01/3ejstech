'use client';

import { redirect } from 'next/navigation';

export default function LoginPage() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-gray-900 p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">3EJS Tech</h2>
          <p className="mt-2 text-sm text-gray-400">ISP Management System</p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-gray-300">You are currently offline.</p>
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1 justify-center">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Offline mode — log in with cached credentials
          </p>
        </div>
      </div>
    </div>
  );
}