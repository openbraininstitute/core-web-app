'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode, Suspense, useMemo } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Menu, type MenuProps } from 'antd';
import { unwrap } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { useQueryState } from 'nuqs';
import get from 'lodash/get';

import BackToInteractiveExplorationBtn from '@/components/explore-section/BackToInteractiveExplorationBtn';
import NavigationMenu from '@/components/explore-section/ExploreListingLayout/navigation-menu';
import SimpleErrorComponent from '@/components/GenericErrorFallback';

import {
  brainRegionHierarchyAtom,
  DEFAULT_BRAIN_REGION_QUERY_ID,
} from '@/features/brain-region-hierarchy/context';
import { circuitCountAtom } from '@/components/explore-section/Circuit/content/circuits_flat';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataTypeGroup } from '@/types/explore-section/data-types';
import { ensureString } from '@/util/type-guards';
import {
  EntityCoreExperimentalConfiguration,
  EntityCoreModelConfiguration,
} from '@/entity-configuration/domain';

import type { NavigationMenuItem } from '@/components/explore-section/ExploreListingLayout/navigation-menu';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { WorkspaceContext } from '@/types/common';

export default function ExploreListingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<WorkspaceContext & { type: EntitySlugValue; id: string }>();
  const pathname = usePathname();
  const [brainRegionId] = useQueryState(DEFAULT_BRAIN_REGION_QUERY_ID);
  const brainRegionHierarchy = useAtomValue(useMemo(() => unwrap(brainRegionHierarchyAtom), []));

  const [, setCurrentExplorerArtifact] = useCurrentExplorerArtifact();

  const splittedPathname = pathname?.split('/');
  const interactivePageHref = splittedPathname?.slice(0, splittedPathname.length - 2).join('/');

  const dataTypeGroup = pathname?.includes('experimental')
    ? DataTypeGroup.ExperimentalData
    : DataTypeGroup.ModelData;

  const config =
    dataTypeGroup === DataTypeGroup.ExperimentalData
      ? EntityCoreExperimentalConfiguration
      : EntityCoreModelConfiguration;

  const showCircuitMenu = dataTypeGroup === DataTypeGroup.ModelData;
  const activePath = pathname?.split('/').pop() || 'morphology';
  const circuitCount = useAtomValue(circuitCountAtom);

  const onClick: MenuProps['onClick'] = async (info) => {
    const { key, domEvent } = info;
    domEvent.preventDefault();
    domEvent.stopPropagation();

    const brainRegionName = brainRegionHierarchy?.options.find(
      (o) => o.value === brainRegionId
    )?.label;

    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(brainRegionName!);
    }
    const artifact = ensureString(
      getEntityBySlug({ slug: key as EntitySlugValue })?.title,
      'Morphology'
    );
    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.handleClick('artifact', artifact);
    router.push(key);
  };

  const nMenuItems = Object.keys(config).length + (showCircuitMenu ? 1 : 0);
  const menuItemWidth = `${Math.floor(100 / nMenuItems) - 0.04}%`;

  const items: Array<NavigationMenuItem> = Object.keys(config).map((dataType) => {
    const entity = get(config, `${dataType}`) as EntityCoreTypeConfig<any>;
    const key = entity?.slug!;
    const active = entity?.slug === activePath;
    const label = entity?.title!;
    const entitytype = entity.legacyType;

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
  });

  if (showCircuitMenu) {
    const circuitActive = activePath === 'circuit';

    items.push({
      key: 'circuit',
      title: 'Circuit',
      // TODO: circuit should be included to the supported types when ready in entitycore
      // @ts-expect-error
      entitytype: 'Circuit',
      label: `Circuit (${circuitCount})`,
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
  if (params?.id) {
    return <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>;
  }

  return (
    <div className="bg-primary-9 flex h-screen w-full overflow-x-auto" id="interactive-data-layout">
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
                className="flex w-[calc(100%+6px)] justify-start"
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
