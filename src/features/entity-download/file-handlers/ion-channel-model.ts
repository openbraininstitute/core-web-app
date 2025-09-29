/* eslint-disable no-empty */

import { getIonChannelModel } from '@/api/entitycore/queries/model/ion-channel-model';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

export async function* getIonChannelModelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<Record<string, any>>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.IonChannelModel);
  } catch {}

  for (const entityId of entityIds) {
    const icm = await getIonChannelModel({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(icm) },
      json: { ...idxExtra, ...icm },
    });

    const configAsset = icm.assets.find((asset) => asset.label === 'neuron_mechanisms')!;
    try {
      const path = `${dataPath}/${configAsset.path}`;
      yield await createAssetFileEntry({
        entity: icm,
        asset: configAsset,
        path,
        ctx,
      });
    } catch (error) {}

    for await (const metadataFileEntry of metadata.getFileEntries()) {
      yield metadataFileEntry;
    }
  }
}
