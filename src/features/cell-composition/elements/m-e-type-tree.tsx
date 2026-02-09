/* eslint-disable react/jsx-props-no-spreading */

import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { match, P } from 'ts-pattern';

import Tree from '@/components/tree';
import { renderFloatNumber } from '@/entity-configuration/definitions/renderer';
import { useWorkspaceHierarchyRegistry } from '@/features/brain-region-hierarchy/hooks';
import {
  useAnnotationTypesQuery,
  useCellCompositionQuery,
} from '@/features/cell-composition/context';
import { CellCompositionSkeleton } from '@/features/cell-composition/elements/cell-composition-skeleton';
import { DensityOrCountToggle } from '@/features/cell-composition/elements/composition-type-toggle';
import Node from '@/features/cell-composition/elements/default-node';
import { getMetric, metricToUnit } from '@/features/cell-composition/elements/helpers';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { RenderNodeProps } from '@/components/tree/types';
import type { DensityOrCount, TreeNode } from '@/features/cell-composition/types';
import type { WorkspaceContext } from '@/types/common';

export function CellCompositionMETypeTree() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { selectedBrainRegion } = useWorkspaceHierarchyRegistry();

  const [densityOrCount, setDensityOrCount] = useState<DensityOrCount>('count');
  const {
    result: annotations,
    loading: loadingAnnotation,
    error: annotationError,
  } = useAnnotationTypesQuery({
    virtualLabId,
    projectId,
  });
  const {
    result: composition,
    loading: loadingComposition,
    error: compositionError,
  } = useCellCompositionQuery({
    brainRegionId: selectedBrainRegion?.id,
  });

  const defaultNode = useCallback(
    (props: RenderNodeProps<TreeNode>) => {
      const annotation = annotations.find((o) => o.id === props.node.id);
      return (
        <Node<TreeNode>
          {...props}
          title={annotation?.alt_label ?? annotation?.definition}
          subtitle={({ node: childNode, props: childProps }) => {
            return (
              <div
                className={classNames(
                  'mr-2',
                  childProps.hasChildren ? 'font-light! hover:font-medium' : ''
                )}
              >
                {renderFloatNumber(
                  densityOrCount === 'count' ? childNode.count : childNode.density
                )}
              </div>
            );
          }}
        />
      );
    },
    [densityOrCount, annotations]
  );

  return match({
    composition,
    annotations,
    loadingAnnotation,
    loadingComposition,
    compositionError,
    annotationError,
  })
    .when(
      ({ loadingComposition, loadingAnnotation }) => {
        if (loadingComposition || loadingAnnotation) return true;
        return false;
      },
      () => <CellCompositionSkeleton />
    )
    .when(
      ({ compositionError, annotationError }) => {
        if (compositionError || annotationError) return true;
        return false;
      },
      ({ compositionError, annotationError }) => {
        return (
          <div>
            {!!compositionError &&
              !!annotationError &&
              'loading data for cell composition and annotations failed'}
            {!!annotationError && 'loading data for annotations failed'}
            {!!compositionError && 'loading data for cell composition failed'}
          </div>
        );
      }
    )
    .with({ composition: P.select() }, (testComposition) => (
      <div className="relative flex h-90percent w-full flex-col gap-2">
        <h2
          className="sticky top-0 flex justify-between text-lg font-bold text-white"
          data-testid="total-count-or-density"
        >
          <span className="justify-self-start">Neurons [{metricToUnit[densityOrCount]}]</span>
          <small className="text-base font-normal text-gray-300">
            ~ {getMetric(testComposition.totalComposition.neuron, densityOrCount)}
          </small>
        </h2>

        <DensityOrCountToggle
          densityOrCount={densityOrCount}
          selectDensityOrCount={(v) => setDensityOrCount(v)}
        />
        <div
          id="cell-composition-tree-container"
          data-testid="cell-composition-tree-container"
          className={cn(
            'white-scrollbar border-primary-7 mt-2 h-full overflow-y-auto',
            'rounded-md border bg-white/2 p-4 backdrop-blur-md'
          )}
        >
          <h6 className="text-primary-3 px-1.5 text-sm font-normal">M-TYPES</h6>
          <Tree<TreeNode>
            dataKey="cell-composition-tree-container"
            data={testComposition.neurons as Array<TreeNode>}
            selectedNode={null}
            renderNode={defaultNode}
            indentation={{ h: false, v: false, size: 10 }}
            separator={false}
          />
        </div>
      </div>
    ))
    .otherwise(() => null);
}
