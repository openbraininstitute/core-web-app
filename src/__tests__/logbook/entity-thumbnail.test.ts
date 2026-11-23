import { expect, test } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { thumbnailSourceOf } from '@/features/logbook/editor/blocks/thumbnail-source';
import { ThumbnailFrom } from '@/features/logbook/types';

import type { IAsset } from '@/api/entitycore/types/shared/global';

const asset = (fields: Partial<IAsset>): IAsset => ({ id: 'a1', ...fields }) as IAsset;

test('a morphology with its SWC file is drawn by the thumbnail service; without it, no picture', () => {
  const swc = asset({ content_type: 'application/swc' } as Partial<IAsset>);
  expect(
    thumbnailSourceOf({ id: 'm', name: 'm', type: EntityTypeDict.CellMorphology, assets: [swc] })
  ).toEqual({ from: ThumbnailFrom.Service });
  expect(
    thumbnailSourceOf({ id: 'm', name: 'm', type: EntityTypeDict.CellMorphology, assets: [] })
  ).toBeNull();
});

test('an ME-model trace needs no file; a circuit shows the picture it holds', () => {
  expect(thumbnailSourceOf({ id: 'x', name: 'x', type: EntityTypeDict.Memodel })).toEqual({
    from: ThumbnailFrom.Service,
  });
  const picture = asset({ label: AssetLabel.circuit_visualization } as Partial<IAsset>);
  expect(
    thumbnailSourceOf({ id: 'c', name: 'c', type: EntityTypeDict.Circuit, assets: [picture] })
  ).toEqual({ from: ThumbnailFrom.Asset, asset: picture });
  expect(thumbnailSourceOf({ id: 'c', name: 'c', type: EntityTypeDict.Circuit })).toBeNull();
});

test('a type with no picture, or an unknown type, asks for nothing', () => {
  expect(thumbnailSourceOf({ id: 's', name: 's', type: EntityTypeDict.Subject })).toBeNull();
  expect(thumbnailSourceOf({ id: 's', name: 's' })).toBeNull();
});
