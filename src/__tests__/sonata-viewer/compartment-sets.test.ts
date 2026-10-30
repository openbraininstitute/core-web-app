import { describe, expect, it } from 'vitest';

import {
  compartmentHeaderRow,
  compartmentRow,
  compartmentTable,
} from '@/features/sonata-viewer/compartment-rows';
import {
  compartmentOffsets,
  compartmentSetColumns,
  simulationCompartmentSets,
} from '@/features/sonata-viewer/compartment-sets';
import { resolveTraces } from '@/features/sonata-viewer/worker/column-mapping';

import type { NestedRowMark } from '@/features/circuit-nodes/components/nodes-grid';
import type { Compartment } from '@/features/sonata-viewer/compartment-rows';
import type { PopulationMetadata } from '@/features/sonata-viewer/types';

// As obi-one writes them: the compartment sets file, and the single config whose block made the set.
const FILE = {
  Apical: {
    population: 'hippocampus_neurons',
    compartment_set: [
      [0, 173, 0.036],
      [0, 249, 0.123],
      [0, 249, 0.658],
      [2, 12, 0.5],
    ],
  },
};
const SINGLE = {
  morphology_locations: {
    Apical: {
      type: 'RandomMorphologyLocations',
      neuron_set: {
        block_dict_name: 'neuron_sets',
        block_name: 'PC',
        type: 'BiophysicalNeuronSetReference',
      },
      random_seed: 1,
      section_types: [4],
      number_of_locations: 3,
    },
  },
  stimuli: {
    DendStep: {
      type: 'ConstantCurrentClampSomaticStimulus',
      neuron_set: { block_dict_name: 'morphology_locations', block_name: 'Apical' },
    },
  },
  recordings: {
    ApicalV: {
      type: 'MorphologyLocationVoltageRecording',
      morphology_locations: { block_dict_name: 'morphology_locations', block_name: 'Apical' },
    },
    Soma: {
      type: 'SomaVoltageRecording',
      neuron_set: { block_dict_name: 'neuron_sets', block_name: 'All' },
    },
  },
};

describe('the simulation’s compartment sets', () => {
  const sets = simulationCompartmentSets(FILE, SINGLE);
  const apical = sets?.Apical;

  it('take each set’s locations, its block from the single config, and what targets it', () => {
    expect(apical?.locations).toHaveLength(4);
    expect(apical?.block?.title).toBe('Random morphology locations');
    expect(apical?.block?.fields).toEqual(
      expect.arrayContaining([
        { label: 'Neuron set', value: 'PC' },
        { label: 'Number of locations', value: '3' },
      ])
    );
    expect(apical?.usedBy).toEqual([
      { kind: 'Stimulus', name: 'DendStep' },
      { kind: 'Recording', name: 'ApicalV' },
    ]);
    expect(apical && compartmentSetColumns('Apical', apical)).toEqual([
      { label: 'Compartment set', value: 'Apical' },
      { label: 'Type', value: 'Random morphology locations' },
      { label: 'Neuron set', value: 'PC' },
      { label: 'Random seed', value: '1' },
      { label: 'Section types', value: '4' },
      { label: 'Number of locations', value: '3' },
      { label: 'Stimuli', value: 'DendStep' },
      { label: 'Recordings', value: 'ApicalV' },
    ]);
  });

  it('give each of a report’s compartments its offset, a section’s several in turn', () => {
    const traces = resolveTraces([0, 2], [0, 3, 4], [173, 249, 249, 12], 4);
    if (!traces || !apical) throw new Error('The mapping did not resolve.');
    const population = { name: 'hippocampus_neurons', traces } as PopulationMetadata;
    const offsets = compartmentOffsets(population, apical);
    expect([...offsets]).toEqual([
      [0, 0.036],
      [1, 0.123],
      [2, 0.658],
      [3, 0.5],
    ]);
    const compartments = new Map([
      [
        0,
        [
          { traceIndex: 0, section: 173, label: 'Section 173' },
          { traceIndex: 2, section: 249, label: 'Section 249 · 2' },
        ],
      ],
    ]);
    const table = compartmentTable(compartments, {
      offsets,
      columns: compartmentSetColumns('Apical', apical),
    });
    expect(table.headers.slice(0, 3)).toEqual(['Section', 'Offset', 'Compartment set']);
    expect(compartmentHeaderRow(0, table).__nested).toMatchObject({ header: true, key: -1 });
    const row = compartmentRow(0, compartments.get(0)?.[1] as Compartment, true, null, table);
    expect((row.__nested as NestedRowMark).cells.slice(0, 3)).toEqual(['249', '0.658', 'Apical']);
    expect((row.__nested as NestedRowMark).template.split(' ')).toHaveLength(table.headers.length);
  });
});
