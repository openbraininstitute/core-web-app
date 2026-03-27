import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createContributionMutation: vi.fn(),
  createMtypeClassificationMutation: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/general/contribution', () => ({
  createContribution: mocks.createContributionMutation,
}));

vi.mock('@/api/entitycore/queries/annotations/mtype-classification', () => ({
  createMtypeClassification: mocks.createMtypeClassificationMutation,
}));

import { createEntityImportPostSubmitActions } from '../../../core/shared/post-submit-actions';

describe('createEntityImportPostSubmitActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards shared contribution payloads with workspace context', async () => {
    mocks.createContributionMutation.mockResolvedValue({ id: 'contribution-1' });

    const actions = createEntityImportPostSubmitActions();

    await expect(
      actions.createContribution({
        entityId: 'entity-1',
        contribution: {
          agent_id: 'agent-1',
          role_id: 'role-1',
        },
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual({ id: 'contribution-1' });

    expect(mocks.createContributionMutation).toHaveBeenCalledWith({
      context: {
        projectId: 'project-1',
        virtualLabId: 'lab-1',
      },
      contributor: {
        agent_id: 'agent-1',
        role_id: 'role-1',
        entity_id: 'entity-1',
      },
    });
  });

  it('forwards shared mtype classification payloads with workspace context', async () => {
    mocks.createMtypeClassificationMutation.mockResolvedValue({ id: 'classification-1' });

    const actions = createEntityImportPostSubmitActions();

    await expect(
      actions.createMtypeClassification({
        entityId: 'entity-1',
        mtypeClassId: 'mtype-1',
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual({ id: 'classification-1' });

    expect(mocks.createMtypeClassificationMutation).toHaveBeenCalledWith({
      context: {
        projectId: 'project-1',
        virtualLabId: 'lab-1',
      },
      payload: {
        authorized_public: true,
        entity_id: 'entity-1',
        mtype_class_id: 'mtype-1',
      },
    });
  });
});
