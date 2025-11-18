'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export default function Logout() {
  useEffect(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h2 className="text-primary-8 text-xl font-bold">Logging you out</h2>
      <p className="text-primary-7 mx-auto max-w-md text-center">
        Please wait while we securely sign you out and redirect you to the home page.
      </p>
    </div>
  );
}
