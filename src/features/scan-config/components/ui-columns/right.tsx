'use client';

import { CloseOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { match } from 'ts-pattern';

import { ViewVariant, WorkspaceSection } from '@/constants';
import { resolveViewerFeaturesForEntityType } from '@/entity-configuration/domain/helpers';
import { useFlag } from '@/features/feature-flags';
import { electrodeOverlaysFlag } from '@/features/feature-flags/flags';
import { useScanConfigWorkflowEditorField } from '@/features/scan-config/bridge/editor-context';
import {
  usePreviewRecord,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import {
  type TScanConfigSettingsPanel,
  useScanConfigSettingsPanel,
  useSetScanConfigSettingsPanel,
  useSetScanConfigSettingsPanelSlot,
} from '@/features/scan-config/bridge/settings-panel';
import {
  RightPreviewModeDict,
  resolveHostNeuronOpacity,
  resolveRightPreviewMode,
} from '@/features/scan-config/components/model-preview/helpers';
import { Skeleton } from '@/ui/molecules/skeleton';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type {
  Config,
  ConfigSchema,
  TScanConfigActivity,
  TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import type { Nullish } from '@/utils/type';

const ModelPreview = dynamic(
  () => import('@/features/scan-config/components/model-preview').then((m) => m.ModelPreview),
  { ssr: false }
);

const IonChannelModelRecordingRender = dynamic(
  () =>
    import('@/features/scan-config/components/model-preview/ion-channel-figure-viewer').then(
      (m) => m.IonChannelModelRecordingRender
    ),
  { ssr: false }
);

const EFeaturesPreviewPanel = dynamic(
  () =>
    import(
      '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/preview-panel'
    ).then((m) => m.EFeaturesPreviewPanel),
  { ssr: false }
);

type RightProps = {
  activity: TScanConfigActivity;
  entityType: TExtendedEntitiesTypeDict;
  entity: TSupportedEntitiesForScanConfiguration | Nullish;
  selectedEntry: string;
  selectedRootElement: string;
  config: Config;
  setConfig: (newConfig: Config | ((prev: Config) => Config)) => void;
  /** Root scan-config schema; previews that describe the whole configuration read it. */
  schema: ConfigSchema;
  /**
   * The config can no longer be edited (campaign generated, generation in
   * flight, read-only host, …). Electrode overlays then render static: without
   * a write path the viewer offers no drag/rotate handles at all.
   */
  locked?: boolean;
};

/**
 * Clear the entity mini-detail when the workflow session / origin / model changes.
 *
 * Kept as a hook so {@link Right} stays a thin composition of preview variants.
 */
function useClearEntityPreviewOnNavigation(entityId: string | undefined) {
  const setEntityPreview = useSetScanConfigEntityPreview();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params?.id;
  const origin = searchParams.get('origin') ?? '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear stale preview when route session or entity changes
  useEffect(() => {
    setEntityPreview(null);
  }, [sessionId, origin, entityId, setEntityPreview]);
}

function useHostNeuronOpacity(): number | undefined {
  const workflowField = useScanConfigWorkflowEditorField();
  const electrodeOverlaysEnabled = !!useFlag(electrodeOverlaysFlag.key);

  return resolveHostNeuronOpacity({
    electrodeOverlaysEnabled,
    generatedApiPath: workflowField?.configureBinding?.generatedApiPath,
  });
}

/** Browse-selection overlay: loaded mini-detail or loading skeleton. */
function EntityPreviewPane({
  dataType,
  record,
}: {
  dataType: TExtendedEntitiesTypeDict;
  record: EntityCoreObjectTypes | null;
}) {
  const setEntityPreview = useSetScanConfigEntityPreview();

  return (
    <div
      id="scan-config-controls-right-mini-detail"
      className="h-full min-h-0 rounded-lg px-0.5 py-1"
    >
      {record ? (
        <MiniDetailViewRenderer
          section={WorkspaceSection.Data}
          record={record}
          dataType={dataType}
          theme={ViewVariant.Light}
          enableAnimation={false}
          hideUseModelAction
          onClose={() => setEntityPreview(null)}
        />
      ) : (
        <Skeleton className="h-full w-full rounded-lg" />
      )}
    </div>
  );
}

function IonChannelPreviewPane({
  selectedRootElement,
  selectedEntry,
  config,
}: {
  selectedRootElement: string;
  selectedEntry: string;
  config: Config;
}) {
  return (
    <div id="scan-config-controls-right-preview" className="rounded-lg px-0.5 h-full">
      <IonChannelModelRecordingRender
        selectedRootElement={selectedRootElement}
        selectedEntry={selectedEntry}
        config={config}
      />
    </div>
  );
}

function CircuitModelPreviewPane({
  entity,
  config,
  setConfig,
  selectedRootElement,
  selectedEntry,
  defaultNeuronOpacity,
  viewerFeatures,
  locked,
}: {
  entity: TSupportedEntitiesForScanConfiguration;
  config: Config;
  setConfig: RightProps['setConfig'];
  selectedRootElement: string;
  selectedEntry: string;
  defaultNeuronOpacity: number | undefined;
  viewerFeatures: IEntityViewerFeatures;
  locked?: boolean;
}) {
  // Memoised so the grouped prop does not hand ModelPreview a fresh object every
  // render; `config` already changes on each form edit, the rest rarely.
  //
  // Omitting `onConfigChange` while locked is what makes the overlays static —
  // the viewer keys its drag/rotate gizmo off the presence of a write path.
  const electrodes = useMemo(
    () => ({
      config,
      onConfigChange: locked ? undefined : setConfig,
      selectedRootElement,
      selectedEntry,
    }),
    [config, setConfig, selectedRootElement, selectedEntry, locked]
  );

  return (
    <div id="scan-config-controls-right-preview" className="rounded-lg px-0.5 h-full">
      <div className="rounded-lg h-full" id="scan-config-right-model-preview">
        <ModelPreview
          model={entity}
          electrodes={electrodes}
          defaultNeuronOpacity={defaultNeuronOpacity}
          viewerFeatures={viewerFeatures}
        />
      </div>
    </div>
  );
}

function EmptyPreviewPane() {
  return <div id="scan-config-controls-right-preview" className="rounded-lg px-0.5 h-full" />;
}

/**
 * Host for a field's settings form.
 *
 * Only the frame and the mount point live here; the field portals the form itself in, so it keeps
 * reading the live schema and config rather than a snapshot taken when the panel opened.
 */
function SettingsPane({ panel }: { panel: TScanConfigSettingsPanel }) {
  const setSlot = useSetScanConfigSettingsPanelSlot();
  const setPanel = useSetScanConfigSettingsPanel();

  useEffect(() => {
    return () => setSlot(null);
  }, [setSlot]);

  return (
    <div
      id="scan-config-controls-right-settings"
      className="h-full min-h-0 overflow-y-auto rounded-lg bg-white px-4 py-3"
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-primary-9 text-lg font-bold">{panel.title}</h3>
        <button type="button" aria-label="Close settings" onClick={() => setPanel(null)}>
          <CloseOutlined className="text-primary-9!" />
        </button>
      </header>

      <div ref={setSlot} />
    </div>
  );
}

/**
 * Scan-config right column: exclusive preview variants (entity mini-detail,
 * ion-channel figure, e-feature traces, or circuit model). Mode is derived during render.
 */
export function Right({
  activity,
  entityType,
  entity,
  selectedEntry,
  selectedRootElement,
  config,
  setConfig,
  schema,
  locked,
}: RightProps) {
  useClearEntityPreviewOnNavigation(entity?.id);
  const defaultNeuronOpacity = useHostNeuronOpacity();
  const workflowField = useScanConfigWorkflowEditorField();

  // Source entity owns the viewer; targetType is workflow intent only.
  const viewerFeatures = resolveViewerFeaturesForEntityType(
    entityType as TExtendedEntitiesTypeDict,
    {
      section: workflowField?.workspaceSection,
      activity: workflowField?.activity ?? activity,
      targetType: workflowField?.targetType,
    }
  );

  const {
    preview: entityPreview,
    record: previewRecord,
    isLoading: isPreviewLoading,
  } = usePreviewRecord();

  const settingsPanel = useScanConfigSettingsPanel();

  const mode = resolveRightPreviewMode({
    settingsPanelActive: Boolean(settingsPanel),
    entityPreviewActive: Boolean(entityPreview && (previewRecord || isPreviewLoading)),
    activity,
    entityType,
    hasEntity: Boolean(entity),
  });

  return match(mode)
    .with(RightPreviewModeDict.Settings, () =>
      settingsPanel ? <SettingsPane panel={settingsPanel} /> : <EmptyPreviewPane />
    )
    .with(RightPreviewModeDict.EntityPreview, () =>
      entityPreview ? (
        <EntityPreviewPane
          dataType={entityPreview.dataType}
          record={(previewRecord as EntityCoreObjectTypes | null) ?? null}
        />
      ) : (
        <EmptyPreviewPane />
      )
    )
    .with(RightPreviewModeDict.IonChannel, () => (
      <IonChannelPreviewPane
        selectedRootElement={selectedRootElement}
        selectedEntry={selectedEntry}
        config={config}
      />
    ))
    .with(RightPreviewModeDict.EFeatures, () => (
      <div
        id="scan-config-controls-right-efeatures"
        className="h-full bg-white min-h-0 overflow-y-auto secondary-scrollbar rounded-xl px-0.5"
      >
        <EFeaturesPreviewPanel config={config} schema={schema} />
      </div>
    ))
    .with(RightPreviewModeDict.CircuitModel, () =>
      entity ? (
        <CircuitModelPreviewPane
          entity={entity}
          config={config}
          setConfig={setConfig}
          selectedRootElement={selectedRootElement}
          selectedEntry={selectedEntry}
          defaultNeuronOpacity={defaultNeuronOpacity}
          viewerFeatures={viewerFeatures}
          locked={locked}
        />
      ) : (
        <EmptyPreviewPane />
      )
    )
    .with(RightPreviewModeDict.Empty, () => <EmptyPreviewPane />)
    .exhaustive();
}
