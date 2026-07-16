import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCellMorphology, getEModel } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getEmodelFiles } from '@/features/entity-download/file-handlers/emodel';

import { collectFileEntries, makeAsset, makeEntityBase, pathsOf, readEntryText } from '../fixtures';
import { resetDownloadBoundaryMocks } from '../mock-boundaries';

const { downloadAssetMock, getSessionMock } = vi.hoisted(() => {
  const downloadAssetMock = vi.fn(async () => {
    const buffer = Buffer.from('asset-bytes');
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  });
  const getSessionMock = vi.fn(async () => ({
    user: { username: 'test-user' },
    accessToken: 'token',
  }));
  return { downloadAssetMock, getSessionMock };
});

vi.mock('@/auth-fetch', () => ({ getSession: getSessionMock }));

vi.mock('@/api/entitycore/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries')>();
  return {
    ...actual,
    getEModel: vi.fn(),
    getCellMorphology: vi.fn(),
  };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getEmodelFiles', () => {
  beforeEach(() => {
    vi.mocked(getEModel).mockReset();
    vi.mocked(getCellMorphology).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages HOC, optimization output, morphology, and MOD files under labeled folders', async () => {
    const ionChannelModel = makeEntityBase({
      id: 'icm1',
      type: EntityTypeDict.IonChannelModel,
      assets: [makeAsset({ id: 'mod1', path: 'Na.mod', label: AssetLabel.neuron_mechanisms })],
    });

    vi.mocked(getEModel).mockResolvedValue(
      makeEntityBase({
        id: 'e1',
        type: EntityTypeDict.Emodel,
        name: 'Emodel A',
        assets: [
          makeAsset({ id: 'hoc1', path: 'cell.hoc', label: AssetLabel.neuron_hoc }),
          makeAsset({
            id: 'opt1',
            path: 'opt.json',
            label: AssetLabel.emodel_optimization_output,
          }),
          makeAsset({ id: 'skip', path: 'other.txt', label: AssetLabel.requirements }),
        ],
        exemplar_morphology: { id: 'morph1' },
        ion_channel_models: [ionChannelModel],
      }) as never
    );

    vi.mocked(getCellMorphology).mockResolvedValue(
      makeEntityBase({
        id: 'morph1',
        type: EntityTypeDict.CellMorphology,
        assets: [
          makeAsset({ id: 'm1', path: 'morph.swc', label: AssetLabel.morphology }),
          makeAsset({ id: 'm2', path: 'thumb.png', label: AssetLabel.simulation_designer_image }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getEmodelFiles(['e1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/neuron_hoc/cell.hoc',
      'data/0/emodel_optimization_output/opt.json',
      'data/0/morphology/morph.swc',
      'data/0/neuron_mechanisms/Na.mod',
      'metadata.json',
      'metadata.csv',
    ]);

    expect(getCellMorphology).toHaveBeenCalledWith({
      id: 'morph1',
      context: undefined,
    });

    const metadataJson = JSON.parse(await readEntryText(entries[5]));
    expect(metadataJson[0]).toMatchObject({ id: 'e1', idx: 0, data_path: 'data/0' });
  });
});
