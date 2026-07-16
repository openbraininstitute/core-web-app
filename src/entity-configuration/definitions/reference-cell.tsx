'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyValue } from '@/entity-configuration/definitions/empty-value';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type ReferenceCellProps = {
  entityId?: string | null;
  entityType: TExtendedEntitiesTypeDict;
  className?: string;
};

export function ReferenceCell({ entityId, entityType, className }: ReferenceCellProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };
  const entityConfig = getEntityByExtendedType({ type: entityType });

  const { data, isLoading, isError } = useQuery({
    queryKey: keyBuilder.entity({ id: entityId ?? '', context, type: entityType }),
    queryFn: async () => {
      const request = entityConfig?.api.query.one;
      // @ts-expect-error  query only triggered when entityId is present
      return request?.({ id: entityId, context });
    },
    enabled: Boolean(entityId && entityConfig?.api.query.one),
  });

  if (!entityId) return <>{EmptyValue}</>;
  if (isLoading) return <Skeleton className="h-4 w-24" />;
  if (isError || !data?.name) return <>{EmptyValue}</>;

  return (
    <a
      href={`/app/entity/${entityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'line-clamp-1 decoration-current/40 underline-offset-2 hover:decoration-current',
        className
      )}
      title={data.name}
    >
      {data.name}
    </a>
  );
}
