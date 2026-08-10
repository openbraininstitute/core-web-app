import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { ScanConfigActivity } from '@/features/scan-config/types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { TScanConfigActivity } from '@/features/scan-config/types';

/**
 * Resolved circuit / model viewer feature flags.
 *
 * Always complete after {@link resolveEntityViewerConfig} — hosts never need
 * optional chaining on individual features.
 */
export interface IEntityViewerFeatures {
  /** Interactive electrode overlays + electrode chrome. Opt-in. */
  electrodes: boolean;
  /** Color-by dropdown + legend in the viewer chrome. */
  colorBy: boolean;
  /** Whole-cell hover highlight (morphoviewer flat ADD overlay). */
  cellHover: boolean;
  /** Nodes-table toggle in the viewer chrome. */
  nodesTable: boolean;
}

/**
 * Runtime context for contextual viewer policies.
 *
 * Resolve against the **source** entity (what is drawn). Pass workflow
 * `targetType` so the same source can differ by intent (e.g. ERA build vs
 * circuit simulate).
 */
export interface IEntityViewerResolveContext {
  section?: TWorkspaceSection;
  scope?: TWorkspaceScope;
  activity?: TScanConfigActivity;
  /** Workflow hub target (campaign / simulation). Not what is drawn. */
  targetType?: TExtendedEntitiesTypeDict;
}

/** Entity-level viewer policy overrides (all keys optional). */
export interface IEntityViewerConfig extends Partial<IEntityViewerFeatures> {}

/** Contextual viewer policy — invoked with {@link IEntityViewerResolveContext}. */
export type IEntityViewerConfigSource = (ctx: IEntityViewerResolveContext) => IEntityViewerConfig;

/**
 * Safe defaults when an entity omits `viewer` or only overrides some keys.
 * Electrodes are opt-in; color-by / nodes table / hover stay on by default.
 */
export const DEFAULT_ENTITY_VIEWER_FEATURES: Readonly<IEntityViewerFeatures> = {
  electrodes: false,
  colorBy: true,
  cellHover: true,
  nodesTable: true,
};

/** Merge entity `viewer` policy with defaults. */
export function resolveEntityViewerConfig(
  source: IEntityViewerConfig | IEntityViewerConfigSource | undefined,
  ctx: IEntityViewerResolveContext = {}
): IEntityViewerFeatures {
  const partial = typeof source === 'function' ? source(ctx) : (source ?? {});
  return {
    ...DEFAULT_ENTITY_VIEWER_FEATURES,
    ...partial,
  };
}

/** True when the host is a scan-config build surface (section or activity). */
export function isViewerBuildContext(ctx: IEntityViewerResolveContext): boolean {
  return (
    ctx.activity === ScanConfigActivity.Build ||
    ctx.section === WorkspaceSection.ScanConfigBuildWorkflow ||
    ctx.section === WorkspaceSection.BuildWorkflow
  );
}

/** True when the host is a scan-config simulate surface (section or activity). */
export function isViewerSimulateContext(ctx: IEntityViewerResolveContext): boolean {
  return (
    ctx.activity === ScanConfigActivity.Simulate ||
    ctx.section === WorkspaceSection.SimulateWorkflow
  );
}

/**
 * Electrode-overlay policy shared by every circuit-like model.
 *
 * On during an extracellular recording array build (the array being placed) and
 * during simulate (recording blocks may reference stored arrays). The viewer
 * still draws nothing until a source actually supplies overlays, so this only
 * grants the capability.
 */
export function circuitElectrodesViewerPolicy(ctx: IEntityViewerResolveContext): boolean {
  return (
    (isViewerBuildContext(ctx) &&
      isViewerTarget(ctx, ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign)) ||
    isViewerSimulateContext(ctx)
  );
}

/** True when the host is the Data browse/detail surface. */
export function isViewerDataContext(ctx: IEntityViewerResolveContext): boolean {
  return ctx.section === WorkspaceSection.Data;
}

/** True when resolving for a specific workflow target type. */
export function isViewerTarget(
  ctx: IEntityViewerResolveContext,
  targetType: TExtendedEntitiesTypeDict
): boolean {
  return ctx.targetType === targetType;
}
