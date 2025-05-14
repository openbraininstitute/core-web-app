import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';

import Node from '@/features/cell-composition/elements/default-node';
import Tree from '@/components/tree';

import { DensityOrCountToggle } from '@/features/cell-composition/elements/composition-type-toggle';
import { cellCompositionAtom, annotationTypes } from '@/features/cell-composition/context';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { getMetric } from '@/components/build-section/BrainRegionSelector/util';
import { metricToUnit } from '@/components/common/METypeHierarchy/MetricToUnit';
import { renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import { resolveDataKey } from '@/utils/key-builder';
import { classNames } from '@/util/utils';

import type { CompositionFormatted } from '@/features/cell-composition/parser';
import type { DensityOrCount } from '@/features/cell-composition/types';
import type { RenderNodeProps } from '@/components/tree/types';
import type { WorkspaceContext } from '@/types/common';

export function METypeDetails() {
  const { projectId } = useParams<WorkspaceContext>();
  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });
  const [densityOrCount, setDensityOrCount] = useState<DensityOrCount>('count');
  const composition = useAtomValue(
    useMemo(() => cellCompositionAtom({ brainRegionId: node.id }), [node.id])
  );

  const annotations = useAtomValue(useMemo(() => annotationTypes, []));

  if (!node) {
    return null;
  }

  if (!composition.totalComposition.neuron) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6">
        No volume annotations available for this brain region
      </div>
    );
  }

  const defaultNode = useCallback(
    (props: RenderNodeProps<CompositionFormatted>) => {
      const annotation = annotations.find((o) => o.id === props.node.id);
      return (
        <Node<CompositionFormatted>
          {...props}
          title={annotation?.alt_label ?? annotation?.definition}
          subtitle={({ node, props }) => {
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
