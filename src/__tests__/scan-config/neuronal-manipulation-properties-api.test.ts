import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();

vi.mock('@/api/one/utils', () => ({
  obioneApi: async () => ({ post }),
}));

vi.mock('@/api/entitycore/utils', () => ({
  getEntityCoreContext: () => ({
    headers: { 'virtual-lab-id': 'vl-1', 'project-id': 'pj-1' },
  }),
}));

import { fetchNeuronalManipulationProperties } from '@/api/one/neuronal-manipulation-properties';

describe('fetchNeuronalManipulationProperties', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ MechanismVariablesByIonChannel: {} });
  });

  it('POSTs MEModel properties with entity_id only', async () => {
    await fetchNeuronalManipulationProperties({
      ctx: { virtualLabId: 'vl-1', projectId: 'pj-1' },
      endpoint: '/memodel-neuronal-manipulation-properties',
      entityId: 'memodel-1',
    });

    expect(post).toHaveBeenCalledWith('/declared/memodel-neuronal-manipulation-properties', {
      headers: expect.objectContaining({
        accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      body: { entity_id: 'memodel-1' },
      signal: undefined,
    });
  });

  it('POSTs Circuit properties with entity_id and neuron_set when includeNeuronSet is true', async () => {
    const neuronSet = { type: 'AllNeurons' };

    await fetchNeuronalManipulationProperties({
      ctx: { virtualLabId: 'vl-1', projectId: 'pj-1' },
      endpoint: '/circuit-neuronal-manipulation-properties-by-neuron-set',
      entityId: 'circuit-1',
      neuronSet,
      includeNeuronSet: true,
    });

    expect(post).toHaveBeenCalledWith(
      '/declared/circuit-neuronal-manipulation-properties-by-neuron-set',
      {
        headers: expect.objectContaining({
          accept: 'application/json',
          'Content-Type': 'application/json',
        }),
        body: { entity_id: 'circuit-1', neuron_set: neuronSet },
        signal: undefined,
      }
    );
  });

  it('sends neuron_set null for the Circuit default-target fast path', async () => {
    await fetchNeuronalManipulationProperties({
      ctx: { virtualLabId: 'vl-1', projectId: 'pj-1' },
      endpoint: '/circuit-neuronal-manipulation-properties-by-neuron-set',
      entityId: 'circuit-1',
      neuronSet: null,
      includeNeuronSet: true,
    });

    expect(post).toHaveBeenCalledWith(
      '/declared/circuit-neuronal-manipulation-properties-by-neuron-set',
      expect.objectContaining({
        body: { entity_id: 'circuit-1', neuron_set: null },
      })
    );
  });
});
