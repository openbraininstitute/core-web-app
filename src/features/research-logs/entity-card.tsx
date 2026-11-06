'use client';

import { ExpandAltOutlined, ShrinkOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

const CircuitExpansion = dynamic(() => import('./circuit-expansion'), { ssr: false });

type EntityBrief = { id: string; type: string; name?: string; description?: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ENTITY_LINK = new RegExp(`/app/entity/(${UUID})/?(?:[?#].*)?$`, 'i');

/** The entity id when `href` is a platform entity link (`…/app/entity/<id>`). */
export function entityIdFromHref(href: string | undefined): string | null {
  return href?.match(ENTITY_LINK)?.[1] ?? null;
}

const label = (type: string) => type.replaceAll('_', ' ');

/** A card for the entity behind an `/app/entity/<id>` link: type, name and description. */
export function EntityCard({ id, fallbackHref }: { id: string; fallbackHref: string }) {
  const ctx = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useQuery({
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
  });

  const isCircuit = data?.type === 'circuit';

  return (
    <div className="not-prose my-3 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Link
          href={`/app/entity/${id}`}
          target="_blank"
          className="hover:border-primary-5 flex w-fit max-w-sm flex-col gap-0.5 rounded-xl border border-transparent bg-white px-4 py-3 no-underline shadow-md transition-colors"
        >
          <span className="text-neutral-4 text-[10px] font-medium tracking-wide uppercase">
            {data ? label(data.type) : isError ? 'Entity' : 'Loading…'}
          </span>
          <span className="text-primary-9 text-sm font-bold">
            {isLoading ? '…' : (data?.name ?? (isError ? fallbackHref : id))}
          </span>
          {data?.description ? (
            <span className="text-neutral-6 line-clamp-2 text-sm">{data.description}</span>
          ) : null}
        </Link>
        {isCircuit && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide the 3D view and table' : 'Show the 3D view and table'}
            title={expanded ? 'Hide the 3D view and table' : 'Show the 3D view and table'}
            onClick={() => setExpanded((open) => !open)}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full shadow-md transition-colors',
              expanded ? 'bg-primary-9 text-white' : 'text-primary-9 hover:bg-neutral-1 bg-white'
            )}
          >
            {expanded ? <ShrinkOutlined /> : <ExpandAltOutlined />}
          </button>
        )}
      </div>
      {isCircuit && expanded && <CircuitExpansion circuit={data as unknown as ICircuit} />}
    </div>
  );
}
