import { Loadable } from 'jotai/vanilla/utils/loadable';
import { ReactNode, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';
import Link from 'next/link';

import Overview from '@/components/explore-section/details-view/overview';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import usePathname from '@/hooks/pathname';

import {
  CommonSummaryViewFields,
  getViewDefinitionByLegacyType,
} from '@/entity-configuration/definitions/view-defs';
import { DetailsPageSideBackLink } from '@/components/explore-section/Sidebar';
import { detailFamily } from '@/state/explore-section/detail-view-atoms';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';
import { withErrorConfig } from '@/components/GenericErrorFallback';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';

import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { DetailViewUrlParams } from '@/types/explore-section/application';

export default function Summary<T extends EntityCoreIdentifiable & { name: string }>({
  showViewMode,
  extraHeaderAction,
  dataType,
  children,
  commonFields = CommonSummaryViewFields,
}: {
  showViewMode?: boolean;
  commonFields?: Array<TypeSummaryProps>;
  extraHeaderAction?: ReactNode;
  dataType: DataType;
  children?: (detail: T) => ReactNode;
}) {
  const setBrainRegionSidebarIsCollapsed = useSetAtom(brainRegionSidebarIsCollapsedAtom);
  const fields = getViewDefinitionByLegacyType(dataType)?.summaryViewFields;

  const path = usePathname();
  const { id, virtualLabId, projectId, ...params } = useParams<DetailViewUrlParams>();

  const detail = useLoadableValue(
    detailFamily({ id, virtualLabId, projectId, dataType, ...params })
  ) as Loadable<T>;

  useEffect(() => {
    setBrainRegionSidebarIsCollapsed(true);
  }, [setBrainRegionSidebarIsCollapsed]);

  // FIXME: this should not happen but better to have a nice handling as message in the center of the page
  if (!fields || !detail) return null;

  const component = match(detail)
    .with({ state: 'loading' }, () => <CentralLoadingSpinner />)
    .with({ state: 'hasError', error: P.any.select() }, () => {
      const Component = withErrorConfig({
        showButtons: false,
        customError: 'Something went wrong while fetching the data',
        children: (
          <div className="flex w-full gap-2">
            <Link
              href={resolveExploreDetailsPageUrl({
                ctx: { virtualLabId, projectId },
                dataType: DataType.CircuitMEModel,
              })}
              className="w-1/2"
            >
              <div className="hover:bg-opacity-10 hover:text-primary-8 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
                Back to ME-Models
              </div>
            </Link>
            <Link href="/app/virtual-lab" className="w-1/2">
              <div className="hover:bg-opacity-10 hover:text-primary-8 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
                Back to home
              </div>
            </Link>
          </div>
        ),
      });
      return <Component />;
    })
    .with({ state: 'hasData' }, ({ data }) => {
      return (
        <div className="flex h-screen grow overflow-x-auto">
          <DetailsPageSideBackLink />
          <div className="ml-10 flex grow flex-col gap-7 overflow-y-scroll bg-white p-7 pr-12">
            {showViewMode && <div className="text-right font-thin text-gray-400">View mode</div>}
            <Overview
              fields={fields}
              commonFields={commonFields}
              detail={data}
              url={path}
              extraHeaderAction={extraHeaderAction}
            />
            {children && data && children(data)}
          </div>
        </div>
      );
    })
    .otherwise(() => null);

  return component;
}
