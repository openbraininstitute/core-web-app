import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { ViewVariant, WorkspaceScope } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { NotebookActionMenu } from '@/features/notebooks/components/notebook-action-menu';
import Breadcrumb, { ToneDict } from '@/ui/molecules/breadcrumb';
import Close from '@/ui/molecules/close';
import DetailMenu from '@/ui/segments/explore/detail-menu';
import { EntityNameDisplay } from '@/ui/segments/explore/entity-name-display';
import {
  resolveConcreteEntityPathParam,
  resolveExtendedTypeFromPathParamUrl,
} from '@/utils/url-builder';

import type { PropsWithChildren } from 'react';
import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export async function NotebookViewLayout({
  children,
  context,
  type,
  id,
}: PropsWithChildren<{
  context: WorkspaceContext;
  type: KebabCase<TExtendedEntitiesTypeDict>;
  id: string;
}>) {
  const { virtualLabId, projectId } = context;
  const entityConfig = getEntityByExtendedType({
    type: resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type,
  });
  if (entityConfig?.group !== EntityTypeGroup.Notebooks || !entityConfig.detailViewSections) {
    notFound();
  }

  const { data: fetched, error } = await tryCatch(
    retrieveEntity({ type: entityConfig.extendedType, id, ctx: { virtualLabId, projectId } })
  );
  if (error || !fetched) notFound();
  const entity = fetched as IAnalysisNotebookTemplate | IAnalysisNotebookResult;
  const virtualLabData = await getVirtualLab({ id: virtualLabId }).catch(() => null);
  const isCourse = !virtualLabData || !!virtualLabData.course;

  const isTemplate =
    entityConfig.extendedType === ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
  const typeLabel = isTemplate ? 'Template' : 'Results';
  const scope = entity.authorized_public ? WorkspaceScope.Public : WorkspaceScope.Project;
  const templateType = resolveConcreteEntityPathParam(
    ExtendedEntitiesTypeDict.AnalysisNotebookTemplate
  );
  const parentLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/browse/${resolveConcreteEntityPathParam(entityConfig.extendedType)}?scope=${scope}`;
  const notebooksHome = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/browse/${templateType}?scope=${scope}`;

  const description = entity.description;

  return (
    <div
      id="notebook-view-layout"
      data-testid="notebook-view-layout"
      className="border-neutral-2 bg-background relative ml-5 flex h-full flex-col overflow-hidden rounded-2xl border"
    >
      <div
        id="notebook-view-layout-header"
        data-testid="notebook-view-layout-header"
        className="flex w-full items-center justify-between px-5 pt-4"
      >
        <div data-testid="notebook-breadcrumb" className="flex flex-nowrap gap-3">
          <Breadcrumb variant={ViewVariant.Light} tone={ToneDict.Inactive}>
            <Link href={notebooksHome} className="text-primary-9 hover:text-primary-8">
              Notebooks
            </Link>
          </Breadcrumb>
          <Breadcrumb showChevron={false} variant={ViewVariant.Light} tone={ToneDict.Active}>
            <Link href={parentLink} className="text-primary-9 hover:text-primary-8 font-bold">
              {typeLabel}
            </Link>
          </Breadcrumb>
        </div>
        <Close href={parentLink} className="mr-1" variant={ViewVariant.Light} />
      </div>

      <div
        id="notebook-view-layout-content"
        data-testid="notebook-view-layout-content"
        className="flex h-full max-h-[calc(100%-3.5rem)] min-h-0 gap-3 overflow-hidden pt-2"
      >
        <div
          id="notebook-view-layout-sidebar"
          data-testid="notebook-view-layout-sidebar"
          className="flex w-1/5 shrink-0 flex-col"
        >
          {entityConfig.detailViewSections.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <DetailMenu sections={entityConfig.detailViewSections} variant={ViewVariant.Light} />
            </div>
          ) : null}
          <NotebookActionMenu
            entity={entity}
            ctx={{ virtualLabId, projectId }}
            isTemplate={isTemplate}
            isPrivate={!entity.authorized_public}
            parentLink={parentLink}
            variant={ViewVariant.Light}
            hideDelete={isCourse}
          />
        </div>

        <div className="min-h-0 w-4/5 pr-3">
          <div className="secondary-scrollbar h-full overflow-x-auto overflow-y-auto pr-1 pb-6">
            <EntityNameDisplay
              name={entity.name}
              description={description}
              variant={ViewVariant.Light}
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
