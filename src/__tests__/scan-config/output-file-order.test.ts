import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { orderOutputFiles } from '@/features/scan-config/outputs/order';

import type { TActivityCustomFile } from '@/features/scan-config/types';

function file(label: string, path: string): TActivityCustomFile {
  return {
    id: path,
    entity: { id: 'result' },
    asset: { id: path, label, path },
  } as unknown as TActivityCustomFile;
}

const figureA = file(AssetLabel.efeature_extraction_figures, 'figures/IDRest_amp.png');
const figureB = file(AssetLabel.efeature_extraction_figures, 'figures/SAHP_amp.png');
const features = file(AssetLabel.efeature_extraction_features, 'extracted_features.json');
const other = file(AssetLabel.task_config, 'protocols.json');

describe('orderOutputFiles', () => {
  it('lists the extracted features before the figures drawn from them', () => {
    const ordered = orderOutputFiles(
      [figureA, features, figureB],
      ExtendedEntitiesTypeDict.EFeatureExtractionResult
    );

    expect(ordered.map((entry) => entry.asset.path)).toEqual([
      'extracted_features.json',
      'figures/IDRest_amp.png',
      'figures/SAHP_amp.png',
    ]);
  });

  it('keeps files it does not name last, in the order they arrived', () => {
    const ordered = orderOutputFiles(
      [other, figureA, features],
      ExtendedEntitiesTypeDict.EFeatureExtractionResult
    );

    expect(ordered.map((entry) => entry.asset.path)).toEqual([
      'extracted_features.json',
      'figures/IDRest_amp.png',
      'protocols.json',
    ]);
  });

  it('leaves an output type that declares no order exactly as it is', () => {
    const files = [figureA, features, other];

    expect(orderOutputFiles(files, ExtendedEntitiesTypeDict.Circuit)).toBe(files);
    expect(orderOutputFiles(files, undefined)).toBe(files);
  });
});
