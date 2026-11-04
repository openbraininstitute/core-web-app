import { describe, expect, it, vi } from 'vitest';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { parseSonataConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesOpenParams } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import {
  electrodeOverlays,
  sortedUnitsCircuit,
  withRecordingSpan,
} from '@/features/spike-viewer/sorted-units/sorted-units';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';
import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/entitycore/queries/assets')>()),
  buildAssetDownloadRequest: vi.fn(async () => ({ url: 'signed', headers: {} })),
}));

const RESULT = {
  id: 'result',
  name: 'Sorted',
  type: EntityTypeDict.TaskResult,
} as unknown as IEntity;
const ASSET = { id: 'asset', label: AssetLabel.task_result, path: 'task_result' } as IAsset;

const RECORDINGS = {
  probe: {
    duration_ms: 1000,
    channel_ids: ['a', 'b'],
    electrode_positions: [
      [0, 0, 0],
      [0, 25, 0],
    ],
  },
};

describe('sortedUnitsCircuit', () => {
  const circuit = sortedUnitsCircuit(RESULT, ASSET);

  it('finds the sort folder where a circuit keeps its SONATA files', () => {
    expect(circuit.assets).toEqual([{ ...ASSET, label: AssetLabel.sonata_circuit }]);
  });

  it('stays a task result, whose assets are read as one', () => {
    expect(circuit.type).toBe(EntityTypeDict.TaskResult);
    expect(circuit.id).toBe('result');
  });

  it('is drawn as somas, not a morphology per cell', () => {
    expect(circuit.scale).toBe(CircuitScaleDictionary.Microcircuit);
  });
});

describe('a task result read as a circuit', () => {
  it('opens its node file as an asset of the task result', async () => {
    const raw = {
      networks: { nodes: [{ nodes_file: 'nodes.h5', populations: { probe: { type: 'x' } } }] },
    } as unknown as ICircuitSonataConfiguration;
    const [population] = parseSonataConfig(raw, 'asset', EntityTypeDict.TaskResult).nodes;

    await nodesOpenParams({} as never, 'result', 'asset', population).buildRequest();

    expect(buildAssetDownloadRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: EntityTypeDict.TaskResult,
        entityId: 'result',
        id: 'asset',
        assetPath: 'nodes.h5',
      })
    );
  });

  it("leaves a circuit's node file an asset of the circuit", async () => {
    const population = { name: 'All', type: 'biophysical', file: 'nodes.h5' };

    await nodesOpenParams({} as never, 'circuit', 'asset', population).buildRequest();

    expect(buildAssetDownloadRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityType: EntityTypeDict.Circuit })
    );
  });
});

describe('electrodeOverlays', () => {
  it("draws each recording's electrodes where the recording placed them", () => {
    const { probe } = electrodeOverlays(RECORDINGS);

    expect(probe).toHaveLength(1);
    expect(probe[0].kind).toBe('electrodes');
    expect(Array.from(probe[0].coordinates)).toEqual([0, 0, 0, 0, 25, 0]);
  });
});

describe('withRecordingSpan', () => {
  const spikes = { timeRange: { min: 12, max: 900 } } as SpikeData;

  it('runs from the start of the recording to its end, not first spike to last', () => {
    expect(withRecordingSpan(spikes, RECORDINGS).timeRange).toEqual({ min: 0, max: 1000 });
  });

  it('takes the longest of several recordings', () => {
    const longer = { ...RECORDINGS.probe, duration_ms: 5000 };
    expect(withRecordingSpan(spikes, { ...RECORDINGS, longer }).timeRange.max).toBe(5000);
  });
});
