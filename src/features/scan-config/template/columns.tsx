'use client';

import {
  checksMEModelCompatibility,
  MEMODEL_INPUTS_BLOCK,
  MEModelCompatibilityResult,
} from '@/features/scan-config/components/memodel-compatibility';
import { Left, Middle } from '@/features/scan-config/components/ui-columns';
import { cn } from '@/utils/css-class';

import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

import styles from '@/features/scan-config/scan-config.module.css';

type ColumnProps = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Left tab/tree column, identical across every layout. `formShown` is for a layout that can have
 * a block picked with its form folded away; elsewhere a form is showing whenever one is open.
 */
export function LeftColumn({ props, state, formShown }: ColumnProps & { formShown?: boolean }) {
  return (
    <Left
      schema={props.schema}
      selectedRootElement={state.selectedRootElement}
      setSelectedRootElement={state.setSelectedRootElement}
      config={state.config}
      setConfig={state.setConfig}
      scanMode={state.scanMode}
      setScanMode={state.setScanMode}
      campaignId={state.campaignId}
      loading={state.loading}
      selectedEntry={state.selectedEntry}
      setSelectedEntry={state.setSelectedEntry}
      setEditing={state.setEditing}
      readOnly={props.readOnly}
      setCampaignId={state.setCampaignId}
      setLoading={state.setLoading}
      errors={state.errors}
      setTab={state.setTab}
      allEntries={state.allEntries}
      newKey={state.newKey}
      setNewKey={state.setNewKey}
      isEditingKey={state.isEditingKey}
      setIsEditingKey={state.setIsEditingKey}
      activity={props.activity}
      generatedEndpoint={props.generatedEndpoint}
      entityType={props.entityType}
      campaignEntityType={props.campaignEntityType}
      aiEnabled={props.aiEnabled}
      selectedMechanismsTab={state.selectedMechanismsTab}
      setSelectedMechanismsTab={state.setSelectedMechanismsTab}
      formShown={formShown ?? state.editing}
    />
  );
}

/**
 * Middle configuration form. Just the `<Middle>` itself — the wrapping
 * container (scroll, borders, any sub-column grid) is owned by each layout.
 */
export function MiddleColumnContent({
  props,
  state,
  onClose,
}: ColumnProps & { onClose?: () => void }) {
  const { selectedSchema } = state;
  if (!state.editing || selectedSchema === undefined) return null;

  const showsMEModelCompatibility =
    checksMEModelCompatibility(props) && state.selectedRootElement === MEMODEL_INPUTS_BLOCK;

  return (
    <>
      <Middle
        key={`${props.schemaName}_${state.selectedRootElement}_${state.selectedEntry}_${state.selectedMechanismsTab}`}
        schema={props.schema}
        selectedRootElement={state.selectedRootElement}
        editing={state.editing}
        selectedEntry={state.selectedEntry}
        setSelectedEntry={state.setSelectedEntry}
        campaignId={state.campaignId}
        loading={state.loading}
        config={state.config}
        setConfig={state.setConfig}
        entity={props.entity}
        allEntries={state.allEntries}
        onNewBlockClick={() => {
          state.setNewKey('');
          state.setIsEditingKey(false);
        }}
        selectedSchema={selectedSchema}
        schemaMappingConfig={props.schemaMappingConfig}
        entityType={props.entityType}
        selectedMechanismsTab={state.selectedMechanismsTab}
        selectedRegionChoice={state.selectedRegionChoice}
        setSelectedRegionChoice={state.setSelectedRegionChoice}
        errors={state.errors}
        onClose={onClose}
      />
      {showsMEModelCompatibility && <MEModelCompatibilityResult config={state.config} />}
    </>
  );
}

const MIDDLE_WRAPPER_BASE = cn(
  'h-full min-w-0 overflow-x-hidden overflow-y-auto no-scrollbar border-r border-l border-gray-200 px-3'
);

/**
 * Standard scrollable middle wrapper used by the default layout. `onClose`, where the layout can
 * fold the column away, puts an × at the top right of what it shows.
 */
export function MiddleColumn({
  props,
  state,
  className,
  onClose,
}: ColumnProps & { className?: string; onClose?: () => void }) {
  return (
    <div
      id="scan-config-controls-middle"
      data-testid="scan-config-middle-content"
      className={cn(styles.scrollable, MIDDLE_WRAPPER_BASE, className)}
    >
      <MiddleColumnContent props={props} state={state} onClose={onClose} />
    </div>
  );
}

export { MIDDLE_WRAPPER_BASE };
