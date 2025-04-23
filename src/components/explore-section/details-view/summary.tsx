import { Loadable } from 'jotai/vanilla/utils/loadable';
import { ReactNode, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';
import Error from 'next/error';

import Overview from '@/components/explore-section/details-view/overview';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import usePathname from '@/hooks/pathname';

import { DetailViewUrlParams } from '@/types/explore-section/application';
import {
  CommonSummaryViewFields,
  getViewDefinitionByLegacyType,
} from '@/entity-configuration/definitions/view-defs';
import { DetailsPageSideBackLink } from '@/components/explore-section/Sidebar';
import { detailFamily } from '@/state/explore-section/detail-view-atoms';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

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
  children?: (detail: EntityCoreObjectTypes) => ReactNode;
}) {
  const setBrainRegionSidebarIsCollapsed = useSetAtom(brainRegionSidebarIsCollapsedAtom);
  const fields = getViewDefinitionByLegacyType(dataType)?.summaryViewFields;

  const path = usePathname();
  const { id, virtualLabId, projectId, ...params } = useParams<DetailViewUrlParams>();

  const detail = useLoadableValue(
    detailFamily({ id, virtualLabId, projectId, dataType, ...params })
  ) as Loadable<EntityCoreObjectTypes>;

  useEffect(() => {
    setBrainRegionSidebarIsCollapsed(true);
  }, [setBrainRegionSidebarIsCollapsed]);

  // FIXME: this should not happen but better to have a nice handling as message in the center of the page
  if (!fields || !detail) return null;

  const component = match(detail)
    .with({ state: 'loading' }, () => <CentralLoadingSpinner />)
    .with({ state: 'hasError', error: P.any.select() }, () => {
      return <Error statusCode={400} title="Something went wrong while fetching the data" />;
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
