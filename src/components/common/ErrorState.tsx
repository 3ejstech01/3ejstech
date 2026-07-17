import React from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, retry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
      <h3 className="text-sm font-semibold text-red-600">{title}</h3>
      <p className="mt-1 text-sm text-red-600/80">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
