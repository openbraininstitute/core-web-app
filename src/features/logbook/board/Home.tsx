import { isNil, isNotNil } from 'es-toolkit';

import { OrderButton } from '@/features/logbook/board/LogOrder';
import {
  agoOf,
  LoadMore,
  LogsEmpty,
  LogWriters,
  NewButton,
  ScopeFilter,
  SearchField,
  SettingsButton,
} from '@/features/logbook/board/Rail';
import { CardSkeletons } from '@/features/logbook/elements/skeletons';
import { Icon } from '@/features/logbook/ui/icons';
import { PopoverAlign } from '@/features/logbook/ui/popover';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { ILogOrder } from '@/features/logbook/api/research-logs';
import type { IProject } from '@/features/logbook/auth/session';
import type { IMore, IScope } from '@/features/logbook/board/Rail';

export interface IHomeProps {
  readonly logs: readonly IResearchLog[];
  // All matches, loaded or not.
  readonly total: number;
  readonly more: IMore;
  readonly loading: boolean;
  readonly error: string | null;
  readonly project: IProject;
  readonly scope: IScope;
  readonly search: string;
  readonly order: ILogOrder;
  readonly onOrder: (order: ILogOrder) => void;
  readonly creating: boolean;
  readonly onScope: (scope: IScope) => void;
  readonly onSearch: (search: string) => void;
  readonly onPick: (id: string) => void;
  readonly onNew: () => void;
}

function LogbookArt() {
  return (
    <svg width="168" height="132" viewBox="0 0 168 132" fill="none" aria-hidden="true">
      <ellipse cx="84" cy="122" rx="58" ry="6" fill="var(--color-fill-2)" />
      <rect x="30" y="14" width="96" height="100" rx="14" fill="var(--color-primary-0)" />
      <rect
        x="38"
        y="8"
        width="96"
        height="100"
        rx="14"
        fill="var(--color-white)"
        stroke="var(--color-primary-1)"
        strokeWidth="2"
      />
      {[24, 44, 64, 84].map((y) => (
        <circle key={y} cx="38" cy={y} r="4" fill="var(--color-primary-4)" />
      ))}
      <rect x="54" y="24" width="48" height="6" rx="3" fill="var(--color-primary-9)" />
      <rect x="54" y="36" width="64" height="4" rx="2" fill="var(--color-neutral-2)" />
      <rect x="54" y="45" width="56" height="4" rx="2" fill="var(--color-neutral-2)" />
      <path
        d="M54 74h10l5-12 8 26 7-20 5 8h29"
        stroke="var(--color-green)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="54" y="92" width="40" height="4" rx="2" fill="var(--color-neutral-2)" />
      <g transform="translate(128 6)">
        <circle cx="14" cy="14" r="14" fill="var(--color-primary-9)" />
        <path
          d="M14 6.5l1.9 5.6 5.6 1.9-5.6 1.9L14 21.5l-1.9-5.6-5.6-1.9 5.6-1.9z"
          fill="var(--color-white)"
        />
      </g>
    </svg>
  );
}

function LogCard({
  project,
  log,
  onPick,
}: {
  readonly project: IProject;
  readonly log: IResearchLog;
  readonly onPick: (id: string) => void;
}) {
  return (
    // A stretched button covers the card, so the +N button sits beside it, not inside.
    <article className="group relative flex min-h-[188px] flex-col rounded-2xl bg-white p-5 shadow-card transition-[box-shadow,translate] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-pop focus-within:shadow-pop">
      <button
        type="button"
        className="absolute inset-0 rounded-2xl border-0 bg-transparent"
        aria-label={`Open ${log.name}`}
        onClick={() => onPick(log.id)}
      />
      <div className="pointer-events-none relative flex flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-[17px] leading-snug font-bold">
            {log.name}
          </h3>
          {log.authorized_public ? (
            <span
              className="inline-flex h-6 flex-none items-center gap-1 rounded-full bg-scope-public-bg px-2 text-[11px] font-bold text-scope-public-fg"
              title="Public"
            >
              <Icon name="globe" size={12} stroke={2} />
              Public
            </span>
          ) : null}
        </div>
        <p className="line-clamp-3 text-[14px] leading-[1.5] text-neutral-4">
          {log.description.trim().length > 0 ? log.description : 'No description yet.'}
        </p>
        <div className="mt-auto flex items-center gap-3 border-t border-rule-soft pt-3 text-[12px] text-neutral-4">
          <LogWriters project={project} log={log} />
          <span className="min-w-0 truncate">by {log.created_by.pref_label}</span>
          <span className="ml-auto flex-none">{agoOf(log.update_date)}</span>
        </div>
      </div>
    </article>
  );
}

const STATE = 'flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center';

export function Home(props: IHomeProps) {
  const { logs, scope } = props;
  // No logs at all, not just no match for a filter or search.
  const noLogs =
    !props.loading &&
    isNil(props.error) &&
    logs.length === 0 &&
    scope.public &&
    scope.project &&
    props.search.trim().length === 0;
  return (
    <section
      className="logbook-card flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Research logs"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-rule px-6 py-4 max-md:px-4">
        <div className="mr-auto min-w-0">
          <h1 className="text-[22px] leading-tight font-bold">Research logs</h1>
          <p className="text-[13px] text-neutral-4">
            {props.loading ? 'Loading…' : `${props.total} ${props.total === 1 ? 'log' : 'logs'}`}
          </p>
        </div>
        {noLogs ? null : (
          <>
            <ScopeFilter scope={scope} onScope={props.onScope} />
            <SearchField
              value={props.search}
              onSearch={props.onSearch}
              className="w-[260px] max-md:w-full max-md:flex-[1_1_100%]"
            >
              <OrderButton order={props.order} onOrder={props.onOrder} />
            </SearchField>
          </>
        )}
        <div className="flex flex-none items-center gap-1">
          <SettingsButton align={PopoverAlign.End} />
          <NewButton creating={props.creating} onNew={props.onNew} />
        </div>
      </header>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-6 max-md:p-4">
        {isNotNil(props.error) ? (
          <div className={STATE} role="alert">
            <strong className="text-[17px]">The research logs could not be loaded</strong>
            <p className="max-w-[420px] text-[14px] text-neutral-4">{props.error}</p>
          </div>
        ) : props.loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4" aria-busy>
            <CardSkeletons count={6} />
          </div>
        ) : noLogs ? (
          <div className={STATE}>
            <LogbookArt />
            <h2 className="text-[22px] font-bold">Start your first research log</h2>
            <p className="max-w-[440px] text-[15px] leading-normal text-neutral-4">
              A research log keeps the question, the runs, the figures and the conclusions of a
              piece of work in one place. You and your agents write it together, live, and everyone
              in the project can follow along.
            </p>
            <button
              type="button"
              className="btn-navy mt-2 inline-flex items-center gap-2 disabled:cursor-progress disabled:opacity-70"
              disabled={props.creating}
              onClick={props.onNew}
            >
              <Icon name="plus" size={14} stroke={2.4} />
              New research log
            </button>
          </div>
        ) : logs.length === 0 ? (
          <LogsEmpty query={props.search} scope={scope} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {logs.map((log) => (
              <LogCard key={log.id} project={props.project} log={log} onPick={props.onPick} />
            ))}
            <LoadMore more={props.more} skeleton={<CardSkeletons count={3} />} />
          </div>
        )}
      </div>
    </section>
  );
}
