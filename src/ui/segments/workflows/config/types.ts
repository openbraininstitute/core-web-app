import type { ComponentType, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkflowActivityDictValue } from '@/constants';
import type { FlagKey } from '@/features/feature-flags/flags';
import type { SchemaName } from '@/features/scan-config/types';
import type { TScanConfigWorkflowDefinition } from '@/features/scan-config/workflow/types';
import type { TWorkflowSchemaSelection } from '@/features/scan-config/workflow/workflow-schema-selection';
import type { TWorkflowBrowseConfig } from '@/ui/segments/workflows/browse/browse-config';
import type { TScanConfigConfigureBinding } from './scan-config-binding';

export const WORKFLOW_SESSION_ID_SEARCH_PARAM = 'session' as const;

export const WorkflowConfigureRoutingDict = {
  Session: 'session',
  Standalone: 'standalone',
} as const;

export type TWorkflowConfigureRouting =
  (typeof WorkflowConfigureRoutingDict)[keyof typeof WorkflowConfigureRoutingDict];

export const EntityGroupDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityGroupValue = (typeof EntityGroupDict)[keyof typeof EntityGroupDict];

export type TActivityValue =
  (typeof WorkflowActivityDictValue)[keyof typeof WorkflowActivityDictValue];

/**
 * How the workflow picks the first route segment (`new` vs `configure`).
 *
 * - `configure`: open configure directly (legacy static workflows).
 * - `browse`: always open `/new` entity browse first (legacy browse-first workflows).
 * - `schema`: `new` vs `configure` is resolved from the ObiOne scan-config schema
 *   `initialize` block (`model_identifier` / `model_identifier_multiple`) in step 2+.
 */
export const WorkflowInitialStagePolicyDict = {
  Configure: 'configure',
  Browse: 'browse',
  Schema: 'schema',
} as const;

export type TWorkflowInitialStagePolicy =
  (typeof WorkflowInitialStagePolicyDict)[keyof typeof WorkflowInitialStagePolicyDict];

/**
 * Presentation metadata for an extended entity type. Used for labels, grouping,
 * tooltips and filters — independent of any activity.
 */
export type TEntityTypeMeta = {
  value: TExtendedEntitiesTypeDict;
  group: TEntityGroupValue;
  label: string;
  title?: string;
  description?: string;
  tags?: readonly string[];
  icon?: ComponentType;
  requiredFeatures?: readonly FlagKey[];
  /**
   * The type is superseded by a newer implementation. Machine-readable counterpart of the
   * `(legacy)` suffix in {@link label}: menus read it to sort these entries last and render
   * them de-emphasised. `workflow-labels.test.ts` asserts flag and suffix stay in step.
   */
  legacy?: boolean;
};

/**
 * browse table metadata for `/workflows/{activity}/new/{targetType}`.
 * does not drive single vs multiple selection, that comes from the remote schema.
 */
export type IWorkflowConfigurationInput = {
  type: TExtendedEntitiesTypeDict;
  label?: string;
  required?: boolean;
  filters?: Record<string, unknown>;
};

/**
 * browse phase on `/workflows/{activity}/new/{type}`
 * selection: is the entity-picking step
 * prerequisite: is the optional pre-step a workflow gates the table behind
 */
export const WorkflowBreadcrumbPhaseDict = {
  Prerequisite: 'prerequisite',
  Selection: 'selection',
} as const;
export type TWorkflowBreadcrumbPhase =
  (typeof WorkflowBreadcrumbPhaseDict)[keyof typeof WorkflowBreadcrumbPhaseDict];

/**
 * the phases in the order they happen (first → last).
 * the one list that builds the breadcrumb trail, show every phase from the start up
 * to the one the app is on right now
 * if we want to add a new phase, just add it here in the right spot and the trail grows on its own
 */
export const WORKFLOW_BREADCRUMB_PHASE_ORDER = [
  WorkflowBreadcrumbPhaseDict.Prerequisite,
  WorkflowBreadcrumbPhaseDict.Selection,
] as const;

/** inputs handed to a breadcrumb resolver function so a crumb can be computed at render time */
export type TWorkflowBreadcrumbContext = {
  workflow: IWorkflowDescriptor;
  activity: TActivityValue;
  phase: TWorkflowBreadcrumbPhase;
  activeEntityType: TExtendedEntitiesTypeDict | null;
};

/** a breadcrumb crumb: static `ReactNode` (the default) or a function of the render context */
export type TWorkflowBreadcrumbNode =
  | ReactNode
  | ((context: TWorkflowBreadcrumbContext) => ReactNode);

/**
 * explicit, per-workflow breadcrumb definition for the `/new/{type}` page. When omitted the
 * resolver derives the trail from the workflow + activity + active selection
 */
export type TWorkflowBreadcrumb = {
  /** first crumb, links back to the workflows home */
  root: TWorkflowBreadcrumbNode;
  /** crumb rendered per browse phase; only the phases a workflow reaches need an entry */
  steps?: Partial<Record<TWorkflowBreadcrumbPhase, TWorkflowBreadcrumbNode>>;
};

/** one crumb in the `/new/{type}` trail */
export type TWorkflowBreadcrumbCrumb = {
  phase: TWorkflowBreadcrumbPhase;
  node: ReactNode;
  /** true = the screen you're on now (just text). the older crumbs you can click to go back. */
  isCurrent: boolean;
};

export type IWorkflowDescriptor = {
  sourceType: TExtendedEntitiesTypeDict;
  targetType: TExtendedEntitiesTypeDict;
  /**
   * When `true`, the workflow accepts more than one entity type as input on `/new`.
   * `sourceType` and `targetType` are still the same campaign type; accepted input
   * types come from the scan-config schema (not from {@link configurationInputs}).
   */
  hasMultipleSources?: boolean;
  /** first route segment after choosing this workflow on the workflow */
  initialStage: TWorkflowInitialStagePolicy;
  /** when true, configure UI and schema-driven routing use scan-config */
  isScanConfig: boolean;
  /** scan-config configure binding; required when {@link isScanConfig} is true */
  scanConfig?: {
    definition: TScanConfigWorkflowDefinition;
    /** ObiOne JSON schema used for `initialize` selection rules and the editor */
    schemaName: SchemaName;
    /** Browse type, API entity type, FromID mapping, and generated grid endpoint */
    configureBinding: TScanConfigConfigureBinding;
  };
  /**
   * Optional browse-table entity types, labels, and filters.
   * Not used to decide single vs multiple selection (schema only).
   */
  configurationInputs?: readonly IWorkflowConfigurationInput[];
  /**
   * optional per-entity-type browse prerequisite + loader configuration
   * lets a browse input require a "parent" pick first (prerequisite) and/or fetch its rows
   * through a custom paginated query (loader), absent = default browse behaviour
   */
  browseConfig?: TWorkflowBrowseConfig;
  /**
   * explicit breadcrumb for the `/new/{type}` browse page
   */
  breadcrumb?: TWorkflowBreadcrumb;
  label?: string;
  description?: string;
  tags?: readonly string[];
  filters?: Record<string, unknown>;
  disabled?: boolean;
  /**
   * Per-activity override of {@link TEntityTypeMeta.legacy}, resolved the same way `label` is.
   * Needed because a source type can be superseded on one activity and not another — `Memodel`
   * is legacy on Simulate while Build still has no newer alternative to distinguish it from.
   */
  legacy?: boolean;
  order?: number;
  requiredFeatures?: readonly FlagKey[];
  /** when true, browse table shows species / brain region selector */
  requireSpecies?: boolean;
  /** when true, browse table shows workspace scope selector */
  requireScope?: boolean;
  /** when true, browse table shows filter controls */
  requireFilters?: boolean;
  /**
   * scan-config configure URL shape; defaults to {@link WorkflowConfigureRoutingDict.Session}.
   * {@link WorkflowConfigureRoutingDict.Standalone} skips persisting a browse selection.
   */
  configureRouting?: TWorkflowConfigureRouting;
};

/** Resolved route segment after choosing a workflow on the workflow or `/new` guard. */
export const WorkflowInitialStageDict = {
  New: 'new',
  Configure: 'configure',
} as const;

export type TWorkflowInitialStage =
  (typeof WorkflowInitialStageDict)[keyof typeof WorkflowInitialStageDict];

export type TResolvedWorkflowInitialStage = {
  stage: TWorkflowInitialStage;
  workflow: IWorkflowDescriptor | null;
  schemaSelection?: TWorkflowSchemaSelection | null;
};

/**
 * Shared {@link IWorkflowDescriptor} fragments for activity registry entries.
 *
 * Every registry entry in `activities/*.ts` spreads exactly one of these. The pair it sets —
 * {@link IWorkflowDescriptor.initialStage} and {@link IWorkflowDescriptor.isScanConfig} — is
 * what decides where picking a workflow on `/workflows` lands the user, and which configure UI
 * that destination renders. Both are read together by `resolveWorkflowRouteStage` and
 * `buildWorkflowStartingPageUrl`, which is why they are set as a unit rather than field by field.
 *
 * The workflows named below are examples current at the time of writing, not an exhaustive
 * index — `activities/*.ts` is the source of truth.
 *
 * | Preset | First route | Configure UI |
 * |--------|-------------|--------------|
 * | {@link WorkflowStagePresets.DirectConfigure} | `/configure/{targetType}` | bespoke page |
 * | {@link WorkflowStagePresets.BrowseFirst} | `/new/{targetType}` | bespoke page |
 * | {@link WorkflowStagePresets.ScanConfig} | schema decides | scan-config editor |
 * | {@link WorkflowStagePresets.ScanConfigInEditorSelection} | `/configure/{targetType}/{session}` | scan-config editor |
 * | {@link WorkflowStagePresets.Disabled} | never routed | none |
 */
export const WorkflowStagePresets = {
  /**
   * Straight to a hand-written configure page — no entity browse, no scan-config editor.
   *
   * The URL carries no entity id (`buildLegacyConfigureUrl` emits
   * `/workflows/{activity}/configure/{targetType}`), so the page owns its own entity picking.
   *
   * Reach for it when the workflow ships a purpose-built configuration screen rather than one
   * generated from an ObiOne schema.
   *
   * @example Build activity
   * - Ion channel → ion-channel modeling campaign
   * - Single neuron (ME-model)
   * - Synaptome (legacy)
   */
  DirectConfigure: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    isScanConfig: false,
  },

  /**
   * Always opens the `/new/{targetType}` browse table first, then a hand-written configure page.
   *
   * Unlike {@link WorkflowStagePresets.ScanConfig} the browse step is unconditional: there is no
   * schema to ask, so the descriptor's own {@link IWorkflowDescriptor.configurationInputs} drive
   * the table.
   *
   * Reach for it for pre-scan-config workflows that still need an entity chosen before their
   * bespoke configure page can render.
   *
   * @example Simulate activity
   * - Single neuron (legacy) — ME-model → single neuron simulation
   * - Synaptome simulation (legacy)
   */
  BrowseFirst: {
    initialStage: WorkflowInitialStagePolicyDict.Browse,
    isScanConfig: false,
  },

  /**
   * Scan-config workflow whose first route is decided by its ObiOne schema.
   *
   * `inferWorkflowStartingPageRemoteSchemaBased` fetches the schema and inspects the `initialize`
   * block: a `model_identifier` / `model_identifier_multiple` field means entities are collected
   * on `/new` first, and its absence means configure opens straight away. That resolution is why
   * the same preset serves both single-entity and grouped multi-entity workflows.
   *
   * This is the default for new scan-config workflows.
   *
   * @example
   * - Simulate: circuit simulation at every scale, ME-model circuit, synaptome, ion channel
   * - Build: electron microscopy circuit, extracellular recording array
   * - Extract: circuit extraction campaign
   * - Process: EM mesh skeletonization
   */
  ScanConfig: {
    initialStage: WorkflowInitialStagePolicyDict.Schema,
    isScanConfig: true,
  },

  /**
   * Scan-config workflow that never shows `/new`, even though its schema declares a
   * `model_identifier*` field.
   *
   * Configure is the first and only stage: it opens on an empty workflow session
   * (`/configure/{targetType}/{sessionId}`) and the entities are picked inside the editor, from
   * that field's own browse widget. Skipping the schema probe also means the hub navigates
   * without waiting on a schema fetch.
   *
   * Reach for it when the rest of the configuration only makes sense next to the selection —
   * e-feature extraction discovers its protocols from the chosen recordings, so picking them on a
   * separate page ahead of the editor would strand the user one screen away from the consequence.
   *
   * The paired scan-config workflow definition must set `entity.picksEntitiesInEditor`,
   * otherwise configure reads the empty session as a skipped browse step and 404s.
   *
   * @example Extract activity
   * - Intracellular EFeatures → e-feature extraction campaign
   */
  ScanConfigInEditorSelection: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    isScanConfig: true,
  },

  /**
   * Placeholder for a workflow that is listed but not yet implemented.
   *
   * The stage fields are inert — entries using this also set `disabled: true`, so the menu
   * renders them greyed out and never routes anywhere. `Configure` / `false` are here only
   * because {@link IWorkflowDescriptor} requires them.
   *
   * @example
   * - Build: metabolism, NGV unit, NGV circuit, brain region, brain system, whole brain
   * - Simulate: metabolism, NGV unit, NGV circuit, brain system
   */
  Disabled: {
    initialStage: WorkflowInitialStagePolicyDict.Configure,
    isScanConfig: false,
  },
} as const;

export const WorkflowBrowseDefaults = {
  requireSpecies: false,
  requireScope: false,
} as const satisfies Pick<IWorkflowDescriptor, 'requireSpecies' | 'requireScope'>;

export type TActivityEntry = {
  value: TActivityValue;
  label: string;
  name: string;
  order?: number;
  disabled?: boolean;
  requiredFeatures?: readonly FlagKey[];
  /**
   * any-of gate: the activity is visible when at least one of these flags is on. Use it when
   * the activity hosts independently flagged workflows, so enabling one does not force the
   * others into view.
   */
  requiredAnyFeatures?: readonly FlagKey[];
  /** workflows available when configuring a new run (the /workflows page). */
  workflows: readonly IWorkflowDescriptor[];
  /**
   * workflows presented when filtering past runs (the /activities page).
   * Defaults to `workflows` when omitted. Useful when the browsed entity type
   * differs from the configured one (e.g. Extract lists CircuitExtractionCampaign
   * while configuration targets Circuit).
   */
  browseWorkflows?: readonly IWorkflowDescriptor[];
};

export const WorkflowListContextDict = {
  Configure: 'configure',
  Browse: 'browse',
} as const;

export type TWorkflowListContext =
  (typeof WorkflowListContextDict)[keyof typeof WorkflowListContextDict];

export type ResolvedWorkflow = IWorkflowDescriptor & {
  entity: TEntityTypeMeta;
  disabled: boolean;
  label: string;
  legacy: boolean;
};

export type TGroupedWorkflows<T> = Array<{
  group: TEntityGroupValue;
  options: T[];
}>;

export const WorkflowListSortDict = {
  Order: 'order',
  None: 'none',
} as const;
export type TWorkflowListSort = (typeof WorkflowListSortDict)[keyof typeof WorkflowListSortDict];
