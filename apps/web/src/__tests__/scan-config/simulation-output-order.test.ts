import { describe, expect, it } from 'vitest';

import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { prioritizeOutputFiles } from '@/features/scan-config/components/simulation-files/output-order';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TAssetBackedFile } from '@/features/scan-config/types';

function file(path: string, asset: Partial<IAsset> = {}): TAssetBackedFile {
  return {
    entity: { id: 'sim-result' },
    asset: { id: path, path, ...asset },
    renderer: ActivityCustomFileRenderer.Default,
  } as unknown as TAssetBackedFile;
}

const logs = file('task-logs');
const lfp = file('LFP.h5', { label: 'lfp_report' as AssetLabel });
const soma = file('soma_report.h5', { label: AssetLabel.voltage_report });
const nwb = file('soma.nwb', {
  label: AssetLabel.voltage_report,
  content_type: AssetContentType.nwb,
});
const spikes = file('spikes.h5', { label: AssetLabel.spike_report });

const paths = (files: TAssetBackedFile[]) => files.map((f) => f.asset.path);

describe('prioritizeOutputFiles', () => {
  it('opens on the spikes, ahead of the logs, the voltages and the rest', () => {
    expect(paths(prioritizeOutputFiles([logs, lfp, soma, nwb, spikes], undefined))).toEqual([
      'spikes.h5',
      'soma.nwb',
      'task-logs',
      'LFP.h5',
      'soma_report.h5',
    ]);
  });

  it('keeps the file on show first, so another simulation opens on its like', () => {
    expect(paths(prioritizeOutputFiles([logs, soma, spikes], 'soma_report.h5'))[0]).toBe(
      'soma_report.h5'
    );
  });

  it("falls back to a single cell's NWB voltages without spikes", () => {
    expect(paths(prioritizeOutputFiles([logs, soma, nwb], undefined))[0]).toBe('soma.nwb');
  });
});
