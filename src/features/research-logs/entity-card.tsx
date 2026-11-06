'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import {
  resolveWorkflowConfigureHrefForEntity,
  WorkflowConfigureOutcomeDict,
} from '@/ui/segments/workflows/config/entity-entry';
import { cn } from '@/utils/css-class';

import { useEntityPanel } from './entity-panel';

import type { MouseEvent, ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

const CircuitExpansion = dynamic(() => import('./circuit-expansion'), { ssr: false });

type EntityBrief = { id: string; type: string; name?: string; description?: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ENTITY_LINK = new RegExp(`/app/entity/(${UUID})/?(?:[?#].*)?$`, 'i');

/** The entity id when `href` is a platform entity link (`…/app/entity/<id>`). */
export function entityIdFromHref(href: string | undefined): string | null {
  return href?.match(ENTITY_LINK)?.[1] ?? null;
}

const label = (type: string) => type.replaceAll('_', ' ');

/** The entity behind an id: its own record where its type's route answers, else the bare entity. */
function entityBriefQuery(ctx: WorkspaceContext, id: string) {
  return {
    queryKey: ['research-log-entity-card', id],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<EntityBrief> => {
      const api = await entityCoreApi();
      const headers = { accept: 'application/json', ...getEntityCoreContext(ctx).headers };
      const base = await api.get<{ id: string; type: string }>(`/entity/${id}`, { headers });
      try {
        return await api.get<EntityBrief>(`/${kebabCase(base.type)}/${id}`, { headers });
      } catch {
        return base;
      }
    },
  };
}

/** A card for the entity behind an `/app/entity/<id>` link: type, name and description. */
export function EntityCard({ id, fallbackHref }: { id: string; fallbackHref: string }) {
  const ctx = useWorkspace();
  const panel = useEntityPanel();
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useQuery(entityBriefQuery(ctx, id));

  const isCircuit = data?.type === 'circuit';
  const selected = panel?.record?.id === id;

  const face = (
    <>
      <span className="text-neutral-4 text-[10px] font-medium tracking-wide uppercase">
        {data ? label(data.type) : isError ? 'Entity' : 'Loading…'}
      </span>
      <span className="text-primary-9 text-sm font-bold">
        {isLoading ? '…' : (data?.name ?? (isError ? fallbackHref : id))}
      </span>
      {data?.description ? (
        <span className="text-neutral-6 line-clamp-2 text-sm">{data.description}</span>
      ) : null}
    </>
  );
  const faceClass = cn(
    'flex w-fit max-w-sm flex-col gap-0.5 rounded-xl border bg-white px-4 py-3 text-left no-underline shadow-md transition-colors',
    selected ? 'border-primary-9' : 'hover:border-primary-5 border-transparent',
    // room for the Interact button in the corner
    isCircuit && 'pr-28'
  );

  return (
    <div className="not-prose my-3 flex flex-col gap-3">
      <div className="relative w-fit max-w-sm">
        {data && panel ? (
          // the entity's mini detail view opens beside the log, and the log shifts left to make room
          <button
            type="button"
            data-testid="research-log-entity-card"
            onClick={() =>
              panel.open({ ...data, name: data.name ?? id } as unknown as EntityCoreObjectTypes)
            }
            className={cn(faceClass, 'cursor-pointer')}
          >
            {face}
          </button>
        ) : isLoading ? (
          <div className={faceClass}>{face}</div>
        ) : (
          // no record to show: the entity's own page, as the link said
          <Link href={`/app/entity/${id}`} target="_blank" className={faceClass}>
            {face}
          </Link>
        )}
        {isCircuit && (
          // beside the card's own button, not inside it: a button cannot hold a button
          <button
            type="button"
            aria-expanded={expanded}
            title={expanded ? 'Hide the 3D view and table' : 'Show the 3D view and table'}
            onClick={() => setExpanded((open) => !open)}
            className={cn(
              PILL_CLASS,
              'absolute top-2 right-2 bg-purple-600 text-white hover:bg-purple-700',
              expanded && 'bg-purple-800 hover:bg-purple-800'
            )}
          >
            Interact
          </button>
        )}
      </div>
      {isCircuit && expanded && <CircuitExpansion circuit={data as unknown as ICircuit} />}
    </div>
  );
}

/**
 * An in-line link to an entity, which opens in a new tab as the link says, except a simulation
 * campaign: that opens in its workflow, read-only, as the Data page would not show its results.
 */
export function EntityLink({
  id,
  href,
  children,
}: {
  id: string;
  href: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const ctx = useWorkspace();
  const flags = useFlags();

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    // a modified click is the browser's own: new window, or save the link
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    // the tab opens on the click, which a pop-up blocker needs, and goes where the entity belongs
    const tab = window.open('', '_blank');
    void (async () => {
      let target = href;
      try {
        const brief = await queryClient.fetchQuery(entityBriefQuery(ctx, id));
        if (brief.type === EntityTypeDict.SimulationCampaign) {
          const result = await resolveWorkflowConfigureHrefForEntity({
            entityId: id,
            workspace: { virtualLabId: ctx.virtualLabId, projectId: ctx.projectId },
            flags,
          });
          if (result.outcome === WorkflowConfigureOutcomeDict.Resolved) target = result.href;
        }
      } catch {
        // not readable from here, say a link from another deployment: the link as written
      }
      const url = new URL(target, window.location.origin).href;
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    })();
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={open}
      className="text-primary-7 underline"
    >
      {children}
    </a>
  );
}
