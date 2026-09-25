'use client';

import { Left, Middle } from '@/features/scan-config/components/ui-columns';
import { cn } from '@/utils/css-class';

import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

import styles from '@/features/scan-config/scan-config.module.css';

type ColumnProps = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/** Left tab/tree column, identical across every layout. */
export function LeftColumn({ props, state }: ColumnProps) {
  return (
    <Left
      schema={props.schema}
      selectedRootElement={state.selectedRootElement}
      setSelectedRootElement={state.setSelectedRootElement}
      config={state.config}
      setConfig={state.setConfig}
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
    />
  );
}

/**
 * Middle configuration form. Just the `<Middle>` itself — the wrapping
 * container (scroll, borders, any sub-column grid) is owned by each layout.
 */
export function MiddleColumnContent({ props, state }: ColumnProps) {
  const { selectedSchema } = state;
  if (!state.editing || selectedSchema === undefined) return null;

  return (
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
    />
  );
}

const MIDDLE_WRAPPER_BASE = cn(
  'h-full min-w-0 overflow-x-hidden overflow-y-auto secondary-scrollbar border-r border-l border-gray-200 px-3'
);

/** Standard scrollable middle wrapper used by the default layout. */
export function MiddleColumn({ props, state }: ColumnProps) {
  return (
    <div
      id="scan-config-controls-middle"
      data-testid="scan-config-middle-content"
      className={cn(styles.scrollable, MIDDLE_WRAPPER_BASE)}
    >
      <MiddleColumnContent props={props} state={state} />
    </div>
  );
}

export { MIDDLE_WRAPPER_BASE };
