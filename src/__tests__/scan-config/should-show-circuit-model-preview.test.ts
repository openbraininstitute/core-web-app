import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ELECTRODE_FOCUSED_NEURON_OPACITY } from '@/features/scan-config/components/color-by/use-viewer-config';
import {
  RightPreviewModeDict,
  resolveHostNeuronOpacity,
  resolveRightPreviewMode,
  shouldShowCircuitModelPreview,
  type TRightPreviewMode,
} from '@/features/scan-config/components/model-preview/helpers';
import { ScanConfigActivity, type TScanConfigActivity } from '@/features/scan-config/types';
import { ScanConfigGeneratedApiPath } from '@/ui/segments/workflows/config/scan-config-binding';

/**
 * Oracle copied from the pre-refactor `Right` body (inline if / && branches).
 * Keep this in sync with historical behavior — not with the new helpers.
 */
function legacyRightPreviewMode(options: {
  entityPreview: unknown;
  previewRecord: unknown;
  isPreviewLoading: boolean;
  activity: TScanConfigActivity;
  entityType: string;
  entity: unknown;
}): TRightPreviewMode {
  const { entityPreview, previewRecord, isPreviewLoading, activity, entityType, entity } = options;

  // Early return: mini-detail
  if (entityPreview && (previewRecord || isPreviewLoading)) {
    return RightPreviewModeDict.EntityPreview;
  }

  // Independent conditionals in one wrapper — mutually exclusive by entityType in practice
  const showIonChannel =
    activity === ScanConfigActivity.Simulate &&
    entityType === ExtendedEntitiesTypeDict.IonChannelModel;

  const showCircuit =
    (activity === ScanConfigActivity.Simulate &&
      (entityType === ExtendedEntitiesTypeDict.Circuit ||
        entityType === ExtendedEntitiesTypeDict.MemodelCircuit ||
        entityType === ExtendedEntitiesTypeDict.WholeBrain ||
        entityType === ExtendedEntitiesTypeDict.SingleNeuronCircuit) &&
      Boolean(entity)) ||
    (activity === ScanConfigActivity.Extract &&
      Boolean(entity) &&
      entityType === ExtendedEntitiesTypeDict.Circuit) ||
    (activity === ScanConfigActivity.Build &&
      Boolean(entity) &&
      entityType === ExtendedEntitiesTypeDict.Circuit);

  if (showIonChannel) return RightPreviewModeDict.IonChannel;
  if (showCircuit) return RightPreviewModeDict.CircuitModel;
  return RightPreviewModeDict.Empty;
}

/** Pre-refactor opacity expression from `Right`. */
function legacyHostNeuronOpacity(options: {
  electrodeOverlaysEnabled: boolean;
  generatedApiPath: string | undefined;
}): number | undefined {
  const isElectrodeCampaign =
    options.generatedApiPath === ScanConfigGeneratedApiPath.CreateExtracellularRecordingArray;
  return options.electrodeOverlaysEnabled && isElectrodeCampaign
    ? ELECTRODE_FOCUSED_NEURON_OPACITY
    : undefined;
}

const ACTIVITIES = Object.values(ScanConfigActivity);
const ENTITY_TYPES = [
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.MemodelCircuit,
  ExtendedEntitiesTypeDict.WholeBrain,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.BrainRegion, // non-preview type
];

describe('shouldShowCircuitModelPreview', () => {
  it('requires a loaded entity', () => {
    expect(
      shouldShowCircuitModelPreview({
        activity: ScanConfigActivity.Simulate,
        entityType: ExtendedEntitiesTypeDict.Circuit,
        hasEntity: false,
      })
    ).toBe(false);
  });

  it('shows circuit-like types for Simulate', () => {
    for (const entityType of [
      ExtendedEntitiesTypeDict.Circuit,
      ExtendedEntitiesTypeDict.MemodelCircuit,
      ExtendedEntitiesTypeDict.WholeBrain,
      ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    ]) {
      expect(
        shouldShowCircuitModelPreview({
          activity: ScanConfigActivity.Simulate,
          entityType,
          hasEntity: true,
        })
      ).toBe(true);
    }

    expect(
      shouldShowCircuitModelPreview({
        activity: ScanConfigActivity.Simulate,
        entityType: ExtendedEntitiesTypeDict.IonChannelModel,
        hasEntity: true,
      })
    ).toBe(false);
  });

  it('shows Circuit only for Extract and Build', () => {
    for (const activity of [ScanConfigActivity.Extract, ScanConfigActivity.Build]) {
      expect(
        shouldShowCircuitModelPreview({
          activity,
          entityType: ExtendedEntitiesTypeDict.Circuit,
          hasEntity: true,
        })
      ).toBe(true);

      expect(
        shouldShowCircuitModelPreview({
          activity,
          entityType: ExtendedEntitiesTypeDict.MemodelCircuit,
          hasEntity: true,
        })
      ).toBe(false);
    }
  });

  it('hides Process (and any other non-circuit activities)', () => {
    expect(
      shouldShowCircuitModelPreview({
        activity: ScanConfigActivity.Process,
        entityType: ExtendedEntitiesTypeDict.Circuit,
        hasEntity: true,
      })
    ).toBe(false);
  });
});

describe('resolveHostNeuronOpacity', () => {
  it('matches the pre-refactor Right opacity expression', () => {
    const cases = [
      {
        electrodeOverlaysEnabled: true,
        generatedApiPath: ScanConfigGeneratedApiPath.CreateExtracellularRecordingArray,
      },
      {
        electrodeOverlaysEnabled: false,
        generatedApiPath: ScanConfigGeneratedApiPath.CreateExtracellularRecordingArray,
      },
      {
        electrodeOverlaysEnabled: true,
        generatedApiPath: undefined,
      },
      {
        electrodeOverlaysEnabled: true,
        generatedApiPath: 'some-other-path',
      },
      {
        electrodeOverlaysEnabled: false,
        generatedApiPath: undefined,
      },
    ] as const;

    for (const options of cases) {
      expect(resolveHostNeuronOpacity(options)).toBe(legacyHostNeuronOpacity(options));
    }
  });
});

describe('RightPreviewModeDict', () => {
  it('keeps stable string values used by the right-column matchers', () => {
    expect(RightPreviewModeDict).toEqual({
      Settings: 'settings',
      EntityPreview: 'entity-preview',
      IonChannel: 'ion-channel',
      EFeatures: 'efeatures',
      CircuitModel: 'circuit-model',
      Empty: 'empty',
    });
  });
});

/**
 * The e-feature traces are the right column's *default* for an extraction — they must not wait on
 * a resolved route entity, because the recordings are picked in the editor and live in the config.
 */
describe('resolveRightPreviewMode for e-feature extraction', () => {
  const efeatureState = {
    entityPreviewActive: false,
    activity: ScanConfigActivity.Extract,
    entityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
  } as const;

  it('shows the traces panel with no entity resolved', () => {
    expect(resolveRightPreviewMode({ ...efeatureState, hasEntity: false })).toBe(
      RightPreviewModeDict.EFeatures
    );
  });

  it('still yields to an explicitly opened settings form', () => {
    expect(
      resolveRightPreviewMode({ ...efeatureState, hasEntity: false, settingsPanelActive: true })
    ).toBe(RightPreviewModeDict.Settings);
  });

  it('still yields to a browse entity preview', () => {
    expect(
      resolveRightPreviewMode({ ...efeatureState, hasEntity: false, entityPreviewActive: true })
    ).toBe(RightPreviewModeDict.EntityPreview);
  });

  it('leaves circuit extraction on the model preview', () => {
    expect(
      resolveRightPreviewMode({
        entityPreviewActive: false,
        activity: ScanConfigActivity.Extract,
        entityType: ExtendedEntitiesTypeDict.Circuit,
        hasEntity: true,
      })
    ).toBe(RightPreviewModeDict.CircuitModel);
  });
});

describe('Right refactor parity (pre-refactor branching oracle)', () => {
  it('entityPreviewActive gate matches legacy early-return condition', () => {
    const previewStates = [
      { entityPreview: null, previewRecord: null, isPreviewLoading: false },
      { entityPreview: { dataType: 'circuit' }, previewRecord: null, isPreviewLoading: false },
      { entityPreview: { dataType: 'circuit' }, previewRecord: null, isPreviewLoading: true },
      {
        entityPreview: { dataType: 'circuit' },
        previewRecord: { id: '1' },
        isPreviewLoading: false,
      },
      {
        entityPreview: { dataType: 'circuit' },
        previewRecord: { id: '1' },
        isPreviewLoading: true,
      },
      { entityPreview: null, previewRecord: { id: '1' }, isPreviewLoading: true },
    ] as const;

    for (const state of previewStates) {
      const legacyActive = Boolean(
        state.entityPreview && (state.previewRecord || state.isPreviewLoading)
      );
      const mode = resolveRightPreviewMode({
        entityPreviewActive: legacyActive,
        activity: ScanConfigActivity.Simulate,
        entityType: ExtendedEntitiesTypeDict.Circuit,
        hasEntity: true,
      });
      const legacy = legacyRightPreviewMode({
        ...state,
        activity: ScanConfigActivity.Simulate,
        entityType: ExtendedEntitiesTypeDict.Circuit,
        entity: { id: 'e' },
      });
      expect(mode).toBe(legacy);
    }
  });

  it('mode matrix matches legacy Right for all activity × entityType × hasEntity', () => {
    for (const activity of ACTIVITIES) {
      for (const entityType of ENTITY_TYPES) {
        for (const hasEntity of [true, false]) {
          for (const entityPreviewActive of [true, false]) {
            const options = {
              entityPreviewActive,
              activity,
              entityType,
              hasEntity,
            };
            const actual = resolveRightPreviewMode(options);
            const legacy = legacyRightPreviewMode({
              entityPreview: entityPreviewActive ? { dataType: entityType } : null,
              previewRecord: entityPreviewActive ? { id: '1' } : null,
              isPreviewLoading: false,
              activity,
              entityType,
              entity: hasEntity ? { id: 'e' } : null,
            });
            expect(actual, JSON.stringify(options)).toBe(legacy);
          }
        }
      }
    }
  });

  it('shouldShowCircuitModelPreview matches legacy circuit && entity gate', () => {
    for (const activity of ACTIVITIES) {
      for (const entityType of ENTITY_TYPES) {
        for (const hasEntity of [true, false]) {
          const show = shouldShowCircuitModelPreview({ activity, entityType, hasEntity });
          const legacy = legacyRightPreviewMode({
            entityPreview: null,
            previewRecord: null,
            isPreviewLoading: false,
            activity,
            entityType,
            entity: hasEntity ? { id: 'e' } : null,
          });
          expect(show).toBe(legacy === RightPreviewModeDict.CircuitModel);
        }
      }
    }
  });
});
