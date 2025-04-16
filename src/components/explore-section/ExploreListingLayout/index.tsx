'use client';

import type { MenuProps } from 'antd';
import { Menu } from 'antd';
import { useAtomValue } from 'jotai';
import find from 'lodash/find';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { flattenRows } from '../Circuit/content/circuits_flat';
import { CircuitSchemaProps } from '../Circuit/type';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import BackToInteractiveExplorationBtn from '@/components/explore-section/BackToInteractiveExplorationBtn';
import { userJourneyTracker } from '@/components/explore-section/Literature/user-journey';
import { DATA_TYPES_TO_CONFIGS } from '@/constants/explore-section/data-types';
import { EXPERIMENT_DATA_TYPES } from '@/constants/explore-section/data-types/experiment-data-types';
import { MODEL_DATA_TYPES } from '@/constants/explore-section/data-types/model-data-types';
import { DataType } from '@/constants/explore-section/list-views';
import { useLoadableValue } from '@/hooks/hooks';
import { selectedBrainRegionAtom } from '@/state/brain-regions';
import { useCurrentExplorerArtifact } from '@/state/explore-section/artifact';
import { totalByExperimentAndRegionsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { ensureString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

const menuItemWidth = `${Math.floor(100 / Object.keys(EXPERIMENT_DATA_TYPES).length) - 0.01}%`;

const dataScope = ExploreDataScope.SelectedBrainRegion;

export type ExploreListingLayoutProps = {
  children?: ReactNode;
  virtualLabInfo?: VirtualLabInfo;
};

function MenuItemLabel({
  label,
  dataType,
  virtualLabInfo,
}: {
  label: string;
  dataType: DataType;
  virtualLabInfo?: VirtualLabInfo;
}) {
  const totalByExperimentAndRegions = useLoadableValue(
    totalByExperimentAndRegionsAtom({
      dataType,
      dataScope,
      virtualLabInfo,
      key: (virtualLabInfo?.projectId ?? '') + dataType,
    })
  );

  return `${label} ${
    totalByExperimentAndRegions.state === 'hasData' ? `(${totalByExperimentAndRegions.data})` : ''
  }`;
}

export default function ExploreListingLayout({
  children,
  virtualLabInfo,
}: ExploreListingLayoutProps) {
  const [, setCurrentExplorerArtifact] = useCurrentExplorerArtifact();
  const pathname = usePathname();
  const splittedPathname = pathname.split('/');
  const interactivePageHref = splittedPathname.slice(0, splittedPathname.length - 2).join('/');
  const router = useRouter();
  const params = useParams();
  const config = pathname.includes('experimental') ? EXPERIMENT_DATA_TYPES : MODEL_DATA_TYPES;
  const selectedBrainRegion = useAtomValue(selectedBrainRegionAtom);
  const activePath = pathname?.split('/').pop() || 'morphology';

  // State for circuit count
  const [circuitCount, setCircuitCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // FETCH CIRCUITS IN /PUBLIC
  useEffect(() => {
    const fetchCircuits = async () => {
      try {
        setLoading(true);
        const response = await fetch('/circuits/ALL_CIRCUITS.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const circuits: CircuitSchemaProps[] = await response.json();
        const circuitsFlat = flattenRows(circuits);
        setCircuitCount(circuitsFlat.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch circuits');
      } finally {
        setLoading(false);
      }
    };

    fetchCircuits();
  }, []);

  const onClick: MenuProps['onClick'] = async (info) => {
    const { key, domEvent } = info;
    domEvent.preventDefault();
    domEvent.stopPropagation();

    if (!(await userJourneyTracker.getCurrentTuple())) {
      await userJourneyTracker.handleBrainRegionClick(selectedBrainRegion?.title!);
    }
    const artifact = ensureString(find(DATA_TYPES_TO_CONFIGS, { name: key })?.title, 'Morphology');
    setCurrentExplorerArtifact(artifact);
    await userJourneyTracker.handleClick('artifact', artifact);
    router.push(key);
  };

  // eslint-disable-next-line
  const isCircuitPage = /\/model\/circuit\/[^\/]+$/.test(pathname);

  const items: {
    key: string;
    title: string;
    label: ReactNode;
    className: string;
    style: CSSProperties;
  }[] = Object.keys(config).map((dataType) => {
    const key = DATA_TYPES_TO_CONFIGS[dataType as DataType].name;
    const active = DATA_TYPES_TO_CONFIGS[dataType as DataType].name === activePath;
    const label = DATA_TYPES_TO_CONFIGS[dataType as DataType].title;

    return {
      key,
      title: label,
      label: (
        <MenuItemLabel
          dataType={dataType as DataType}
          label={label}
          virtualLabInfo={virtualLabInfo}
        />
      ),
      className: 'text-center font-semibold',
      style: {
        backgroundColor: active ? 'white' : '#002766',
        color: active ? '#002766' : 'white',
        flexBasis: menuItemWidth,
      },
    };
  });

  const circuitActive = activePath === 'circuit';

  const label = () => {
    if (loading) return 'Circuit (Loading...)';
    if (error) return 'Circuit (Error)';
    return `Circuits (${circuitCount})`;
  };

  items.push({
    key: 'circuit',
    title: 'Circuit',
    label: label(),
    className: 'text-center font-semibold',
    style: {
      backgroundColor: circuitActive ? 'white' : '#002766',
      color: circuitActive ? '#002766' : 'white',
      flexBasis: menuItemWidth,
    },
  });

  if (params?.id)
    return <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>;

  return (
    <div className="flex h-screen w-full overflow-x-auto bg-primary-9" id="interactive-data-layout">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        {!isCircuitPage && <BackToInteractiveExplorationBtn href={interactivePageHref} />}

        <div className={classNames('flex-1 overflow-hidden')}>
          {!isCircuitPage && (
            <Menu
              onClick={onClick}
              selectedKeys={[activePath]}
              mode="horizontal"
              theme="dark"
              style={{ backgroundColor: '#002766' }}
              className="flex w-full justify-start"
              items={items}
            />
          )}

          <div className="h-full w-full bg-primary-9 text-white">{children}</div>
        </div>
      </ErrorBoundary>
    </div>
  );
}
