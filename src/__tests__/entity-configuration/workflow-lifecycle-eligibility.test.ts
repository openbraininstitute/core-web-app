import { describe, expect, it } from 'vitest';

import { EntityLifecycleStatus } from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';
import {
  getWorkflowLifecycleBlockReason,
  isEntitySelectableForWorkflow,
  isWorkflowPickerSection,
  workflowLifecycleRowClass,
} from '@/entity-configuration/domain/workflow-lifecycle-eligibility';

describe('isEntitySelectableForWorkflow', () => {
  it('allows active entities', () => {
    expect(isEntitySelectableForWorkflow({ lifecycle_status: EntityLifecycleStatus.Active })).toBe(
      true
    );
  });

  it('blocks draft entities', () => {
    expect(isEntitySelectableForWorkflow({ lifecycle_status: EntityLifecycleStatus.Draft })).toBe(
      false
    );
  });

  it('blocks disqualified entities', () => {
    expect(
      isEntitySelectableForWorkflow({ lifecycle_status: EntityLifecycleStatus.Disqualified })
    ).toBe(false);
  });

  it('allows a missing status', () => {
    expect(isEntitySelectableForWorkflow({})).toBe(true);
    expect(isEntitySelectableForWorkflow({ lifecycle_status: null })).toBe(true);
    expect(isEntitySelectableForWorkflow({ lifecycle_status: undefined })).toBe(true);
  });

  it('allows an unknown status', () => {
    expect(isEntitySelectableForWorkflow({ lifecycle_status: 'archived' })).toBe(true);
  });
});

describe('getWorkflowLifecycleBlockReason', () => {
  it('explains draft and disqualified, and is silent otherwise', () => {
    expect(getWorkflowLifecycleBlockReason({ lifecycle_status: EntityLifecycleStatus.Draft })).toBe(
      'This Draft entity is not ready to run.\nSet it to Active before using it in a workflow.'
    );
    expect(
      getWorkflowLifecycleBlockReason({ lifecycle_status: EntityLifecycleStatus.Disqualified })
    ).toBe(
      'This Disqualified entity cannot be used as a workflow input.\nChoose an Active entity instead.'
    );
    expect(
      getWorkflowLifecycleBlockReason({ lifecycle_status: EntityLifecycleStatus.Active })
    ).toBeUndefined();
    expect(getWorkflowLifecycleBlockReason({})).toBeUndefined();
    expect(getWorkflowLifecycleBlockReason({ lifecycle_status: 'archived' })).toBeUndefined();
  });
});

describe('workflowLifecycleRowClass', () => {
  it('washes blocked rows gray and mutes cell contents', () => {
    const cls = workflowLifecycleRowClass({ lifecycle_status: EntityLifecycleStatus.Draft });
    expect(cls).toContain('[&_.ag-cell]:bg-neutral-1!');
    expect(cls).toContain('[&_.ag-cell]:text-neutral-4!');
    expect(cls).toContain('[&_.ag-cell>*]:opacity-50');
    expect(cls).toContain('[&_td]:bg-neutral-1!');
    expect(cls).not.toContain('pointer-events-none');
  });

  it('returns nothing for selectable rows', () => {
    expect(
      workflowLifecycleRowClass({ lifecycle_status: EntityLifecycleStatus.Active })
    ).toBeUndefined();
    expect(workflowLifecycleRowClass({})).toBeUndefined();
  });
});

describe('isWorkflowPickerSection', () => {
  it.each([
    WorkspaceSection.BuildWorkflow,
    WorkspaceSection.ScanConfigBuildWorkflow,
    WorkspaceSection.SimulateWorkflow,
    WorkspaceSection.ExtractWorkflow,
    WorkspaceSection.ProcessWorkflow,
  ])('is true for %s', (section) => {
    expect(isWorkflowPickerSection(section)).toBe(true);
  });

  it.each([
    WorkspaceSection.Data,
    WorkspaceSection.Notebooks,
    WorkspaceSection.GeneralWorkflow,
  ])('is false for %s', (section) => {
    expect(isWorkflowPickerSection(section)).toBe(false);
  });

  it('is false when section is omitted', () => {
    expect(isWorkflowPickerSection(undefined)).toBe(false);
    expect(isWorkflowPickerSection(null)).toBe(false);
  });
});
