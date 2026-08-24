import {
  EntityLifecycleStatus,
  EntityLifecycleStatusLabel,
  type TEntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';

import type { TWorkspaceSection } from '@/constants';

/** Anything that may carry entitycore's `lifecycle_status` field. Unknown wire values stay allowed. */
export type TLifecycleStatusCarrier = {
  lifecycle_status?: TEntityLifecycleStatus | string | null;
};

const WORKFLOW_PICKER_SECTIONS = new Set<TWorkspaceSection>([
  WorkspaceSection.BuildWorkflow,
  WorkspaceSection.ScanConfigBuildWorkflow,
  WorkspaceSection.SimulateWorkflow,
  WorkspaceSection.ExtractWorkflow,
  WorkspaceSection.ProcessWorkflow,
]);

const BLOCKED_LIFECYCLE_REASONS: Partial<Record<TEntityLifecycleStatus, string>> = {
  [EntityLifecycleStatus.Draft]: `This ${EntityLifecycleStatusLabel[EntityLifecycleStatus.Draft]} entity is not ready to run.\nSet it to ${EntityLifecycleStatusLabel[EntityLifecycleStatus.Active]} before using it in a workflow.`,
  [EntityLifecycleStatus.Disqualified]: `This ${EntityLifecycleStatusLabel[EntityLifecycleStatus.Disqualified]} entity cannot be used as a workflow input.\nChoose an ${EntityLifecycleStatusLabel[EntityLifecycleStatus.Active]} entity instead.`,
};

/**
 * True for workspace sections that pick entities as workflow inputs
 * (`/new` browse, in-editor model pickers). Data browse is excluded.
 */
export function isWorkflowPickerSection(section: TWorkspaceSection | null | undefined): boolean {
  return section != null && WORKFLOW_PICKER_SECTIONS.has(section);
}

/**
 * Only `draft` and `disqualified` are blocked. Active, missing, and unknown
 * statuses stay selectable so types that omit the field are not broken.
 */
export function isEntitySelectableForWorkflow(entity: TLifecycleStatusCarrier): boolean {
  return getWorkflowLifecycleBlockReason(entity) == null;
}

export function getWorkflowLifecycleBlockReason(
  entity: TLifecycleStatusCarrier
): string | undefined {
  const status = entity.lifecycle_status;
  if (status == null) return undefined;
  return Object.hasOwn(BLOCKED_LIFECYCLE_REASONS, status)
    ? BLOCKED_LIFECYCLE_REASONS[status as TEntityLifecycleStatus]
    : undefined;
}

/**
 * Gray-out class for blocked picker rows. Covers both AG Grid cells (including
 * pinned/hover) and antd `td`s. Pointer events stay enabled so a click still
 * opens mini-detail.
 */
export const WORKFLOW_LIFECYCLE_BLOCKED_ROW_CLASS = [
  '[&_.ag-cell]:bg-neutral-1! [&_.ag-cell]:text-neutral-4!',
  '[&.ag-row-hover]:bg-neutral-1! [&.ag-row-hover_.ag-cell]:bg-neutral-1!',
  '[&_.ag-cell>*]:opacity-50',
  '[&_td]:bg-neutral-1! [&_td]:text-neutral-4!',
  'hover:[&_td]:bg-neutral-1!',
  '[&_td>*]:opacity-50',
].join(' ');

export function workflowLifecycleRowClass(entity: TLifecycleStatusCarrier): string | undefined {
  if (isEntitySelectableForWorkflow(entity)) return undefined;
  return WORKFLOW_LIFECYCLE_BLOCKED_ROW_CLASS;
}
