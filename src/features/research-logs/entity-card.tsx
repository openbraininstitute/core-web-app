'use client';

import { useQuery } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import Link from 'next/link';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';

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

  return (
    <Link
      href={`/app/entity/${id}`}
      target="_blank"
      className="hover:border-primary-5 not-prose my-3 flex w-fit max-w-sm flex-col gap-0.5 rounded-xl border border-transparent bg-white px-4 py-3 no-underline shadow-md transition-colors"
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
  );
}
