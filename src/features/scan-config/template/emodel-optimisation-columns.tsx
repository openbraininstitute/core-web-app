'use client';

import { cn } from '@/utils/css-class';

import { LeftColumn, MIDDLE_WRAPPER_BASE, MiddleColumnContent } from './columns';

import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Bespoke layout for the `emodel_optimisation_parameters` root element: no
 * preview column, and the middle panel takes the freed space split into three
 * equal sub-columns. The existing Middle form renders in the first sub-column;
 * the other two are intentionally empty for now.
 */
export function EModelOptimisationColumns({ props, state }: Props) {
  return (
    <>
      <LeftColumn props={props} state={state} />
      <div
        id="scan-config-controls-middle"
        className={cn(
          styles.scrollable,
          MIDDLE_WRAPPER_BASE,
          'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-[5px] *:min-w-0'
        )}
      >
        <MiddleColumnContent props={props} state={state} />
        {/* second and third sub-columns — intentionally empty for now */}
        <div />
        <div />
      </div>
    </>
  );
}

export const EMODEL_OPTIMISATION_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,3fr)]';
