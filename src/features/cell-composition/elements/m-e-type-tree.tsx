import { useCallback, useState } from 'react';

import Node from '@/features/cell-composition/elements/default-node';
import Tree from '@/components/tree';

import { DensityOrCountToggle } from '@/features/cell-composition/elements/composition-type-toggle';
import { getMetric } from '@/components/build-section/BrainRegionSelector/util';
import { metricToUnit } from '@/components/common/METypeHierarchy/MetricToUnit';
import { renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import { classNames } from '@/util/utils';

import type { DensityOrCount } from '@/features/cell-composition/types';
import type {
  CompositionFormatted,
  ConstructedFullCellComposition,
} from '@/features/cell-composition/parser';
import type { RenderNodeProps } from '@/components/tree/types';

type Props = {
  composition: ConstructedFullCellComposition;
  //   meTypesMetadata: Record<string, ClassNexus> | undefined | null;
};

export function METypeDetails({ composition }: Props) {
  const [densityOrCount, setDensityOrCount] = useState<DensityOrCount>('count');

  const defaultNode = useCallback(
    (props: RenderNodeProps<CompositionFormatted>) => {
      return (
        <Node<CompositionFormatted>
          {...props}
          subtitle={({ node, props }) => {
            console.log('–– – m-e-type-tree.tsx:48 – METypeDetails – props:', props);
            return (
              <div
                className={classNames(
                  'mr-2',
                  props.hasChildren ? 'font-light! hover:font-medium' : ''
                )}
              >
                {renderFloatNumber(densityOrCount === 'count' ? node.count : node.density)}
              </div>
            );
          }}
        />
      );
    },
    [densityOrCount]
  );

  return (
    <>
      <h2
        className="flex justify-between text-lg font-bold text-white"
        data-testid="total-count-or-density"
      >
        <span className="justify-self-start">Neurons [{metricToUnit[densityOrCount]}]</span>
        <small className="text-base font-normal text-gray-300">
          ~ {getMetric(composition.totalComposition.neuron, densityOrCount)}
        </small>
      </h2>

      <DensityOrCountToggle
        densityOrCount={densityOrCount}
        selectDensityOrCount={(v) => setDensityOrCount(v)}
      />
      <div className="h-full overflow-y-auto rounded-md border border-[#0250b3] p-4">
        <h6 className="px-1.5 text-sm font-normal text-gray-400">M-TYPES</h6>
        <Tree<CompositionFormatted>
          dataKey=""
          data={composition.neurons}
          selectedNode={null}
          renderNode={defaultNode}
          indentation={{ h: false, v: false, size: 10 }}
          separator={false}
        />
      </div>
    </>
  );
}
