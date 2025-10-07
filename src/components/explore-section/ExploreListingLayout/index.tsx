'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode, Suspense, useMemo } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Menu, type MenuProps } from 'antd';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { useQueryState } from 'nuqs';
import get from 'es-toolkit/compat/get';

import { useFilteredCircuits } from '../Circuit/ListView/ExploreCircuitTable';
import BackToInteractiveExplorationBtn from '@/components/explore-section/BackToInteractiveExplorationBtn';
import NavigationMenu from '@/components/entities-type-stats/listing-navigation-menu';
import SimpleErrorComponent from '@/components/GenericErrorFallback';

import {
  brainRegionBasicCellGroupsRegionsHierarchyAtom,
  DEFAULT_BRAIN_REGION_QUERY_ID,
} from '@/features/brain-region-hierarchy/context';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { ensureString } from '@/util/type-guards';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
} from '@/components/entities-type-stats/helpers';
import { classNames } from '@/util/utils';

import type { NavigationMenuItem } from '@/components/entities-type-stats/listing-navigation-menu';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';
import { resolveDataKey } from '@/utils/key-builder';
import { tempIsCircuitInDev } from '@/temp-circuit-check';

export default function ExploreListingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<WorkspaceContext & { type: EntitySlugValue; id: string }>();
  const pathname = usePathname();
  const [brainRegionId] = useQueryState(DEFAULT_BRAIN_REGION_QUERY_ID);
  const brainRegionHierarchy = useAtomValue(
    useMemo(() => unwrap(brainRegionBasicCellGroupsRegionsHierarchyAtom), [])
  );

  const [, setCurrentExplorerArtifact] = useCurrentExplorerArtifact();

  const splittedPathname = pathname?.split('/');
  const interactivePageHref = splittedPathname?.slice(0, splittedPathname.length - 2).join('/');

  const dataTypeGroup = pathname?.includes('experimental')
    ? DataTypeGroup.ExperimentalData
    : DataTypeGroup.ModelData;

  const config =
    dataTypeGroup === DataTypeGroup.ExperimentalData
      ? ExperimentalEntitiesTileTypes
      : ModelEntitiesTileTypes;

  const activePath = pathname?.split('/').pop() || 'morphology';

  const onClick: MenuProps['onClick'] = async (info) => {
    const { key, domEvent } = info;
    domEvent.preventDefault();
    domEvent.stopPropagation();

    const brainRegionName = brainRegionHierarchy?.options.find(
      (o) => o.value === brainRegionId
    )?.label;

    const artifact = ensureString(
      getEntityBySlug({ slug: key as EntitySlugValue })?.title,
      'Morphology'
    );
    if (brainRegionName) userJourneyTracker.registerBrainRegionClick(brainRegionName);
    setCurrentExplorerArtifact(artifact);
    userJourneyTracker.registerArtifactClick(artifact);
    router.push(key);
  };

  const nMenuItems = Object.keys(config).length;
  const menuItemWidth = `${Math.floor(100 / nMenuItems) - 0.04}%`;

  const items: Array<NavigationMenuItem> = Object.keys(config)
    .map((dataType) => {
      const entity = get(config, `${dataType}`) as EntityCoreTypeConfig<any>;
      const key = entity?.slug!;
      const active = entity?.slug === activePath;
      const label = entity?.title!;
      const entitytype = entity.type;

      return {
        key,
        entitytype,
        title: label,
        label,
        className: 'text-center font-semibold',
        style: {
          backgroundColor: active ? 'white' : '#002766',
          color: active ? '#002766' : 'white',
          flexBasis: menuItemWidth,
        },
      };
    })
    .filter((item) => {
      if (!tempIsCircuitInDev()) {
        return item.key !== 'circuit';
      }
      return true;
    });

  const showCircuitMenu = dataTypeGroup === DataTypeGroup.ModelData;

  const dataKey = resolveDataKey({ projectId: params.projectId, section: 'explore' });
  const { filteredCircuits } = useFilteredCircuits({ dataKey });
  if (showCircuitMenu && !tempIsCircuitInDev()) {
    const circuitActive = activePath === 'circuit';

    items.push({
      key: 'circuit',
      title: 'Circuit',
      // @ts-expect-error
      entitytype: 'Circuit',
      label: `Circuit (${filteredCircuits.count})`,
      className: 'text-center font-semibold',
      style: {
        backgroundColor: circuitActive ? 'white' : '#002766',
        color: circuitActive ? '#002766' : 'white',
        flexBasis: menuItemWidth,
      },
    });
  }

  // NOTE: this is legacy to handle details page,
  // TODO: (this should change to layout per page type (one for listing and one for details))
  // ! The menu is not rendered for details pages (where the route contains `id` segment)
  if (params?.id) {
    return <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>;
  }

  return (
    <div
      className="secondary-scrollbar bg-primary-9 flex h-screen w-full overflow-x-auto"
      id="interactive-data-layout"
    >
      <ErrorBoundary
        FallbackComponent={SimpleErrorComponent}
        key={`${params.type}/${brainRegionId}`}
      >
        <BackToInteractiveExplorationBtn href={interactivePageHref} />
        <div className="flex w-full grow flex-col overflow-x-hidden">
          <Suspense
            fallback={
              <Menu
                selectedKeys={[activePath]}
                mode="horizontal"
                theme="dark"
                style={{ backgroundColor: '#002766', opacity: 70 }}
                className={classNames(
                  'flex w-[calc(100%+6px)] justify-start',
                  '[&>li]:gap2 [&>li]:flex [&>li]:h-[46px] [&>li]:items-center [&>li]:justify-center [&>li]:text-center'
                )}
                items={items.map((p) => ({ ...p, itemIcon: <LoadingOutlined className="ml-2" /> }))}
              />
            }
          >
            <NavigationMenu activePath={activePath} items={items} onClick={onClick} />
          </Suspense>
          <div className="bg-primary-9 grow text-white">{children}</div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
