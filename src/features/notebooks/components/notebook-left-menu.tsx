'use client';

import { useParams } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { WorkspaceScope } from '@/constants';
import { NotebookCountLink } from '@/features/notebooks/components/notebook-count-link';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';
import {
  resolveConcreteEntityPathParam,
  resolveExtendedTypeFromPathParamUrl,
} from '@/utils/url-builder';

import type { KebabCase } from '@/utils/type';

const SECTIONS = [
  { extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate, title: 'Notebooks' },
  { extendedType: ExtendedEntitiesTypeDict.AnalysisNotebookResult, title: 'Results' },
] as const;

/** The notebooks' sections, down a column, or side by side (`row`, on a phone). */
export function NotebookLeftMenu({ row = false }: { row?: boolean }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams<{ type?: KebabCase<TExtendedEntitiesTypeDict> }>();

  const activeType = type
    ? resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type
    : undefined;

  return (
    <nav
      data-testid="notebook-left-menu"
      className={cn('flex w-full gap-2', row ? 'flex-row *:min-w-0 *:flex-1' : 'flex-col py-2')}
    >
      {SECTIONS.map(({ extendedType, title }) => {
        const slug = resolveConcreteEntityPathParam(extendedType);
        const href = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/browse/${slug}`;
        return (
          <NotebookCountLink
            key={extendedType}
            title={title}
            extendedType={extendedType}
            href={href}
            scope={WorkspaceScope.Combined}
            isActive={activeType === extendedType}
          />
        );
      })}
    </nav>
  );
}
