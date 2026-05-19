import { describe, expect, it } from 'vitest';

import {
  AssetMatchAmbiguousError,
  AssetMatchNotFoundError,
  type AssetSelectorAssetLike,
  AssetSelectorCriteriaError,
  getAsset,
} from './assets';

const TestAssetLabel = {
  campaignSummary: 'campaign_summary',
  generationConfig: 'campaign_generation_config',
} as const;

const TestAssetContentType = {
  json: 'application/json',
  png: 'image/png',
} as const;

type TestAssetLabel = (typeof TestAssetLabel)[keyof typeof TestAssetLabel];
type TestAssetContentType = (typeof TestAssetContentType)[keyof typeof TestAssetContentType];

type TestAsset = AssetSelectorAssetLike & {
  id: string;
  path: string;
  label: TestAssetLabel;
  content_type: TestAssetContentType;
};

const assets: readonly TestAsset[] = [
  {
    id: 'asset-1',
    path: '/reports/summary.json',
    label: TestAssetLabel.campaignSummary,
    content_type: TestAssetContentType.json,
  },
  {
    id: 'asset-2',
    path: '/reports/summary.png',
    label: TestAssetLabel.campaignSummary,
    content_type: TestAssetContentType.png,
  },
  {
    id: 'asset-3',
    path: '/configs/generation.json',
    label: TestAssetLabel.generationConfig,
    content_type: TestAssetContentType.json,
  },
];

describe('getAsset()', () => {
  it('returns the only asset that matches a label and content type pair', () => {
    const asset = getAsset({
      assets,
      label: TestAssetLabel.campaignSummary,
      contentType: TestAssetContentType.png,
    }).getOneOrThrow();

    expect(asset.id).toBe('asset-2');
  });

  it('returns all assets that match a label', () => {
    const matchingAssets = getAsset({
      assets,
      label: TestAssetLabel.campaignSummary,
    }).getAllOrThrow();

    expect(matchingAssets.map((asset) => asset.id)).toEqual(['asset-1', 'asset-2']);
  });

  it('returns all assets that match a content type', () => {
    const matchingAssets = getAsset({
      assets,
      contentType: TestAssetContentType.json,
    }).getAllOrThrow();

    expect(matchingAssets.map((asset) => asset.id)).toEqual(['asset-1', 'asset-3']);
  });

  it('returns null when no assets match and a nullable single lookup is requested', () => {
    const asset = getAsset({
      assets,
      label: TestAssetLabel.generationConfig,
      contentType: TestAssetContentType.png,
    }).getOneOrNull();

    expect(asset).toBe(null);
  });

  it('returns null when no assets match and a nullable collection lookup is requested', () => {
    const matchingAssets = getAsset({
      assets,
      label: TestAssetLabel.generationConfig,
      contentType: TestAssetContentType.png,
    }).getAllOrNull();

    expect(matchingAssets).toBe(null);
  });

  it('throws when no assets match and a required single lookup is requested', () => {
    expect(() =>
      getAsset({
        assets,
        label: TestAssetLabel.generationConfig,
        contentType: TestAssetContentType.png,
      }).getOneOrThrow()
    ).toThrow(AssetMatchNotFoundError);
  });

  it('throws when no assets match and a required collection lookup is requested', () => {
    expect(() =>
      getAsset({
        assets,
        label: TestAssetLabel.generationConfig,
        contentType: TestAssetContentType.png,
      }).getAllOrThrow()
    ).toThrow(AssetMatchNotFoundError);
  });

  it('throws when a single lookup is ambiguous', () => {
    expect(() =>
      getAsset({
        assets,
        label: TestAssetLabel.campaignSummary,
      }).getOneOrThrow()
    ).toThrow(AssetMatchAmbiguousError);
  });

  it('throws when a nullable single lookup is ambiguous', () => {
    expect(() =>
      getAsset({
        assets,
        contentType: TestAssetContentType.json,
      }).getOneOrNull()
    ).toThrow(AssetMatchAmbiguousError);
  });

  it('throws when called without any constraints', () => {
    expect(() => getAsset({ assets })).toThrow(AssetSelectorCriteriaError);
  });
});
