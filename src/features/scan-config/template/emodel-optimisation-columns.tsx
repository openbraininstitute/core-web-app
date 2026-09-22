'use client';

import { IonChannelModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/ion-channel-models-panel';
import {
  EModelOptimisationMechanismsTabs,
  isType,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';
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
 * preview column, and the middle panel takes the freed space. The first
 * sub-column holds the existing Middle form; selecting a Region Assignment card
 * opens the ion-channel-models panel beside it, and clicking the card again
 * closes it.
 */
export function EModelOptimisationColumns({ props, state }: Props) {
  const {
    selectedSchema,
    selectedRegionChoice,
    selectedMechanismsTab,
    config,
    setConfig,
    selectedRootElement,
  } = state;

  // The layout only renders when the selected root is the emodel element, but narrow
  // the union here so the panel gets a correctly typed schema.
  const rootSchema =
    selectedSchema !== undefined &&
    !isType(selectedSchema) &&
    selectedSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters
      ? selectedSchema
      : undefined;

  const selectedChoice = rootSchema?.properties.base_parameters.choices.find(
    (choice) => choice.name === selectedRegionChoice
  );

  // The panel belongs to Region Assignment; a selection made there must not leak the panel
  // into the other mechanisms tabs (e.g. Mechanism Selection).
  const onRegionAssignmentTab =
    selectedMechanismsTab === EModelOptimisationMechanismsTabs.RegionAssignment;

  const panelOpen = Boolean(rootSchema && selectedChoice && onRegionAssignmentTab);

  return (
    <>
      <LeftColumn props={props} state={state} />
      <div
        id="scan-config-controls-middle"
        className={cn(styles.scrollable, MIDDLE_WRAPPER_BASE, 'flex gap-[5px] *:min-w-0')}
      >
        {/* First sub-column: always one third wide, never growing to fill the freed space. */}
        <div className="min-w-0 shrink-0 grow-0 basis-1/3">
          <MiddleColumnContent props={props} state={state} />
        </div>

        {panelOpen && rootSchema && selectedChoice && (
          // `sticky top-0` + `self-start` pin the panel to the top of the scrolling middle area so
          // it stays put while the first column scrolls. Its height is capped to the scroll
          // container's visible height (`max-h-[calc(...)]`) and it scrolls internally if longer.
          <div className="sticky top-0 z-10 max-h-[calc(100vh-12rem)] min-w-0 shrink-0 grow-0 basis-1/3 self-start overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
            <IonChannelModelsPanel
              choiceName={selectedChoice.name}
              choiceLabel={selectedChoice.label}
              rootSchema={rootSchema}
              value={config[selectedRootElement]}
              onChange={(next) => setConfig({ ...config, [selectedRootElement]: next })}
            />
          </div>
        )}
      </div>
    </>
  );
}

export const EMODEL_OPTIMISATION_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,3fr)]';
