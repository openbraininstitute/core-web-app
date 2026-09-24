'use client';

import { useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

import { diffBarDataAtom } from '@/features/ai-assistant/chat/use-last-message-diff-bar';
import { showRestoreAtom } from '@/features/ai-assistant/message-item/collapsible-message/collapsible-message';
import { nextEntryName, useEntries } from '@/features/scan-config/components/hooks';
import { useConfig } from '@/features/scan-config/components/hooks/schema';
import { clearScanValueSelectionAtom } from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import {
  getConfigKeyForEntity,
  resolveScanConfigTab,
  ScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { useScanConfigEditingLocked } from '@/features/scan-config/hooks/use-config-editing-locked';
import { useScanConfigTab } from '@/features/scan-config/hooks/use-scan-config-tab';
import {
  type Config,
  isType,
  ScanConfigActivity,
  ScanConfigDefaultTab,
  ScanConfigTabs,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';
import { usePrevious } from '@/hooks/hooks';
import { useAgentState, useAIConfig } from '@/services/ai-agent';
import { clearDiffStateAtom, expandedRootElementsAtom } from '@/state/config-highlights';

import type { ScanConfigTemplateProps } from './types';

/**
 * All the state, derived values and handlers the scan-config template needs,
 * independent of how the columns are laid out. Both the default template and
 * the bespoke e-model-optimisation template consume this so the two layouts
 * stay in sync on everything except their column arrangement.
 */
export function useScanConfigTemplate({
  entity,
  origin,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  activity = ScanConfigActivity.Simulate,
  schema,
  schemaName,
  aiEnabled,
  entityType,
  campaignOriginAction,
  workflowSessionSelection,
  resolveSessionFromIdType,
  seed,
}: ScanConfigTemplateProps) {
  const [urlTab, setTab] = useScanConfigTab(activity, defaultTab);
  const firstRoot = Object.entries(schema.properties).find(([, spec]) => !isType(spec))?.[0];
  const [selectedRootElement, setSelectedRootElement] = useState(firstRoot ?? '');
  const [editing, setEditing] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState('');
  // selected inner mechanisms tab when the root element is `emodel_optimisation_parameters`
  const [selectedMechanismsTab, setSelectedMechanismsTab] = useState('');
  // selected Region Assignment section-list choice (`name`) driving the adjacent
  // ion-channel-models panel; empty when no card is selected
  const [selectedRegionChoice, setSelectedRegionChoice] = useState('');
  // selected model (`id_str`) within a region on the Parameters Selection tab, driving the
  // third detail drawer; empty when no model is selected
  const [selectedRegionModel, setSelectedRegionModel] = useState('');

  const [loading, setLoading] = useState(false);
  const isDuplicate = campaignOriginAction === ScanConfigCampaignOriginActionDict.Duplicate;
  const [campaignId, setCampaignId] = useState(isDuplicate ? '' : (origin ?? ''));
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [config, setConfig] = useConfig({
    schema,
    initialConfig,
    model: entity,
    origin,
    workflowSessionSelection,
    resolveFromIdType: resolveSessionFromIdType,
    seed,
  });
  const allEntries = useEntries({ config, schema });
  const editingLocked = useScanConfigEditingLocked({ campaignId, loading, readOnly });
  const setExpandedRootElements = useSetAtom(expandedRootElementsAtom);

  const createEntry = useCallback(
    (rootElement: string, block: Record<string, unknown>) => {
      const entry = nextEntryName(schema, rootElement, allEntries);
      allEntries.add(entry);

      setConfig(
        (previous) =>
          ({
            ...previous,
            [rootElement]: { ...(previous[rootElement] as object), [entry]: block },
          }) as Config
      );

      // Selecting alone only highlights the tab; the form opens on `editing`.
      setExpandedRootElements((previous) => new Set(previous).add(rootElement));
      setSelectedRootElement(rootElement);
      setSelectedEntry(entry);
      setEditing(true);
      setIsEditingKey(false);
      setNewKey('');
    },
    [schema, allEntries, setConfig, setExpandedRootElements]
  );

  const selectedSchema = schema.properties[selectedRootElement];
  const previousCampaignId = usePrevious(campaignId);
  const isCampaignIdChanged = previousCampaignId !== campaignId;

  const clearDiffState = useSetAtom(clearDiffStateAtom);
  const clearScanValueSelection = useSetAtom(clearScanValueSelectionAtom);
  const previousSchemaName = usePrevious(schemaName);

  const setDiffBarData = useSetAtom(diffBarDataAtom);
  const setShowRestore = useSetAtom(showRestoreAtom);

  useEffect(() => {
    // reset the global sidebar expansion/highlight state back to its idle default ("Info")
    clearDiffState();
    // guard the no-remount case (shared configure route, schema unchanged between workflows)
    if (previousSchemaName !== undefined && previousSchemaName !== schemaName) {
      setTab(defaultTab);
      setSelectedRootElement(firstRoot ?? '');
      setSelectedMechanismsTab('');
      setSelectedRegionChoice('');
      setSelectedRegionModel('');
      // Selections live in module state that outlives the route and are keyed
      // by block name, which repeats across workflows. Drop them so the next
      // workflow starts on each sweep's first value.
      clearScanValueSelection();
    }
  }, [
    schemaName,
    clearDiffState,
    clearScanValueSelection,
    previousSchemaName,
    defaultTab,
    firstRoot,
    setTab,
  ]);

  useEffect(
    () => () => {
      setDiffBarData(null);
      setShowRestore(false);
    },
    [setDiffBarData, setShowRestore]
  );

  useAgentState(
    aiEnabled
      ? getConfigKeyForEntity(entityType, activity, entity as { scale?: string } | undefined)
      : '',
    config
  );
  useAIConfig();

  // Changing the region choice must drop any model selected under the previous region, so the
  // third (detail) drawer doesn't linger with a stale model when a new region opens.
  const selectRegionChoice = useCallback((choice: string) => {
    setSelectedRegionChoice(choice);
    setSelectedRegionModel('');
  }, []);

  const tab = resolveScanConfigTab(urlTab, activity, Boolean(campaignId));
  const isConfigurationTab = tab.id === ScanConfigTabs[activity].configuration;

  // The `emodel_optimisation_parameters` root element gets a bespoke layout: no
  // preview column, and the middle panel spans the freed space split into
  // sub-columns. Everything else keeps the default three-column layout.
  const isEModelOptimisationParameters =
    selectedSchema !== undefined &&
    !isType(selectedSchema) &&
    selectedSchema.ui_element === ScanConfigUIElementDict.EModelOptimisationParameters;

  return {
    tab,
    setTab,
    selectedRootElement,
    setSelectedRootElement,
    editing,
    setEditing,
    selectedEntry,
    setSelectedEntry,
    selectedMechanismsTab,
    setSelectedMechanismsTab,
    selectedRegionChoice,
    // exposed as `setSelectedRegionChoice` but also clears the selected model on change
    setSelectedRegionChoice: selectRegionChoice,
    selectedRegionModel,
    setSelectedRegionModel,
    loading,
    setLoading,
    campaignId,
    setCampaignId,
    isEditingKey,
    setIsEditingKey,
    newKey,
    setNewKey,
    allEntries,
    config,
    setConfig,
    editingLocked,
    createEntry,
    selectedSchema,
    isCampaignIdChanged,
    isConfigurationTab,
    isEModelOptimisationParameters,
  };
}

export type ScanConfigTemplateState = ReturnType<typeof useScanConfigTemplate>;
