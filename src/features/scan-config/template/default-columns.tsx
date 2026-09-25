'use client';

import { Right } from '@/features/scan-config/components/ui-columns';

import { LeftColumn, MiddleColumn } from './columns';

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
  return (
    <>
      <LeftColumn props={props} state={state} />
      <MiddleColumn props={props} state={state} />
      <div className="h-full min-h-0 min-w-0 overflow-hidden">
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
        />
      </div>
    </>
  );
}

export const DEFAULT_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]';
