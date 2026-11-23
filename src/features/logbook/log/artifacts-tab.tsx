import { isNil } from 'es-toolkit';
import { useDeferredValue, useMemo, useState } from 'react';
import { match } from 'ts-pattern';

import { searchArtifacts, useArtifacts } from '@/features/logbook/api/log-files';
import { SearchField } from '@/features/logbook/board/rail';
import { RowsSkeleton } from '@/features/logbook/elements/skeletons';
import { savedOf } from '@/features/logbook/helpers';
import { ArtifactIcon } from '@/features/logbook/log/artifact-icon';
import { useLogContext } from '@/features/logbook/log/context';
import { Icon } from '@/ui/molecules/icon';
import timeElapsedFromToday from '@/util/date';
import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import type { IArtifact } from '@/features/logbook/types';

const NOTE = 'px-1 text-[13px] leading-normal text-neutral-4';

function ArtifactCard({
  artifact,
  active,
  onOpen,
}: {
  readonly artifact: IArtifact;
  readonly active: boolean;
  readonly onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-[14px] border border-block-border bg-white p-2.5 pr-3 text-left transition-[box-shadow,border-color] duration-150 ease-[ease] hover:border-primary-1 hover:shadow-card aria-[current=true]:border-primary-4 aria-[current=true]:shadow-card"
        aria-current={active}
        title={`Open ${artifact.name}`}
        onClick={onOpen}
      >
        <ArtifactIcon artifact={artifact} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[14px] font-semibold text-primary-9">{artifact.name}</span>
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-neutral-4">
            <span className="flex-none tabular-nums">{formatBytes(artifact.size, 1)}</span>
            {isNil(artifact.savedAt) ? null : (
              <span
                className="inline-flex min-w-0 items-center gap-1 truncate"
                title={`Saved ${savedOf(artifact.savedAt)}`}
              >
                <Icon name="clock" size={11} />
                {timeElapsedFromToday(artifact.savedAt)}
              </span>
            )}
          </span>
        </span>
        <span
          className="grid size-8 flex-none place-items-center rounded-full bg-soft text-primary-9 transition-[background-color,color] duration-150 ease-[ease] group-hover:bg-primary-9 group-hover:text-white group-aria-[current=true]:bg-primary-9 group-aria-[current=true]:text-white"
          aria-hidden="true"
        >
          <Icon name="arrowUpRight" size={14} stroke={2.2} />
        </span>
      </button>
    </li>
  );
}

export function ArtifactsTab({
  active,
  onOpen,
}: {
  readonly active: string | null;
  readonly onOpen: (id: string) => void;
}) {
  const { project, logId } = useLogContext();
  const artifacts = useArtifacts(logId, project);
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search);
  const all = artifacts.data ?? [];
  const shown = useMemo(() => searchArtifacts(all, query), [all, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <SearchField
          value={search}
          onSearch={setSearch}
          label="Search artifacts"
          placeholder="Search artifacts..."
          className="h-9 min-w-0 flex-1 bg-soft pl-3"
        />
        <span className="flex-none text-[12px] text-neutral-4 tabular-nums">
          {query.trim().length > 0 ? `${shown.length} of ${all.length}` : all.length}
        </span>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-10">
        {match(artifacts)
          .with({ status: 'pending' }, () => <RowsSkeleton count={5} />)
          .with({ status: 'error' }, ({ error }) => (
            <p className={NOTE}>The artifacts could not be listed: {error.message}</p>
          ))
          .when(
            () => all.length === 0,
            () => (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-soft text-neutral-4">
                  <Icon name="upload" size={22} />
                </span>
                <strong className="text-[15px]">No artifacts yet</strong>
                <p className={cn(NOTE, 'max-w-[280px]')}>
                  Files uploaded with Insert, or saved by an agent, show up here.
                </p>
              </div>
            )
          )
          .when(
            () => shown.length === 0,
            () => <p className={NOTE}>No artifact matches “{query.trim()}”.</p>
          )
          .otherwise(() => (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {shown.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  active={artifact.id === active}
                  onOpen={() => onOpen(artifact.id)}
                />
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
