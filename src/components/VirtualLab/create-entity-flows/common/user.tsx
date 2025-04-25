'use client';

import { useSession } from 'next-auth/react';

export default function User() {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username;
  return (
    <div className="sticky top-0 z-30 mb-6 flex w-full flex-grow items-center justify-between gap-3 bg-primary-9 py-2 pr-4">
      <div className="flex max-w-max items-center justify-center gap-2">
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
        <h1 className="select-none text-2xl font-bold tracking-tight">{userName}</h1>
      </div>
    </div>
  );
}
