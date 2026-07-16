import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCellMorphology, getEModel, getMEModel } from '@/api/entitycore/queries';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getSingleNeuronSynaptomeFiles } from '@/features/entity-download/file-handlers/single-neuron-synaptome';

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
    getMEModel: vi.fn(),
    getEModel: vi.fn(),
    getCellMorphology: vi.fn(),
  };
});

vi.mock('@/api/entitycore/queries/model/single-neuron-synaptome', () => ({
  getSingleNeuronSynaptome: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getSingleNeuronSynaptomeFiles', () => {
  beforeEach(() => {
    vi.mocked(getSingleNeuronSynaptome).mockReset();
    vi.mocked(getMEModel).mockReset();
    vi.mocked(getEModel).mockReset();
    vi.mocked(getCellMorphology).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages synaptome config plus linked HOC, morphology, and mechanisms', async () => {
    const ionChannelModel = makeEntityBase({
      id: 'icm1',
      type: EntityTypeDict.IonChannelModel,
      assets: [makeAsset({ id: 'mod1', path: 'Na.mod', label: AssetLabel.neuron_mechanisms })],
    });

    vi.mocked(getSingleNeuronSynaptome).mockResolvedValue(
      makeEntityBase({
        id: 'sns1',
        type: EntityTypeDict.SingleNeuronSynaptome,
        name: 'Synaptome A',
        me_model: { id: 'me1' },
        assets: [
          makeAsset({
            id: 'cfg1',
            path: 'config.json',
            label: AssetLabel.single_neuron_synaptome_config,
          }),
        ],
      }) as never
    );

    vi.mocked(getMEModel).mockResolvedValue(
      makeEntityBase({
        id: 'me1',
        type: EntityTypeDict.Memodel,
        emodel: { id: 'e1' },
        morphology: { id: 'morph1' },
      }) as never
    );

    vi.mocked(getEModel).mockResolvedValue(
      makeEntityBase({
        id: 'e1',
        type: EntityTypeDict.Emodel,
        assets: [
          makeAsset({
            id: 'hoc1',
            path: 'cell.hoc',
            label: AssetLabel.neuron_hoc,
            full_path: '/bucket/models/cell.hoc',
          }),
        ],
        ion_channel_models: [ionChannelModel],
      }) as never
    );

    vi.mocked(getCellMorphology).mockResolvedValue(
      makeEntityBase({
        id: 'morph1',
        type: EntityTypeDict.CellMorphology,
        assets: [makeAsset({ id: 'm1', path: 'morph.swc', label: AssetLabel.morphology })],
      }) as never
    );

    const entries = await collectFileEntries(getSingleNeuronSynaptomeFiles(['sns1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/config.json',
      'data/0/hoc/cell.hoc',
      'data/0/morphology/morph.swc',
      'data/0/mechanisms/Na.mod',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[5]));
    expect(metadataJson[0]).toMatchObject({ id: 'sns1', idx: 0, data_path: 'data/0' });
  });
});
