'use client';

import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Right } from '@/features/scan-config/components/ui-columns';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

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
 * Configuration and Simulations tabs read as one.
 */
export function PreviewColumn({ boxed, children }: { boxed: boolean; children: ReactNode }) {
  if (!boxed) return <div className="h-full min-h-0 min-w-0 overflow-hidden">{children}</div>;
  return (
    <div className="h-full min-h-0 min-w-0 p-3">
      <div className={cn(BOX_CLASS, 'h-full min-h-0 overflow-hidden')}>{children}</div>
    </div>
  );
}

export const DEFAULT_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]';
