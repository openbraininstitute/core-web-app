// The Artifacts tab of the side pane: everything the log keeps in EntityCore (its folder's files
// and its pages' synced copies) as one list of cards, newest first, with a search on top. It reads
// the listing only (names, sizes, times), shared with the page's figures and file cards
// (logFilesQuery): no file is downloaded until its tab opens in the editor, and the search filters
// that listing in memory.
import { useQuery } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';
import { useDeferredValue, useMemo, useState } from 'react';

import { artifactsOf, logFilesQuery, searchArtifacts } from '@/features/logbook/api/log-files';
import { agoOf, SearchField } from '@/features/logbook/app/Rail';
import { sizeOf } from '@/features/logbook/editor/blocks/FileView';
import { ArtifactIcon } from '@/features/logbook/log/ArtifactIcon';
import { savedOf } from '@/features/logbook/log/ArtifactView';
import { useLogContext } from '@/features/logbook/log/context';
import { Icon } from '@/features/logbook/ui/icons';

import type { IArtifact } from '@/features/logbook/api/log-files';

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
          {/* The name, the size and when it was saved: nothing else (owner, 2026-11-15). */}
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-neutral-4">
            <span className="flex-none tabular-nums">{sizeOf(artifact.size)}</span>
            {isNil(artifact.savedAt) ? null : (
              <span
                className="inline-flex min-w-0 items-center gap-1 truncate"
                title={`Saved ${savedOf(artifact.savedAt)}`}
              >
                <Icon name="clock" size={11} />
                {agoOf(artifact.savedAt)}
              </span>
            )}
          </span>
        </span>
        {/* The card is the button; this round mark shows it opens, and fills on hover. */}
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
  const listing = useQuery(logFilesQuery(logId, project));
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search);
  const all = useMemo(() => (isNil(listing.data) ? [] : artifactsOf(listing.data)), [listing.data]);
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
        {listing.isPending ? (
          <p className={NOTE}>Loading the log's artifacts…</p>
        ) : listing.isError ? (
          <p className={NOTE}>The artifacts could not be listed: {listing.error.message}</p>
        ) : all.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-soft text-neutral-4">
              <Icon name="upload" size={22} />
            </span>
            <strong className="text-[15px]">No artifacts yet</strong>
            <p className={`${NOTE} max-w-[280px]`}>
              Files uploaded with Insert, or saved by an agent, show up here.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className={NOTE}>No artifact matches “{query.trim()}”.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
