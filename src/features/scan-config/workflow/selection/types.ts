import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const WorkflowSelectionMode = {
  Single: 'single',
  List: 'list',
  Grouped: 'grouped',
} as const;

export type TWorkflowSelectionMode =
  (typeof WorkflowSelectionMode)[keyof typeof WorkflowSelectionMode];

export type TWorkflowSelectionRef = {
  type: TExtendedEntitiesTypeDict;
  id: string;
};

export type TWorkflowSingleSelection = {
  mode: typeof WorkflowSelectionMode.Single;
  items: [TWorkflowSelectionRef];
};

export type TWorkflowListSelection = {
  mode: typeof WorkflowSelectionMode.List;
  items: TWorkflowSelectionRef[];
};

export type TWorkflowGroupedSelection = {
  mode: typeof WorkflowSelectionMode.Grouped;
  groups: Array<{ name?: string; items: TWorkflowSelectionRef[] }>;
};

export type TWorkflowSelection =
  | TWorkflowSingleSelection
  | TWorkflowListSelection
  | TWorkflowGroupedSelection;

export type TWorkflowSelectionPayload = {
  selection: TWorkflowSelection;
};

export function makeSingleWorkflowSelection(ref: TWorkflowSelectionRef): TWorkflowSelectionPayload {
  return {
    selection: {
      mode: WorkflowSelectionMode.Single,
      items: [ref],
    },
  };
}

export function makeListWorkflowSelection(
  items: TWorkflowSelectionRef[]
): TWorkflowSelectionPayload {
  return {
    selection: {
      mode: WorkflowSelectionMode.List,
      items,
    },
  };
}

export function makeGroupedWorkflowSelection(
  groups: TWorkflowGroupedSelection['groups']
): TWorkflowSelectionPayload {
  return {
    selection: {
      mode: WorkflowSelectionMode.Grouped,
      groups,
    },
  };
}
