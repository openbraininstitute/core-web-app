'use client';

import { signOut } from 'next-auth/react';

import { basePath, isServer } from '@/config';

export default function Logout() {
  // Prevent window ref errors during SSR
  if (!isServer) signOut({ callbackUrl: `${basePath}/` });

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Logging you out</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we securely sign you out and redirect you to the home page.
      </p>
    </div>
  );
}
