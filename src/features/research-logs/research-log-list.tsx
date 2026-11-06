'use client';

import Link from 'next/link';

import { Skeleton } from '@/ui/molecules/skeleton';

import { useResearchLogHref, useResearchLogs } from './hooks';

/** Landing view: what a log is, plus the project's logs as cards. */
export function ResearchLogList() {
  const { data, isLoading, isError } = useResearchLogs('');
  const href = useResearchLogHref();

  return (
    <div className="flex flex-col gap-6 p-6">
      <p className="text-primary-9 max-w-2xl">
        Research logs are notebooks of what was asked, done and found. Pick one on the left, or
        start a new one.
      </p>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : isError ? (
        <p className="text-neutral-5">Research logs could not be loaded.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {data?.data.map((log) => (
            <Link
              key={log.id}
              href={href(log.id)}
              className="hover:shadow-lg flex flex-col gap-2 rounded-xl bg-white p-5 shadow-md transition-shadow"
            >
              <span className="text-primary-9 text-lg font-bold">{log.name}</span>
              <span className="text-neutral-6 line-clamp-3 text-sm">
                {log.description || 'No summary'}
              </span>
              <span className="text-neutral-4 mt-auto pt-2 text-xs">
                {log.created_by?.pref_label ?? 'Unknown author'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
