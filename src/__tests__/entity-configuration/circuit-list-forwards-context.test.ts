import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCircuits = vi.fn().mockResolvedValue({ data: [], pagination: { total_items: 0 } });

vi.mock('@/api/entitycore/queries/model/circuit', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCircuits,
}));

const { Circuit } = await import('@/entity-configuration/domain/model/circuit');
const { Microcircuit } = await import('@/entity-configuration/domain/model/microcircuit');
const { PairedNeuronCircuit } = await import('@/entity-configuration/domain/model/paired-neurons');
const { SingleNeuronCircuit } = await import(
  '@/entity-configuration/domain/model/single-neuron-circuit'
);
const { SmallMicrocircuit } = await import(
  '@/entity-configuration/domain/model/small-microcircuit'
);

const context = { virtualLabId: 'lab-1', projectId: 'project-1' };

describe.each([
  ['Circuit', Circuit],
  ['Microcircuit', Microcircuit],
  ['PairedNeuronCircuit', PairedNeuronCircuit],
  ['SingleNeuronCircuit', SingleNeuronCircuit],
  ['SmallMicrocircuit', SmallMicrocircuit],
])('%s.api.query.list', (_name, config) => {
  beforeEach(() => getCircuits.mockClear());

  it('forwards the workspace context to getCircuits', async () => {
    await config.api.query.list?.({ context, withFacets: false, filters: {} });

    expect(getCircuits).toHaveBeenCalledTimes(1);
    expect(getCircuits.mock.calls[0][0]).toMatchObject({ context });
  });
});
