import { match, P } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ELECTRODE_FOCUSED_NEURON_OPACITY } from '@/features/scan-config/components/color-by/use-viewer-config';
import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';
import { ScanConfigGeneratedApiPath } from '@/ui/segments/workflows/config/scan-config-binding';

/** Circuit-like entity types that get a 3D model preview during Simulate. */
const SIMULATE_CIRCUIT_PREVIEW_TYPES = new Set<string>([
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.MemodelCircuit,
  ExtendedEntitiesTypeDict.WholeBrain,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
]);

/**
 * Whether the scan-config right column should render {@link ModelPreview}.
 *
 * - Simulate → Circuit / MemodelCircuit / WholeBrain / SingleNeuronCircuit
 * - Extract / Build → Circuit only
 * - Always requires a loaded `entity`
 */
export function shouldShowCircuitModelPreview(options: {
  activity: TScanConfigActivity;
  entityType: string;
  hasEntity: boolean;
}): boolean {
  return match(options)
    .with({ hasEntity: false }, () => false)
    .with(
      {
        activity: ScanConfigActivity.Simulate,
        entityType: P.when((type) => SIMULATE_CIRCUIT_PREVIEW_TYPES.has(type)),
      },
      () => true
    )
    .with(
      {
        activity: P.union(ScanConfigActivity.Extract, ScanConfigActivity.Build),
        entityType: ExtendedEntitiesTypeDict.Circuit,
      },
      () => true
    )
    .otherwise(() => false);
}

/**
 * Host-owned initial neuron opacity for the circuit viewer.
 *
 * Dim only when electrode overlays are enabled and the host is the
 * extracellular recording array campaign — not inferred inside the viewer.
 */
export function resolveHostNeuronOpacity(options: {
  electrodeOverlaysEnabled: boolean;
  generatedApiPath: string | undefined;
}): number | undefined {
  return match(options)
    .with(
      {
        electrodeOverlaysEnabled: true,
        generatedApiPath: ScanConfigGeneratedApiPath.CreateExtracellularRecordingArray,
      },
      () => ELECTRODE_FOCUSED_NEURON_OPACITY
    )
    .otherwise(() => undefined);
}

/** Exclusive right-column preview modes (entity picker vs model surface). */
export const RightPreviewModeDict = {
  Settings: 'settings',
  EntityPreview: 'entity-preview',
  IonChannel: 'ion-channel',
  EFeatures: 'efeatures',
  CircuitModel: 'circuit-model',
  Empty: 'empty',
} as const;

export type TRightPreviewMode = (typeof RightPreviewModeDict)[keyof typeof RightPreviewModeDict];

/**
 * Preview modes a workflow owns, which picking entities must not replace.
 *
 * These panes are the point of their workflow — e-feature extraction exists to read the traces of
 * the recordings being configured — so they survive the mini-detail that confirming a browse
 * selection opens elsewhere. A click on an entity still wins; only the selection side effect is
 * ignored.
 */
const WorkflowOwnedPreviews = new Set<TRightPreviewMode>([RightPreviewModeDict.EFeatures]);

/**
 * Resolve which exclusive preview the right column should show.
 *
 * Entity mini-detail wins over model previews so browse selection stays visible, except over the
 * {@link WorkflowOwnedPreviews} when it was opened by a selection rather than a click.
 */
export function resolveRightPreviewMode(options: {
  settingsPanelActive?: boolean;
  entityPreviewActive: boolean;
  /** `true` when the mini-detail was opened by picking entities, not by clicking one. */
  entityPreviewFromSelection?: boolean;
  activity: TScanConfigActivity;
  entityType: string;
  hasEntity: boolean;
}): TRightPreviewMode {
  const modeWithoutEntityPreview = () =>
    resolveRightPreviewMode({ ...options, entityPreviewActive: false });

  return (
    match(options)
      // an explicitly opened settings form outranks any preview: it is the thing the user just asked for
      .with({ settingsPanelActive: true }, () => RightPreviewModeDict.Settings)
      .with(
        { entityPreviewActive: true, entityPreviewFromSelection: true },
        (): TRightPreviewMode => {
          const owned = modeWithoutEntityPreview();
          return WorkflowOwnedPreviews.has(owned) ? owned : RightPreviewModeDict.EntityPreview;
        }
      )
      .with({ entityPreviewActive: true }, () => RightPreviewModeDict.EntityPreview)
      .with(
        {
          activity: ScanConfigActivity.Simulate,
          entityType: ExtendedEntitiesTypeDict.IonChannelModel,
        },
        () => RightPreviewModeDict.IonChannel
      )
      // e-feature extraction reads its recordings from the config, not from a resolved route
      // entity, so this mode does not wait on `hasEntity` — the pane handles the empty selection
      .with(
        {
          activity: ScanConfigActivity.Extract,
          entityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
        },
        () => RightPreviewModeDict.EFeatures
      )
      .when(
        (state) => shouldShowCircuitModelPreview(state),
        () => RightPreviewModeDict.CircuitModel
      )
      .otherwise(() => RightPreviewModeDict.Empty)
  );
}
