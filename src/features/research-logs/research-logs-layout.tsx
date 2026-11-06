'use client';

import { GlobalOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import {
  useResearchLogHref,
  useResearchLogs,
  useResearchLogScope,
  useStartResearchLog,
} from './hooks';

import type { ReactNode } from 'react';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Same shell as Notebooks: a bordered panel with a rail of pills and the page beside it. */
export function ResearchLogsLayout({ children }: { children: ReactNode }) {
  const { logId } = useParams<{ logId?: string }>();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useResearchLogs(search);
  const href = useResearchLogHref();
  const { start, isPending } = useStartResearchLog();

  return (
    <div
      data-testid="research-logs-layout"
      className="bg-background h-full w-full overflow-hidden pt-2 pr-1"
    >
      <div className="bg-background border-neutral-2 mx-2 mb-2 ml-3 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] grid-cols-[22rem_1fr] gap-4 overflow-hidden rounded-2xl border p-2">
        <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden px-1 py-2">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <ScopeToggles />
            <Button
              rounded
              variant="success"
              type="button"
              onClick={start}
              disabled={isPending}
              className="h-10 gap-2 border border-white/20 px-4 font-semibold"
            >
              New <PlusOutlined className="text-sm" />
            </Button>
          </div>

          <label className="text-primary-9 flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 shadow-md">
            <SearchOutlined />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="placeholder:text-neutral-3 w-full bg-transparent outline-none"
            />
          </label>

          <nav className="secondary-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
            <Button
              asChild
              rounded
              variant="outline"
              size="lg"
              active={!logId}
              className="w-full shrink-0 border-none text-base"
            >
              <Link href={href()} className="flex! w-full items-center justify-between!">
                <span className="font-bold text-current">All research logs</span>
                <span className={cn('text-sm font-bold', logId ? 'text-neutral-4' : 'text-white')}>
                  {data?.data.length ?? ''}
                </span>
              </Link>
            </Button>

            {isLoading ? (
              <Skeleton className="h-14 w-full rounded-full" />
            ) : data?.data.length === 0 ? (
              <p className="text-neutral-4 px-3 text-sm">
                {search ? 'No logs match.' : 'No research logs here.'}
              </p>
            ) : (
              data?.data.map((log) => {
                const active = log.id === logId;
                return (
                  <Button
                    key={log.id}
                    asChild
                    rounded
                    variant="outline"
                    size="lg"
                    active={active}
                    className="h-auto w-full shrink-0 border-none py-3 text-base"
                  >
                    <Link href={href(log.id)} className="flex! w-full flex-col items-start!">
                      <span className="w-full truncate text-left font-bold text-current">
                        {log.name}
                      </span>
                      <span
                        className={cn('text-xs font-light', active ? 'text-white' : 'text-neutral-4')}
                      >
                        {dateLabel(log.update_date)}
                      </span>
                    </Link>
                  </Button>
                );
              })
            )}
          </nav>
        </aside>

        <main className="secondary-scrollbar min-h-0 overflow-y-auto pr-1">{children}</main>
      </div>
    </div>
  );
}

/** The Data table's scope marks: green globe for public, light-blue people for the project. */
function ScopeToggles() {
  const { scope, toggle } = useResearchLogScope();
  const items = [
    { key: 'public', label: 'Public', Icon: GlobalOutlined, on: 'text-green-600 bg-green-50' },
    { key: 'project', label: 'Project', Icon: TeamOutlined, on: 'text-primary-4 bg-primary-1' },
  ] as const;
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-white px-1.5 shadow-md">
      {items.map(({ key, label, Icon, on }) => (
        <Tooltip key={key} delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={scope[key]}
              aria-label={label}
              onClick={() => toggle(key)}
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-lg transition-colors',
                scope[key] ? on : 'hover:bg-neutral-1 text-gray-300'
              )}
            >
              <Icon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
