'use client';

import { useParams, useSearchParams } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { SCOPE_QUERY_PARAMS, type TWorkspaceScope, WorkspaceScope } from '@/constants';
import { NotebookCountLink } from '@/features/notebooks/components/notebook-count-link';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  resolveConcreteEntityPathParam,
  resolveExtendedTypeFromPathParamUrl,
} from '@/utils/url-builder';

import type { KebabCase } from '@/utils/type';

const SECTIONS = [
  { extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate, title: 'Notebooks' },
  { extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookResult, title: 'Results' },
] as const;

export function NotebookLeftMenu() {
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type?: KebabCase<TExtendedEntitiesTypeDict> }>();

  const scope = (useSearchParams().get(SCOPE_QUERY_PARAMS) ??
    WorkspaceScope.Public) as TWorkspaceScope;
  const activeType = type
    ? resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type
    : undefined;

  return (
    <nav data-testid="notebook-left-menu" className="flex w-full flex-col gap-2 py-2">
      {SECTIONS.map(({ extendedType, title }) => {
        const slug = resolveConcreteEntityPathParam(extendedType);
        const href = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/browse/${slug}?scope=${scope}`;
        return (
          <NotebookCountLink
            key={extendedType}
            title={title}
            extendedType={extendedType}
            href={href}
            scope={scope}
            isActive={activeType === extendedType}
          />
        );
      })}
    </nav>
  );
}
