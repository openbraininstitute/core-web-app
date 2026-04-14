const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const test: typeof import('node:test') = require('node:test');
const assetSelectors: typeof import('./assets') = require('./assets.ts');

const { describe, it } = test;
const { AssetMatchAmbiguousError, AssetMatchNotFoundError, AssetSelectorCriteriaError, getAsset } =
  assetSelectors;

type AssetSelectorAssetLike = import('./assets').AssetSelectorAssetLike;

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

    assert.equal(asset.id, 'asset-2');
  });

  it('returns all assets that match a label', () => {
    const matchingAssets = getAsset({
      assets,
      label: TestAssetLabel.campaignSummary,
    }).getAllOrThrow();

    assert.deepEqual(
      matchingAssets.map((asset) => asset.id),
      ['asset-1', 'asset-2']
    );
  });

  it('returns all assets that match a content type', () => {
    const matchingAssets = getAsset({
      assets,
      contentType: TestAssetContentType.json,
    }).getAllOrThrow();

    assert.deepEqual(
      matchingAssets.map((asset) => asset.id),
      ['asset-1', 'asset-3']
    );
  });

  it('returns null when no assets match and a nullable single lookup is requested', () => {
    const asset = getAsset({
      assets,
      label: TestAssetLabel.generationConfig,
      contentType: TestAssetContentType.png,
    }).getOneOrNull();

    assert.equal(asset, null);
  });

  it('returns null when no assets match and a nullable collection lookup is requested', () => {
    const matchingAssets = getAsset({
      assets,
      label: TestAssetLabel.generationConfig,
      contentType: TestAssetContentType.png,
    }).getAllOrNull();

    assert.equal(matchingAssets, null);
  });

  it('throws when no assets match and a required single lookup is requested', () => {
    assert.throws(
      () =>
        getAsset({
          assets,
          label: TestAssetLabel.generationConfig,
          contentType: TestAssetContentType.png,
        }).getOneOrThrow(),
      AssetMatchNotFoundError
    );
  });

  it('throws when no assets match and a required collection lookup is requested', () => {
    assert.throws(
      () =>
        getAsset({
          assets,
          label: TestAssetLabel.generationConfig,
          contentType: TestAssetContentType.png,
        }).getAllOrThrow(),
      AssetMatchNotFoundError
    );
  });

  it('throws when a single lookup is ambiguous', () => {
    assert.throws(
      () =>
        getAsset({
          assets,
          label: TestAssetLabel.campaignSummary,
        }).getOneOrThrow(),
      AssetMatchAmbiguousError
    );
  });

  it('throws when a nullable single lookup is ambiguous', () => {
    assert.throws(
      () =>
        getAsset({
          assets,
          contentType: TestAssetContentType.json,
        }).getOneOrNull(),
      AssetMatchAmbiguousError
    );
  });

  it('throws when called without any constraints', () => {
    assert.throws(() => getAsset({ assets }), AssetSelectorCriteriaError);
  });
});
