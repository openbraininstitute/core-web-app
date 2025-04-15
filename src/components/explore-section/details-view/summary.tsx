import { ReactNode, useEffect } from 'react';
import { Loadable } from 'jotai/vanilla/utils/loadable';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';
import Error from 'next/error';

import Overview from '@/components/explore-section/details-view/overview';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import usePathname from '@/hooks/pathname';

import { DetailProps, DetailViewUrlParams } from '@/types/explore-section/application';
import { COMMON_FIELDS } from '@/constants/explore-section/detail-views-fields';
import { DetailsPageSideBackLink } from '@/components/explore-section/Sidebar';
import { detailFamily } from '@/state/explore-section/detail-view-atoms';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreElement } from '@/constants/explore-section/fields-config/types';

export default function Summary<T extends EntityCoreIdentifiable & { name: string }>({
  fields,
  showViewMode,
  commonFields = COMMON_FIELDS,
  extraHeaderAction,
  dataType,
  children,
}: {
  fields: DetailProps[];
  showViewMode?: boolean;
  commonFields?: DetailProps[];
  extraHeaderAction?: ReactNode;
  dataType: DataType;
  children?: (detail: EntityCoreElement<T>) => ReactNode;
}) {
  const setBrainRegionSidebarIsCollapsed = useSetAtom(brainRegionSidebarIsCollapsedAtom);

  const path = usePathname();
  const { id, virtualLabId, projectId, ...params } = useParams<DetailViewUrlParams>();

  const detail = useLoadableValue(
    detailFamily({ id, virtualLabId, projectId, dataType, ...params })
  ) as Loadable<EntityCoreElement<T>>;

  useEffect(() => {
    setBrainRegionSidebarIsCollapsed(true);
  }, [setBrainRegionSidebarIsCollapsed]);

  return match(detail)
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
            <Overview<T>
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
}
