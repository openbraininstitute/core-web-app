'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode, Suspense, useMemo } from 'react';
import { Menu, type MenuProps } from 'antd';
import { useAtomValue } from 'jotai';
import get from 'lodash/get';

import BackToInteractiveExplorationBtn from '@/components/explore-section/BackToInteractiveExplorationBtn';
import NavigationMenu from '@/components/explore-section/ExploreListingLayout/navigation-menu';
import SimpleErrorComponent from '@/components/GenericErrorFallback';

import { circuitCountAtom } from '@/components/explore-section/Circuit/content/circuits_flat';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { getBulkEntityCoreCount } from '@/services/entitycore/entities-types-count';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataTypeGroup } from '@/types/explore-section/data-types';
import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { ensureString } from '@/util/type-guards';
import { tryCatch } from '@/api/utils';
import {
  EntityCoreExperimentalConfiguration,
  EntityCoreModelConfiguration,
} from '@/entity-configuration/domain';

import type { NavigationMenuItem } from '@/components/explore-section/ExploreListingLayout/navigation-menu';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

export default function ExploreListingLayout({
  children,
  virtualLabInfo,
}: {
  children: ReactNode;
  virtualLabInfo?: WorkspaceContext;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
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

  const entityCounterPromise = useMemo(
    () =>
      tryCatch(
        getBulkEntityCoreCount({
          context:
            virtualLabInfo?.virtualLabId && virtualLabInfo?.projectId
              ? { virtualLabId: virtualLabInfo.virtualLabId, projectId: virtualLabInfo.projectId }
              : undefined,
          brainRegion: selectedBrainRegion?.id,
        })
      ),
    [selectedBrainRegion]
  );

  const onClick: MenuProps['onClick'] = async (info) => {
    const { key, domEvent } = info;
    domEvent.preventDefault();
    domEvent.stopPropagation();

    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(selectedBrainRegion?.title!);
    }
    const artifact = ensureString(getEntityBySlug({ slug: key })?.title, 'Morphology');
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
      label: label,
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
      entityType: 'Circuit',
      label: `Circuit (${circuitCount})`,
      className: 'text-center font-semibold',
      style: {
        backgroundColor: circuitActive ? 'white' : '#002766',
        color: circuitActive ? '#002766' : 'white',
        flexBasis: menuItemWidth,
      },
    });
  }
  if (params?.id) {
    return <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>;
  }

  return (
    <div className="bg-primary-9 flex h-screen w-full overflow-x-auto" id="interactive-data-layout">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
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
                items={items}
              />
            }
          >
            <NavigationMenu
              activePath={activePath}
              items={items}
              onClick={onClick}
              entityCounterPromise={entityCounterPromise}
            />
          </Suspense>
          <div className="bg-primary-9 grow text-white">{children}</div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
