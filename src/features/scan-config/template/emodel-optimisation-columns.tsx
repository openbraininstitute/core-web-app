'use client';

import { useEffect } from 'react';

import { IonChannelModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/ion-channel-models-panel';
import {
  assignedModelIds,
  readMechanisms,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';
import { RegionModelDetail } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-model-detail';
import { RegionModelsPanel } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/region-models-panel';
import {
  type ConfigValue,
  EModelOptimisationMechanismsTabs,
  isType,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

import { LeftColumn, MIDDLE_WRAPPER_BASE, MiddleColumnContent } from './columns';

import type { ReactNode } from 'react';
import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/** The model `id_str`s assigned to a region in `mechanisms.mechanism_regions.<choice>`. */
function regionModelIds(value: ConfigValue, choiceName: string): Set<string> {
  return new Set(assignedModelIds(readMechanisms(value), choiceName));
}

/**
 * A sticky, one-third-width drawer column. `sticky top-0` + `self-start` pin it to the top of the
 * scrolling middle area so it stays put while the first column scrolls; its height is capped to the
 * visible area and it scrolls internally if longer.
 */
function DrawerColumn({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 max-h-[calc(100vh-12rem)] min-w-0 shrink-0 grow-0 basis-1/3 self-start overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
      {children}
    </div>
  );
}

/**
 * Bespoke layout for the `emodel_optimisation_parameters` root element: no preview column, and the
 * middle panel takes the freed space split into up to three one-third columns.
 *
 * - The first column always holds the Middle form (the active mechanisms tab's cards).
 * - Region Assignment: selecting a card opens the ion-channel-models drawer (checkboxes).
 * - Parameters Selection: selecting a card opens the assigned-models drawer (chevrons); selecting a
 *   model there opens a third detail drawer.
 */
export function EModelOptimisationColumns({ props, state }: Props) {
  const {
    selectedSchema,
    selectedRegionChoice,
    selectedRegionModel,
    setSelectedRegionModel,
    selectedMechanismsTab,
    config,
    setConfig,
    selectedRootElement,
    editingLocked,
  } = state;

  // The layout only renders when the selected root is the emodel element, but narrow
  // the union here so the panels get a correctly typed schema.
  const rootSchema =
    selectedSchema !== undefined &&
    !isType(selectedSchema) &&
    selectedSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters
      ? selectedSchema
      : undefined;

  const selectedChoice = rootSchema?.properties.base_parameters.choices.find(
    (choice) => choice.name === selectedRegionChoice
  );

  const onRegionAssignmentTab =
    selectedMechanismsTab === EModelOptimisationMechanismsTabs.RegionAssignment;
  const onParametersSelectionTab =
    selectedMechanismsTab === EModelOptimisationMechanismsTabs.ParametersSelection;

  const value = config[selectedRootElement];
  const writeValue = (next: typeof value) => setConfig({ ...config, [selectedRootElement]: next });

  // Region Assignment: second column is the ion-channel-models picker (checkboxes).
  const assignmentDrawerOpen = Boolean(rootSchema && selectedChoice && onRegionAssignmentTab);
  // Parameters Selection: second column is the assigned-models list (chevrons); the third is the
  // model detail, shown once a model row is selected.
  const modelsDrawerOpen = Boolean(rootSchema && selectedChoice && onParametersSelectionTab);

  // A selected model that has since been removed from the region (e.g. deleted from the master
  // list) must not keep the detail drawer open, so gate it on the model still being assigned.
  const selectedModelStillAssigned =
    Boolean(selectedRegionModel) &&
    Boolean(selectedChoice) &&
    regionModelIds(value, selectedChoice?.name ?? '').has(selectedRegionModel);
  const detailDrawerOpen = modelsDrawerOpen && selectedModelStillAssigned;

  // Drop the stale selection from state too, so it can't resurface if the model is re-added.
  useEffect(() => {
    if (selectedRegionModel && !selectedModelStillAssigned) {
      setSelectedRegionModel('');
    }
  }, [selectedRegionModel, selectedModelStillAssigned, setSelectedRegionModel]);

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

        {assignmentDrawerOpen && rootSchema && selectedChoice && (
          <DrawerColumn>
            <IonChannelModelsPanel
              choiceName={selectedChoice.name}
              choiceLabel={selectedChoice.label}
              choiceDescription={selectedChoice.description}
              rootSchema={rootSchema}
              value={value}
              onChange={writeValue}
              disabled={editingLocked}
            />
          </DrawerColumn>
        )}

        {modelsDrawerOpen && selectedChoice && (
          <DrawerColumn>
            <RegionModelsPanel
              choiceName={selectedChoice.name}
              choiceLabel={selectedChoice.label}
              choiceDescription={selectedChoice.description}
              value={value}
              selectedRegionModel={selectedRegionModel}
              setSelectedRegionModel={setSelectedRegionModel}
            />
          </DrawerColumn>
        )}

        {detailDrawerOpen && selectedChoice && (
          <DrawerColumn>
            <RegionModelDetail
              choiceName={selectedChoice.name}
              modelId={selectedRegionModel}
              value={value}
              onChange={writeValue}
              disabled={editingLocked}
            />
          </DrawerColumn>
        )}
      </div>
    </>
  );
}

export const EMODEL_OPTIMISATION_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,3fr)]';
