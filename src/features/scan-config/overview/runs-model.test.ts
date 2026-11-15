import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import {
  describeConfig,
  formatDuration,
  outputKind,
  simulationRows,
  spikeSummary,
  statusCounts,
} from './runs-model';

import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ConfigSchema } from '@/features/scan-config/types';

const simulation = (id: string, withConfig = true) =>
  ({
    id,
    name: id,
    assets: withConfig ? [{ label: 'sonata_simulation_config' }] : [],
  }) as unknown as ISimulation;

const execution = (simId: string, status: ActivityStatus, created: string, end?: string) =>
  ({
    used: [{ id: simId }],
    status,
    creation_date: created,
    start_time: created,
    end_time: end,
    execution_id: 'job-1',
  }) as unknown as IExecutionActivity;

describe('simulationRows', () => {
  it('takes each simulation’s status and timing from its latest execution', () => {
    const rows = simulationRows(
      [simulation('a'), simulation('b'), simulation('c', false)],
      [
        execution('a', ActivityStatus.ERROR, '2026-11-13T18:00:00Z'),
        execution('a', ActivityStatus.DONE, '2026-11-13T18:49:00Z', '2026-11-13T18:49:42Z'),
      ]
    );

    expect(rows.map((r) => [r.simulation.id, r.status, r.durationMs])).toEqual([
      ['a', ActivityStatus.DONE, 42_000],
      // generated but never run
      ['b', ActivityStatus.CREATED, undefined],
      // its generation failed: no config to run
      ['c', ActivityStatus.ERROR, undefined],
    ]);
    expect(statusCounts(rows)).toEqual([
      { status: ActivityStatus.DONE, count: 1 },
      { status: ActivityStatus.CREATED, count: 1 },
      { status: ActivityStatus.ERROR, count: 1 },
    ]);
  });
});

describe('describeConfig', () => {
  const dictionary = (title: string, group_order: number, oneOf: unknown[]) => ({
    ui_element: 'block_dictionary',
    title,
    group_order,
    additionalProperties: { oneOf },
  });
  const schema = {
    properties: {
      type: { const: 'Sim', default: 'Sim' },
      stimuli: dictionary('Stimuli', 2, [
        { title: 'Constant current clamp', properties: { type: { const: 'Clamp' } } },
      ]),
      neuron_sets: dictionary('Neuron sets', 1, []),
      recordings: dictionary('Recordings', 3, []),
    },
  } as unknown as ConfigSchema;

  it('lists the blocks of each non-empty dictionary in the editor’s order, by name and kind', () => {
    const { durationMs, groups } = describeConfig(schema, {
      initialize: { simulation_length: 1000 },
      stimuli: { 'Stimulus 0': { type: 'Clamp' } },
      neuron_sets: { L5: { type: 'IDNeuronSet' } },
      recordings: {},
    });

    expect(durationMs).toBe(1000);
    expect(groups).toEqual([
      {
        rootElement: 'neuron_sets',
        title: 'Neuron sets',
        // a variant the schema does not list reads as its type
        blocks: [{ rootElement: 'neuron_sets', entry: 'L5', name: 'L5', kind: 'IDNeuronSet' }],
      },
      {
        rootElement: 'stimuli',
        title: 'Stimuli',
        blocks: [
          {
            rootElement: 'stimuli',
            entry: 'Stimulus 0',
            name: 'Stimulus 0',
            kind: 'Constant current clamp',
          },
        ],
      },
    ]);
  });

  it('keeps a swept duration as its list', () => {
    expect(describeConfig(schema, { initialize: { simulation_length: [500, 1000] } })).toEqual({
      durationMs: [500, 1000],
      groups: [],
    });
  });
});

describe('formatting', () => {
  it('formats durations and names result files by what they hold', () => {
    expect(formatDuration(42_000)).toBe('42 s');
    expect(formatDuration(184_000)).toBe('3 min 4 s');
    expect(outputKind('spike_report', 'out/spikes.h5')).toBe('Spikes');
    expect(outputKind('voltage_report', 'out/soma.h5')).toBe('Voltages');
    expect(outputKind('task_log', 'logs/run.log')).toBe('run');
  });
});

describe('spikeSummary', () => {
  it('counts spikes and the cells that fired, and their mean rate over the run', () => {
    const summary = spikeSummary(
      {
        populations: [
          { nodeIds: [0, 0, 1, 3], timestamps: [10, 20, 30, 40] },
          { nodeIds: [0], timestamps: [50] },
        ],
        timeRange: { min: 10, max: 50 },
        nodeIdRange: { min: 0, max: 3 },
      },
      1000
    );
    // cell 0 of each population is its own cell
    expect(summary.spikes).toBe(5);
    expect(summary.cellsFiring).toBe(4);
    expect(summary.meanRateHz).toBeCloseTo(1.25);
    expect(summary.window).toEqual([0, 1000]);
  });
});
