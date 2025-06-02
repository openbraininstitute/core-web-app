import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';

import { loadable } from 'jotai/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { match, P } from 'ts-pattern';

import Node from '@/features/cell-composition/elements/default-node';
import Tree from '@/components/tree';

import { DensityOrCountToggle } from '@/features/cell-composition/elements/composition-type-toggle';
import { cellCompositionAtom, annotationTypesAtom } from '@/features/cell-composition/context';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { getMetric } from '@/components/build-section/BrainRegionSelector/util';
import { metricToUnit } from '@/components/common/METypeHierarchy/MetricToUnit';
import { renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import { resolveDataKey } from '@/utils/key-builder';
import { classNames } from '@/util/utils';

import type { DensityOrCount, TreeNode } from '@/features/cell-composition/types';
import type { RenderNodeProps } from '@/components/tree/types';
import type { WorkspaceContext } from '@/types/common';

export function CellCompositionMETypeTree() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });

  const [densityOrCount, setDensityOrCount] = useState<DensityOrCount>('count');

  const cellCompositionForRegion = useMemo(
    () => loadable(cellCompositionAtom({ brainRegionId: node.id })),
    [node.id]
  );

  const composition = useAtomValue(cellCompositionForRegion);
  const annotations = useAtomValue(
    useMemo(
      () => loadable(annotationTypesAtom({ virtualLabId, projectId })),
      [virtualLabId, projectId]
    )
  );

  const defaultNode = useCallback(
    (props: RenderNodeProps<TreeNode>) => {
      const annotation =
        annotations.state === 'hasData'
          ? annotations.data.find((o) => o.id === props.node.id)
          : null;
      return (
        <Node<TreeNode>
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
    [densityOrCount, annotations]
  );

  return match({ composition, annotations })
    .when(
      ({ annotations, composition }) => {
        if (annotations.state === 'loading' || composition.state === 'loading') return true;
        return false;
      },
      () => (
        <div className="flex h-full items-center justify-center">
          <Spin size="large" indicator={<LoadingOutlined />} className="text-neutral-3" />
        </div>
      )
    )
    .when(
      ({ annotations, composition }) => {
        if (annotations.state === 'hasError' || composition.state === 'hasError') return true;
        return false;
      },
      ({ annotations, composition }) => {
        return (
          <div>
            {annotations.state === 'hasError' &&
              composition.state === 'hasError' &&
              'loading data for cell composition and annotations failed'}
            {annotations.state === 'hasError' && 'loading data for annotations failed'}
            {composition.state === 'hasError' && 'loading data for cell composition failed'}
          </div>
        );
      }
    )
    .with({ composition: { data: P.select() } }, (composition) => (
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
        <div className="primary-scrollbar h-full overflow-y-auto rounded-md border border-[#0250b3] p-4">
          <h6 className="px-1.5 text-sm font-normal text-gray-400">M-TYPES</h6>
          <Tree<TreeNode>
            dataKey=""
            data={composition.neurons as Array<TreeNode>}
            selectedNode={null}
            renderNode={defaultNode}
            indentation={{ h: false, v: false, size: 10 }}
            separator={false}
          />
        </div>
      </>
    ))
    .otherwise(() => null);
}
