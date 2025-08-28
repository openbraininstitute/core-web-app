import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useAtomValue, useSetAtom } from 'jotai';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Overview from '@/features/details-view/overview';

import {
  CommonSummaryViewFields,
  getViewDefinitionByLegacyType,
} from '@/entity-configuration/definitions/view-defs';
import { DetailsPageSideBackLink } from '@/components/explore-section/Sidebar';
import {
  brainRegionSidebarIsCollapsedAtom,
  detailFamily,
} from '@/state/explore-section/detail-view-atoms';
import { ErrorLink, withErrorConfig } from '@/components/GenericErrorFallback';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { conditionalAtom } from '@/hooks/use-conditional-atom';
import { downloadArchive } from '@/services/entity-download';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { DetailViewUrlParams } from '@/types/explore-section/application';

export default function Summary<T extends EntityCoreIdentifiableNamed>({
  payload,
  showViewMode,
  dataType,
  children,
  fieldsClassName,
  commonFields = CommonSummaryViewFields,
  actions,
}: {
  payload?: T | undefined;
  showViewMode?: boolean;
  commonFields?: Array<TypeSummaryProps>;
  dataType: DataType;
  children?: (detail: T) => ReactNode;
  fieldsClassName?: string;
  actions?: {
    onDownload?: (entity: T) => void;
  };
}) {
  const { id, virtualLabId, projectId, ...params } = useParams<DetailViewUrlParams>();
  const setBrainRegionSidebarIsCollapsed = useSetAtom(brainRegionSidebarIsCollapsedAtom);
  const fields = getViewDefinitionByLegacyType(dataType)?.summaryViewFields;

  const memoizedDetailAtom = useMemo(() => {
    const detailFetchAtom = detailFamily({ id, virtualLabId, projectId, dataType, ...params });
    return conditionalAtom<T>(payload, detailFetchAtom);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, id, virtualLabId, projectId, dataType, JSON.stringify(params)]);

  const detail = useAtomValue(memoizedDetailAtom);

  const onDownload = useCallback(
    (entity: T) => {
      if (actions?.onDownload) actions.onDownload(entity);
      else {
        downloadArchive(entity.type, [entity.id]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions?.onDownload]
  );

  useEffect(() => {
    setBrainRegionSidebarIsCollapsed(true);
  }, [setBrainRegionSidebarIsCollapsed]);

  // FIXME: this should not happen but better to have a nice handling as message in the center of the page
  if (!fields || !detail) return null;

  const component = match(detail)
    .with({ state: 'loading' }, () => (
      <div className="h-vh! text-primary-8 flex w-[calc(100vw-80px)]! items-center justify-center">
        <CentralLoadingSpinner />
      </div>
    ))
    .with({ state: 'hasError', error: P.any.select() }, () => {
      const Component = withErrorConfig({
        showButtons: false,
        customError: 'Something went wrong while fetching the data',
        children: (
          <div className="flex w-full gap-2">
            <ErrorLink
              title="Back to entities list"
              href={resolveExploreDetailsPageUrl({
                ctx: { virtualLabId, projectId },
                dataType: DataType.CircuitMEModel,
              })}
            />
            <ErrorLink title="Back to home" href="/app/virtual-lab" />
          </div>
        ),
      });
      return <Component />;
    })
    .with({ state: 'hasData' }, ({ data }) => {
      return (
        <div className="flex h-screen grow overflow-x-auto">
          <DetailsPageSideBackLink />
          <div
            id="summary-container"
            className="secondary-scrollbar ml-10 flex grow flex-col gap-7 overflow-y-scroll bg-white p-7 pr-12"
          >
            {showViewMode && <div className="text-right font-thin text-gray-400">View mode</div>}
            <Overview<T>
              fields={fields}
              commonFields={commonFields}
              detail={data}
              fieldsClassName={fieldsClassName}
              onDownload={onDownload}
            />
            {children && data && children(data)}
          </div>
        </div>
      );
    })
    .otherwise(() => null);

  return component;
}
