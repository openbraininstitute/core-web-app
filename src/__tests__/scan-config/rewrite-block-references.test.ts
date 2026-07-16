import { describe, expect, it } from 'vitest';

import {
  RewriteBlockReferencesModeDict,
  rewriteBlockReferences,
} from '@/features/scan-config/components/rewrite-block-references';
import { isPlainObject } from '@/features/scan-config/components/utils';

/** Schema BlockReference shape used by `base_neuron_set` / `combined_with`. */
function blockRef(block_name: string, block_dict_name = 'neuron_sets') {
  return {
    block_dict_name,
    block_name,
    type: 'BlockReference' as const,
  };
}

/**
 * Mirrors the delete/rename walk in `block-dictionary-entries.tsx`:
 * skip `initialize`, then rewrite every dictionary entry.
 */
function rewriteConfigEntries(
  config: Record<string, unknown>,
  matchName: string,
  mode: Parameters<typeof rewriteBlockReferences>[2]
) {
  for (const [configK, configV] of Object.entries(config)) {
    if (configK === 'initialize' || !isPlainObject(configV)) continue;
    for (const entryV of Object.values(configV)) {
      rewriteBlockReferences(entryV, matchName, mode);
    }
  }
}

describe('rewriteBlockReferences', () => {
  describe('clear', () => {
    it('deletes a top-level object-owned block reference (base_neuron_set / recordings)', () => {
      const entry = {
        type: 'VirtualCombinedNeuronSet',
        base_neuron_set: { block_name: 'Set A', block_dict_name: 'neuron_sets' },
        other: 'keep',
      };

      rewriteBlockReferences(entry, 'Set A', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry).toEqual({
        type: 'VirtualCombinedNeuronSet',
        other: 'keep',
      });
      expect('base_neuron_set' in entry).toBe(false);
    });

    it('nulls array-owned refs inside combination tuples without removing the operation', () => {
      const entry = {
        type: 'VirtualCombinedNeuronSet',
        base_neuron_set: { block_name: 'Base', block_dict_name: 'neuron_sets' },
        combined_with: [
          [{ block_name: 'Set A', block_dict_name: 'neuron_sets' }, 'union'],
          [{ block_name: 'Set B', block_dict_name: 'neuron_sets' }, 'intersect'],
        ],
      };

      rewriteBlockReferences(entry, 'Set A', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry.combined_with).toEqual([
        [null, 'union'],
        [{ block_name: 'Set B', block_dict_name: 'neuron_sets' }, 'intersect'],
      ]);
      expect(entry.base_neuron_set).toEqual({
        block_name: 'Base',
        block_dict_name: 'neuron_sets',
      });
    });

    it('clears every matching nested ref when the same name appears more than once', () => {
      const entry = {
        combined_with: [
          [{ block_name: 'Set A', block_dict_name: 'neuron_sets' }, 'union'],
          [{ block_name: 'Set A', block_dict_name: 'neuron_sets' }, 'diff'],
        ],
      };

      rewriteBlockReferences(entry, 'Set A', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry.combined_with).toEqual([
        [null, 'union'],
        [null, 'diff'],
      ]);
    });

    it('does not touch unrelated fields, primitives, or non-matching refs', () => {
      const entry = {
        type: 'Recording',
        neuron_set: { block_name: 'Keep Me', block_dict_name: 'neuron_sets' },
        property_filter: {
          filter_dict: { mtype: ['L5_PC'] },
        },
        ids: [1, 2, 3],
        label: 'Set A',
      };

      rewriteBlockReferences(entry, 'Set A', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry).toEqual({
        type: 'Recording',
        neuron_set: { block_name: 'Keep Me', block_dict_name: 'neuron_sets' },
        property_filter: {
          filter_dict: { mtype: ['L5_PC'] },
        },
        ids: [1, 2, 3],
        label: 'Set A',
      });
    });

    it('leaves a dense array (no sparse holes) after clearing a combination ref', () => {
      const combined_with: Array<[unknown, string]> = [
        [{ block_name: 'Set A', block_dict_name: 'neuron_sets' }, 'union'],
      ];

      rewriteBlockReferences({ combined_with }, 'Set A', {
        type: RewriteBlockReferencesModeDict.Clear,
      });

      expect(combined_with.length).toBe(1);
      expect(0 in combined_with).toBe(true);
      expect(combined_with[0]).toEqual([null, 'union']);
    });
  });

  describe('rename', () => {
    it('renames a top-level object-owned block reference', () => {
      const entry = {
        neuron_set: { block_name: 'Old', block_dict_name: 'neuron_sets' },
      };

      rewriteBlockReferences(entry, 'Old', {
        type: RewriteBlockReferencesModeDict.Rename,
        to: 'New',
      });

      expect(entry.neuron_set.block_name).toBe('New');
      expect(entry.neuron_set.block_dict_name).toBe('neuron_sets');
    });

    it('renames nested refs inside combination tuples', () => {
      const entry = {
        base_neuron_set: { block_name: 'Old', block_dict_name: 'neuron_sets' },
        combined_with: [
          [{ block_name: 'Old', block_dict_name: 'neuron_sets' }, 'union'],
          [{ block_name: 'Other', block_dict_name: 'neuron_sets' }, 'diff'],
        ],
      };

      rewriteBlockReferences(entry, 'Old', {
        type: RewriteBlockReferencesModeDict.Rename,
        to: 'New',
      });

      expect(entry.base_neuron_set.block_name).toBe('New');
      expect(entry.combined_with).toEqual([
        [{ block_name: 'New', block_dict_name: 'neuron_sets' }, 'union'],
        [{ block_name: 'Other', block_dict_name: 'neuron_sets' }, 'diff'],
      ]);
    });
  });

  describe('walk scope', () => {
    it('rewrites refs across multiple dictionary entries when given each entry', () => {
      const config = {
        neuron_sets: {
          Combined: {
            combined_with: [[{ block_name: 'Gone', block_dict_name: 'neuron_sets' }, 'union']],
          },
        },
        recordings: {
          R1: {
            neuron_set: { block_name: 'Gone', block_dict_name: 'neuron_sets' },
          },
        },
      };

      for (const section of Object.values(config)) {
        for (const entry of Object.values(section)) {
          rewriteBlockReferences(entry, 'Gone', { type: RewriteBlockReferencesModeDict.Clear });
        }
      }

      expect(config.neuron_sets.Combined.combined_with).toEqual([[null, 'union']]);
      expect('neuron_set' in config.recordings.R1).toBe(false);
    });

    it('is a no-op for null, primitives, and empty structures', () => {
      expect(() =>
        rewriteBlockReferences(null, 'X', { type: RewriteBlockReferencesModeDict.Clear })
      ).not.toThrow();
      expect(() =>
        rewriteBlockReferences('Set A', 'Set A', { type: RewriteBlockReferencesModeDict.Clear })
      ).not.toThrow();
      expect(() =>
        rewriteBlockReferences(42, 'Set A', { type: RewriteBlockReferencesModeDict.Clear })
      ).not.toThrow();
      expect(() =>
        rewriteBlockReferences({}, 'Set A', { type: RewriteBlockReferencesModeDict.Clear })
      ).not.toThrow();
      expect(() =>
        rewriteBlockReferences([], 'Set A', { type: RewriteBlockReferencesModeDict.Clear })
      ).not.toThrow();
    });
  });

  describe('CircuitSimulationScanConfig shapes', () => {
    it('clears BiophysicalCombinedNeuronSet.combined_with while preserving operators', () => {
      const entry = {
        type: 'BiophysicalCombinedNeuronSet',
        base_neuron_set: blockRef('Layer 5'),
        combined_with: [
          [blockRef('Deleted Set'), 'union'],
          [blockRef('Layer 6'), 'intersect'],
          [blockRef('Deleted Set'), 'diff'],
        ],
      };

      rewriteBlockReferences(entry, 'Deleted Set', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry.base_neuron_set).toEqual(blockRef('Layer 5'));
      expect(entry.combined_with).toEqual([
        [null, 'union'],
        [blockRef('Layer 6'), 'intersect'],
        [null, 'diff'],
      ]);
    });

    it('clears VirtualCombinedNeuronSet and PointCombinedNeuronSet the same way', () => {
      for (const type of ['VirtualCombinedNeuronSet', 'PointCombinedNeuronSet'] as const) {
        const entry = {
          type,
          base_neuron_set: blockRef('Keep'),
          combined_with: [[blockRef('Gone'), 'union']],
        };

        rewriteBlockReferences(entry, 'Gone', { type: RewriteBlockReferencesModeDict.Clear });

        expect(entry.combined_with).toEqual([[null, 'union']]);
        expect(entry.base_neuron_set).toEqual(blockRef('Keep'));
      }
    });

    it('clears CombinedNeuronSet (Any) refs that mix typed neuron-set references', () => {
      const entry = {
        type: 'CombinedNeuronSet',
        base_neuron_set: blockRef('Any Base'),
        combined_with: [
          [
            {
              block_dict_name: 'neuron_sets',
              block_name: 'Gone Virtual',
              type: 'VirtualNeuronSetReference',
            },
            'union',
          ],
          [
            {
              block_dict_name: 'neuron_sets',
              block_name: 'Keep Point',
              type: 'PointNeuronSetReference',
            },
            'diff',
          ],
        ],
      };

      rewriteBlockReferences(entry, 'Gone Virtual', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry.combined_with[0]).toEqual([null, 'union']);
      expect(entry.combined_with[1]).toEqual([
        {
          block_dict_name: 'neuron_sets',
          block_name: 'Keep Point',
          type: 'PointNeuronSetReference',
        },
        'diff',
      ]);
    });

    it('deletes base_neuron_set when the deleted name is the base (schema default fallback)', () => {
      const entry = {
        type: 'BiophysicalCombinedNeuronSet',
        base_neuron_set: blockRef('Gone Base'),
        combined_with: [[blockRef('Keep'), 'union']],
      };

      rewriteBlockReferences(entry, 'Gone Base', { type: RewriteBlockReferencesModeDict.Clear });

      expect('base_neuron_set' in entry).toBe(false);
      expect(entry.combined_with).toEqual([[blockRef('Keep'), 'union']]);
    });

    it('renames both base_neuron_set and combined_with refs for a CombinedNeuronSet', () => {
      const entry = {
        type: 'CombinedNeuronSet',
        base_neuron_set: blockRef('Old Name'),
        combined_with: [
          [blockRef('Old Name'), 'union'],
          [blockRef('Other'), 'intersect'],
        ],
      };

      rewriteBlockReferences(entry, 'Old Name', {
        type: RewriteBlockReferencesModeDict.Rename,
        to: 'New Name',
      });

      expect(entry.base_neuron_set.block_name).toBe('New Name');
      expect(entry.combined_with).toEqual([
        [blockRef('New Name'), 'union'],
        [blockRef('Other'), 'intersect'],
      ]);
    });

    it('clears top-level refs in recordings / stimuli / synaptic_manipulations like the delete walk', () => {
      const config = {
        type: 'CircuitSimulationScanConfig',
        initialize: {
          type: 'CircuitSimulationScanConfig.Initialize',
          // skipped by product walk — left intact here on purpose
          node_set: {
            block_name: 'Gone',
            block_dict_name: 'neuron_sets',
            type: 'BiophysicalNeuronSetReference',
          },
        },
        neuron_sets: {
          Combined: {
            type: 'BiophysicalCombinedNeuronSet',
            base_neuron_set: blockRef('Keep'),
            combined_with: [[blockRef('Gone'), 'union']],
          },
        },
        recordings: {
          Soma: {
            type: 'SomaVoltageRecording',
            neuron_set: {
              block_name: 'Gone',
              block_dict_name: 'neuron_sets',
              type: 'BiophysicalNeuronSetReference',
            },
            dt: 0.1,
          },
        },
        stimuli: {
          Clamp: {
            type: 'ConstantCurrentClampSomaticStimulus',
            neuron_set: {
              block_name: 'Gone',
              block_dict_name: 'neuron_sets',
              type: 'BiophysicalNeuronSetReference',
            },
            timestamps: {
              block_name: 'T0',
              block_dict_name: 'timestamps',
              type: 'TimestampsReference',
            },
          },
        },
        synaptic_manipulations: {
          Disconnect: {
            type: 'DisconnectSynapticManipulation',
            presynaptic_neuron_set: {
              block_name: 'Gone',
              block_dict_name: 'neuron_sets',
              type: 'VirtualNeuronSetReference',
            },
            postsynaptic_neuron_set: {
              block_name: 'Keep',
              block_dict_name: 'neuron_sets',
              type: 'BiophysicalNeuronSetReference',
            },
          },
        },
        timestamps: {
          T0: { type: 'SingleTimestamp', start_time: 0 },
        },
      };

      rewriteConfigEntries(config, 'Gone', { type: RewriteBlockReferencesModeDict.Clear });

      expect(config.neuron_sets.Combined.combined_with).toEqual([[null, 'union']]);
      expect('neuron_set' in config.recordings.Soma).toBe(false);
      expect('neuron_set' in config.stimuli.Clamp).toBe(false);
      expect(config.stimuli.Clamp.timestamps).toEqual({
        block_name: 'T0',
        block_dict_name: 'timestamps',
        type: 'TimestampsReference',
      });
      expect('presynaptic_neuron_set' in config.synaptic_manipulations.Disconnect).toBe(false);
      expect(config.synaptic_manipulations.Disconnect.postsynaptic_neuron_set.block_name).toBe(
        'Keep'
      );
      // initialize is intentionally not walked by the product delete path
      expect(config.initialize.node_set.block_name).toBe('Gone');
    });

    it('renames nested combined_with refs across the config without touching initialize', () => {
      const config = {
        initialize: {
          node_set: {
            block_name: 'Old',
            block_dict_name: 'neuron_sets',
            type: 'BiophysicalNeuronSetReference',
          },
        },
        neuron_sets: {
          Combined: {
            type: 'VirtualCombinedNeuronSet',
            base_neuron_set: blockRef('Old'),
            combined_with: [[blockRef('Old'), 'diff']],
          },
        },
        recordings: {
          R1: {
            type: 'SomaVoltageRecording',
            neuron_set: {
              block_name: 'Old',
              block_dict_name: 'neuron_sets',
              type: 'BiophysicalNeuronSetReference',
            },
          },
        },
      };

      rewriteConfigEntries(config, 'Old', {
        type: RewriteBlockReferencesModeDict.Rename,
        to: 'New',
      });

      expect(config.neuron_sets.Combined.base_neuron_set.block_name).toBe('New');
      expect(config.neuron_sets.Combined.combined_with).toEqual([[blockRef('New'), 'diff']]);
      expect(config.recordings.R1.neuron_set.block_name).toBe('New');
      expect(config.initialize.node_set.block_name).toBe('Old');
    });

    it('does not treat property_filter / neuron_ids payloads as block references', () => {
      const entry = {
        type: 'BiophysicalPopulationPropertyNeuronSet',
        population: 'L5',
        property_filter: {
          type: 'NeuronPropertyFilter',
          filter_dict: { mtype: ['L5_PC'], layer: ['5'] },
        },
      };
      const idEntry = {
        type: 'BiophysicalPopulationIDNeuronSet',
        population: 'L5',
        neuron_ids: {
          type: 'NamedTuple',
          name: 'ids',
          elements: [1, 2, 3],
        },
      };

      rewriteBlockReferences(entry, 'L5_PC', { type: RewriteBlockReferencesModeDict.Clear });
      rewriteBlockReferences(idEntry, 'ids', { type: RewriteBlockReferencesModeDict.Clear });

      expect(entry.property_filter.filter_dict.mtype).toEqual(['L5_PC']);
      expect(idEntry.neuron_ids).toEqual({
        type: 'NamedTuple',
        name: 'ids',
        elements: [1, 2, 3],
      });
    });

    it('accepts schema refs that omit block_dict_name (only block_name is required)', () => {
      const entry = {
        type: 'BiophysicalCombinedNeuronSet',
        base_neuron_set: { block_name: 'Gone' },
        combined_with: [[{ block_name: 'Gone' }, 'union']],
      };

      rewriteBlockReferences(entry, 'Gone', { type: RewriteBlockReferencesModeDict.Clear });

      expect('base_neuron_set' in entry).toBe(false);
      expect(entry.combined_with).toEqual([[null, 'union']]);
    });
  });
});
