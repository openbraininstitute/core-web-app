'use client';

import Link from 'next/link';

import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import { useResearchLogHref, useResearchLogs } from './hooks';
import { LogActions } from './log-actions';

const editedAt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Landing view: what a report is, plus the project's reports as cards. */
export function ResearchLogList() {
  const { data, isLoading, isError } = useResearchLogs('');
  const href = useResearchLogHref();

  return (
    // the same card as the rail's; the content scrolls inside it, so its corners stay in view
    <div className={cn(BOX_CLASS, 'h-full min-h-0 overflow-hidden')}>
      <div className="no-scrollbar flex h-full flex-col gap-6 overflow-y-auto p-8">
        <p className="text-primary-9 truncate">
          Reports allow you or your agent to log your work for your collaborators and the community
          to read
        </p>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : isError ? (
          <p className="text-neutral-5">Research logs could not be loaded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {data?.data.map((log) => (
              <div key={log.id} className="group/log relative">
                {/* outlined rather than shadowed: a white tile on a white card would disappear */}
                <Link
                  href={href(log.id)}
                  className="border-neutral-2 hover:border-primary-5 flex h-full flex-col gap-2 rounded-xl border bg-white p-5 transition-colors hover:shadow-md"
                >
                  <span className="text-primary-9 text-lg font-bold">{log.name}</span>
                  <span className="text-neutral-6 line-clamp-3 text-sm">
                    {log.description || 'No summary'}
                  </span>
                  <span className="text-neutral-4 mt-auto flex flex-col gap-0.5 pt-2 text-xs">
                    <span>{log.created_by?.pref_label ?? 'Unknown author'}</span>
                    <span>Last edited {editedAt(log.update_date)}</span>
                  </span>
                </Link>
                <LogActions log={log} className="absolute top-3 right-3" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
