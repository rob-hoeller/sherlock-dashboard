import React from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {children}
    </div>
  );
}