import { useQuery } from '@tanstack/react-query';
import kebabCase from 'lodash/kebabCase';

import { getProjectBookmarkCategories } from '@/api/virtual-lab-svc/queries/bookmark';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function LibraryLeftMenu() {
  const { virtualLabId, projectId } = useWorkspace();
  const { isLoading, data } = useQuery({
    queryKey: keyBuilder.bookmarkCategories({ virtualLabId, projectId }),
    queryFn: () => getProjectBookmarkCategories({ virtualLabId, projectId }),
    select: (response) => response.data,
  });

  const entries = Object.entries(data ?? {}).map(([type, value]) => {
    const entity = getEntityByExtendedType({ type: type as TExtendedEntitiesTypeDict });
    return {
      label: entity?.title,
      value,
      type,
    };
  });

  return (
    <div className="flex h-full flex-col px-4">
      <div className="my-4 flex w-full flex-col items-center justify-center gap-2">
        {entries.map((p) => (
          <BrowseLink
            isLoading={isLoading}
            href={`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/${kebabCase(p.type)}`}
            title={p.label ?? ''}
            type={p.type}
            key={`bookmark-link-${p.type}`}
            count={p.value}
          />
        ))}
      </div>
    </div>
  );
}
