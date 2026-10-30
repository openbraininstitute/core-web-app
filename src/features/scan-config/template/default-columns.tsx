'use client';

import { useEffect, useRef } from 'react';

import { PaneSideResizeHandle, ShutPaneBar } from '@/features/circuit-viewer/pane-resize-handle';
import {
  SceneTablePaneProvider,
  useSceneTablePaneHost,
} from '@/features/circuit-viewer/scene-table-pane';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Right } from '@/features/scan-config/components/ui-columns';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { cn } from '@/utils/css-class';

import { useCollapsingColumns } from './collapsing-columns';
import { LeftColumn, MiddleColumn } from './columns';

import type { ReactNode, RefObject } from 'react';
import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Default scan-config layout: Left tabs, Middle form, Right preview in a
 * `1fr 1fr 2fr` grid. Dragging the preview's left edge left narrows the middle
 * column, then shuts it into a Parameters bar, then shuts the left one into the
 * same bar, so the preview, the 3D view and its table, has the width; the bar
 * opens them again. It never drags right of the middle, so the preview keeps
 * half the width at least.
 */
export function DefaultConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  const { gridRef, template, shut, onEdgeDrag, reset } = useCollapsingColumns();
  // Opening a block, from the list or the table's Neuron Set, shows its form again.
  const opened = `${state.selectedRootElement}/${state.selectedEntry}`;
  const lastOpened = useRef(opened);
  useEffect(() => {
    if (lastOpened.current === opened) return;
    lastOpened.current = opened;
    if (shut !== 'none') reset();
  }, [opened, shut, reset]);
  return (
    <div
      ref={gridRef}
      className={cn(
        'grid h-full min-h-0 w-full gap-1.25 *:min-w-0',
        !template && DEFAULT_COLUMNS_GRID
      )}
      style={template ? { gridTemplateColumns: template } : undefined}
    >
      {/* The blocks and their form in one window, as the preview's views are: its ring a pixel
          under the page's clip, its foot level with theirs. The form keeps only the rule between
          the two, and a subgrid keeps both on the grid's tracks as they are dragged. */}
      <div
        className={cn(
          BOX_CLASS,
          // a pixel in for its ring, which then meets the project selector's left edge
          'mt-px mb-3 ml-px grid min-h-0 grid-rows-1 gap-x-0 overflow-hidden py-3',
          shut === 'none' ? 'col-span-2 grid-cols-subgrid' : 'grid-cols-1',
          shut === 'both' && 'hidden'
        )}
      >
        <div className="h-full min-h-0">
          <LeftColumn props={props} state={state} />
        </div>
        {shut === 'none' && <MiddleColumn props={props} state={state} className="border-r-0" />}
      </div>
      {shut !== 'none' && (
        // Its ring a pixel under the page's clip, and its foot level with the preview's boxes.
        <ShutPaneBar
          upright
          title="Parameters"
          onOpen={reset}
          className={cn('mt-px mb-3', shut === 'both' && 'ml-px')}
        />
      )}
      <PreviewColumn boxed={boxed} edge={{ gridRef, onDrag: onEdgeDrag, onReset: reset }}>
        <Right
          activity={props.activity}
          entityType={props.entityType}
          entity={props.entity}
          selectedEntry={state.selectedEntry}
          selectedRootElement={state.selectedRootElement}
          onCreateEntry={state.createEntry}
          config={state.config}
          setConfig={state.setConfig}
          schema={props.schema}
          locked={state.editingLocked}
          inset={boxed}
        />
      </PreviewColumn>
    </div>
  );
}

/**
 * The right column. A simulation's is boxed as its results' views are, so its
 * Configuration and Simulations tabs read as one: the preview in a box, and the
 * 3D view's nodes table in one of its own under it, either side of the same
 * grab bar, which shuts either one into a bar.
 */
export function PreviewColumn({
  boxed,
  edge,
  children,
}: {
  boxed: boolean;
  /** The grab bar on its left edge, which the columns before it give way to. */
  edge?: {
    gridRef: RefObject<HTMLDivElement | null>;
    onDrag: (x: number) => void;
    onReset: () => void;
  };
  children: ReactNode;
}) {
  const table = useSceneTablePaneHost();
  const handle = edge && (
    // A double click puts the columns back as they were. Boxed, the bar sits halfway between the
    // column before and the box: past the grid's gap (0.3125rem) the box is inset 0.75rem.
    <div
      onDoubleClick={edge.onReset}
      className={cn('absolute inset-y-0 left-0', boxed && 'left-[0.21875rem]')}
    >
      <PaneSideResizeHandle containerRef={edge.gridRef} minWidth={0} onResize={edge.onDrag} />
    </div>
  );
  if (!boxed) {
    return (
      <div className="relative h-full min-h-0 min-w-0">
        {handle}
        <div className="h-full min-h-0 overflow-hidden">{children}</div>
      </div>
    );
  }
  return (
    <SceneTablePaneProvider value={table.value}>
      <div className="relative h-full min-h-0 min-w-0">
        {handle}
        <StackedPanes
          split="config"
          bottomShare={0.4}
          top={{
            title: '3D View',
            keepsSize: true,
            boxClassName: 'overflow-hidden',
            content: children,
          }}
          bottom={
            table.shown
              ? {
                  title: 'Neuron Table',
                  boxClassName: 'px-3 pt-1 pb-2',
                  content: <div ref={table.setTarget} className="flex h-full min-h-0 flex-col" />,
                }
              : null
          }
        />
      </div>
    </SceneTablePaneProvider>
  );
}

export const DEFAULT_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]';
