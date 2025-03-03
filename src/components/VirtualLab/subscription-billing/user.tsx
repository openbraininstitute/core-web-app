'use client';

import { useSession } from 'next-auth/react';

export default function User() {
  const { data } = useSession();
  return (
    <div className="mb-16 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/20 text-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{data?.user.name}</h1>
    </div>
  );
}
