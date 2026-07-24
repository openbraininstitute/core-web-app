import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import {
  DEFAULT_ENTITY_VIEWER_FEATURES,
  isViewerBuildContext,
  isViewerDataContext,
  isViewerTarget,
  resolveEntityViewerConfig,
} from '@/entity-configuration/domain/viewer-config';
import { ScanConfigActivity } from '@/features/scan-config/types';

import type { IEntityViewerResolveContext } from '@/entity-configuration/domain/viewer-config';

describe('resolveEntityViewerConfig', () => {
  it('returns defaults when source is omitted', () => {
    expect(resolveEntityViewerConfig(undefined)).toEqual(DEFAULT_ENTITY_VIEWER_FEATURES);
  });

  it('merges a static partial over defaults', () => {
    expect(resolveEntityViewerConfig({ electrodes: true, colorBy: false })).toEqual({
      ...DEFAULT_ENTITY_VIEWER_FEATURES,
      electrodes: true,
      colorBy: false,
    });
  });

  it('resolves a contextual function (synaptome data policy)', () => {
    const source = ({ section }: IEntityViewerResolveContext) => ({
      electrodes: false,
      cellHover: false,
      colorBy: section !== WorkspaceSection.Data,
    });

    expect(resolveEntityViewerConfig(source, { section: WorkspaceSection.Data })).toMatchObject({
      electrodes: false,
      cellHover: false,
      colorBy: false,
      nodesTable: true,
    });

    expect(
      resolveEntityViewerConfig(source, { section: WorkspaceSection.SimulateWorkflow })
    ).toMatchObject({
      colorBy: true,
      cellHover: false,
    });
  });

  it('enables electrodes only for ERA build target on circuit source', () => {
    const source = (ctx: IEntityViewerResolveContext) => ({
      electrodes:
        isViewerBuildContext(ctx) &&
        isViewerTarget(ctx, ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign),
    });

    expect(
      resolveEntityViewerConfig(source, {
        activity: ScanConfigActivity.Build,
        targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
      })
    ).toMatchObject({ electrodes: true });

    expect(
      resolveEntityViewerConfig(source, {
        activity: ScanConfigActivity.Build,
        targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
      })
    ).toMatchObject({ electrodes: false });

    expect(
      resolveEntityViewerConfig(source, {
        activity: ScanConfigActivity.Simulate,
        targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
      })
    ).toMatchObject({ electrodes: false });
  });
});

describe('viewer context helpers', () => {
  it('detects data, build, and target contexts', () => {
    expect(isViewerDataContext({ section: WorkspaceSection.Data })).toBe(true);
    expect(isViewerBuildContext({ activity: ScanConfigActivity.Build })).toBe(true);
    expect(isViewerBuildContext({ section: WorkspaceSection.ScanConfigBuildWorkflow })).toBe(true);
    expect(isViewerBuildContext({ activity: ScanConfigActivity.Simulate })).toBe(false);
    expect(
      isViewerTarget(
        { targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign },
        ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign
      )
    ).toBe(true);
  });
});
