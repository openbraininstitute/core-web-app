'use client';

import fs from 'fs/promises';
import path from 'path';

import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { usePathname } from 'next/navigation';

import { GetStaticProps } from 'next';
import { CircuitSchemaProps } from '../Circuit/type';

import { useFlatCircuitMap } from '../Circuit/utils/use-flat-circuit-map';
import StatItem, { StatError, StatItemSkeleton } from './StatItem';

import { DATA_TYPE_GROUPS_CONFIG } from '@/constants/explore-section/data-type-groups';
import { DATA_TYPES_TO_CONFIGS } from '@/constants/explore-section/data-types';
import { DataType } from '@/constants/explore-section/list-views';
import { totalByExperimentAndRegionsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataTypeGroup } from '@/types/explore-section/data-types';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

export type DataTypeGroupTotalsProps = {
  dataTypeGroup: DataTypeGroup;
  virtualLabInfo?: VirtualLabInfo;
  circuits: CircuitSchemaProps[];
};

function DataTypeGroupTotal({
  dataType,
  basePath,
  virtualLabInfo,
}: {
  dataType: DataType;
  basePath: string;
  virtualLabInfo?: VirtualLabInfo;
}) {
  const dataScope = ExploreDataScope.SelectedBrainRegion;

  const total = useAtomValue(
    loadable(
      totalByExperimentAndRegionsAtom({
        dataType,
        dataScope,
        virtualLabInfo,
        key: (virtualLabInfo?.projectId ?? '') + dataType,
      })
    )
  );

  const statValue = total.state === 'hasData' ? total?.data || 0 : 0;
  const records = `${statValue} record${statValue > 0 ? 's' : ''}`;
  return (
    <>
      {total.state === 'loading' && <StatItemSkeleton />}
      {total.state === 'hasError' && (
        <StatError
          text={`'Error loading experiment datasets for ${DATA_TYPES_TO_CONFIGS[dataType].title}.`}
        />
      )}
      {total.state === 'hasData' && (
        <StatItem
          href={`${basePath}/${DATA_TYPES_TO_CONFIGS[dataType].name}`}
          key={DATA_TYPES_TO_CONFIGS[dataType].title}
          title={DATA_TYPES_TO_CONFIGS[dataType].title}
          subtitle={records}
          testId={`experiment-dataset-${dataType}`}
        />
      )}
    </>
  );
}

export default function DataTypeGroupTotals({
  dataTypeGroup,
  virtualLabInfo,
  circuits,
}: DataTypeGroupTotalsProps) {
  const { config, extensionPath } = DATA_TYPE_GROUPS_CONFIG[dataTypeGroup];
  const pathName = usePathname();

  const circuitMap = useFlatCircuitMap(circuits, {});

  return (
    <>
      {Object.keys(config).map((dataType) => {
        return (
          <DataTypeGroupTotal
            key={dataType}
            dataType={dataType as DataType}
            basePath={`${pathName}/${extensionPath}`}
            virtualLabInfo={virtualLabInfo}
          />
        );
      })}

      {dataTypeGroup === DataTypeGroup.ModelData && (
        <StatItem
          href={`${pathName}/model/circuit`}
          key="Circuit"
          title="Circuit"
          subtitle={`${circuitMap.size} record${circuitMap.size !== 1 ? 's' : ''}`}
          testId="experiment-dataset-Circuit"
        />
      )}
    </>
  );
}

export const getStaticProps: GetStaticProps<DataTypeGroupTotalsProps> = async () => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'circuits', 'circuits.json');

    const fileContents = await fs.readFile(filePath, 'utf8');

    const circuits: CircuitSchemaProps[] = JSON.parse(fileContents);

    return {
      props: {
        dataTypeGroup: DataTypeGroup.ModelData, // Adjust based on your context
        circuits,
      },
    };
  } catch (error) {
    throw new Error(`Failed to load circuits: ${error}`);

    return {
      props: {
        dataTypeGroup: DataTypeGroup.ModelData,
        circuits: [],
      },
    };
  }
};
