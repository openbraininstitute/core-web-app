'use client';

import {
  SceneTablePaneProvider,
  useSceneTablePaneHost,
} from '@/features/circuit-viewer/scene-table-pane';
import { Right } from '@/features/scan-config/components/ui-columns';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';

import { LeftColumn, MiddleColumn } from './columns';

import type { ReactNode } from 'react';
import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Default scan-config layout: Left tabs, Middle form, Right preview in a
 * `1fr 1fr 2fr` grid.
 */
export function DefaultConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  return (
    <>
      <LeftColumn props={props} state={state} />
      <MiddleColumn props={props} state={state} />
      <PreviewColumn boxed={boxed}>
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
    </>
  );
}

/**
 * The right column. A simulation's is boxed as its results' views are, so its
 * Configuration and Simulations tabs read as one: the preview in a box, and the
 * 3D view's nodes table, while its button has it up, in one of its own under it,
 * either side of the same grab bar.
 */
export function PreviewColumn({ boxed, children }: { boxed: boolean; children: ReactNode }) {
  const table = useSceneTablePaneHost();
  if (!boxed) return <div className="h-full min-h-0 min-w-0 overflow-hidden">{children}</div>;
  return (
    <SceneTablePaneProvider value={table.value}>
      <div className="h-full min-h-0 min-w-0">
        <StackedPanes
          split="config"
          bottomShare={0.4}
          top={{ title: '3D View', keepsSize: true, boxClassName: 'overflow-hidden', content: children }}
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
