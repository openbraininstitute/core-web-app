import { isNil, isNotNil } from 'es-toolkit';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { ThumbnailFrom } from '@/features/logbook/types';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IEntity, TThumbnailSource } from '@/features/logbook/types';

// The same pictures the Data page's side panel shows, by the EntityCore type.
const DRAWN = new Set<string>([
  EntityTypeDict.CellMorphology,
  EntityTypeDict.ElectricalCellRecording,
  EntityTypeDict.IonChannelRecording,
  EntityTypeDict.Emodel,
  EntityTypeDict.Memodel,
]);
// The service draws a model's trace from the model itself; the others need their data file.
const DRAWN_WITHOUT_FILE = new Set<string>([EntityTypeDict.Emodel, EntityTypeDict.Memodel]);
const HELD: Readonly<Partial<Record<string, AssetLabel>>> = {
  [EntityTypeDict.Circuit]: AssetLabel.circuit_visualization,
  [EntityTypeDict.IonChannelModel]: AssetLabel.ion_channel_model_thumbnail,
  [EntityTypeDict.SimulatableExtracellularRecordingArray]: AssetLabel.electrode_array_image,
};

/** Null when the entity has no picture, so the card asks nothing and keeps no space for one. */
export function thumbnailSourceOf(entity: IEntity): TThumbnailSource | null {
  const { type, assets = [] } = entity;
  if (isNil(type)) return null;
  const label = HELD[type];
  if (isNotNil(label)) {
    const asset = assets.find((item) => item.label === label);
    return isNil(asset) ? null : { from: ThumbnailFrom.Asset, asset };
  }
  if (!DRAWN.has(type)) return null;
  if (DRAWN_WITHOUT_FILE.has(type)) return { from: ThumbnailFrom.Service };
  const extension = getEntityByCoreType({ type: type as TEntityTypeDict })?.asset?.extension;
  return assets.some((item) => item.content_type === extension)
    ? { from: ThumbnailFrom.Service }
    : null;
}
