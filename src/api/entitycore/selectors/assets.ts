export type AssetSelectorAssetLike = Readonly<{
  label: string;
  content_type: string;
}>;

export type AssetSelectorCriteria<TAsset extends AssetSelectorAssetLike> = Readonly<{
  label?: TAsset['label'];
  contentType?: TAsset['content_type'];
}>;

export type GetAssetOptions<TAsset extends AssetSelectorAssetLike> = Readonly<{
  assets: readonly TAsset[];
}> &
  AssetSelectorCriteria<TAsset>;

export type AssetSelector<TAsset extends AssetSelectorAssetLike> = Readonly<{
  getOneOrThrow(): TAsset;
  getAllOrThrow(): readonly TAsset[];
  getOneOrNull(): TAsset | null;
  getAllOrNull(): readonly TAsset[] | null;
}>;

type AssetSelectorRuntimeCriteria = Readonly<{
  label?: string;
  contentType?: string;
}>;

export class AssetSelectorError extends Error {
  readonly criteria: AssetSelectorRuntimeCriteria;

  constructor(message: string, criteria: AssetSelectorRuntimeCriteria) {
    super(message);
    this.name = new.target.name;
    this.criteria = criteria;
  }
}

export class AssetSelectorCriteriaError extends AssetSelectorError {
  constructor(criteria: AssetSelectorRuntimeCriteria) {
    super('Asset selector requires at least one constraint: "label" or "contentType".', criteria);
  }
}

export class AssetMatchNotFoundError extends AssetSelectorError {
  constructor(criteria: AssetSelectorRuntimeCriteria) {
    super(`No assets matched ${describeCriteria(criteria)}.`, criteria);
  }
}

export class AssetMatchAmbiguousError extends AssetSelectorError {
  readonly matchCount: number;

  constructor(criteria: AssetSelectorRuntimeCriteria, matchCount: number) {
    super(
      `Expected exactly one asset for ${describeCriteria(criteria)}, but found ${matchCount}.`,
      criteria
    );
    this.matchCount = matchCount;
  }
}

export function getAsset<TAsset extends AssetSelectorAssetLike>({
  assets,
  label,
  contentType,
}: GetAssetOptions<TAsset>): AssetSelector<TAsset> {
  const criteria = freezeCriteria({ label, contentType });

  assertHasAtLeastOneConstraint(criteria);

  const matches = Object.freeze(
    assets.filter((asset) => matchesCriteria(asset, criteria))
  ) as readonly TAsset[];

  return Object.freeze({
    getOneOrThrow() {
      if (matches.length === 0) {
        throw new AssetMatchNotFoundError(criteria);
      }

      if (matches.length > 1) {
        throw new AssetMatchAmbiguousError(criteria, matches.length);
      }

      return matches[0];
    },

    getAllOrThrow() {
      if (matches.length === 0) {
        throw new AssetMatchNotFoundError(criteria);
      }

      return matches;
    },

    getOneOrNull() {
      if (matches.length === 0) {
        return null;
      }

      if (matches.length > 1) {
        throw new AssetMatchAmbiguousError(criteria, matches.length);
      }

      return matches[0];
    },

    getAllOrNull() {
      if (matches.length === 0) {
        return null;
      }

      return matches;
    },
  });
}

function freezeCriteria<TAsset extends AssetSelectorAssetLike>({
  label,
  contentType,
}: AssetSelectorCriteria<TAsset>): AssetSelectorRuntimeCriteria {
  return Object.freeze({ label, contentType });
}

function assertHasAtLeastOneConstraint(
  criteria: AssetSelectorRuntimeCriteria
): asserts criteria is
  | Required<Pick<AssetSelectorRuntimeCriteria, 'label'>>
  | Required<Pick<AssetSelectorRuntimeCriteria, 'contentType'>> {
  if (criteria.label === undefined && criteria.contentType === undefined) {
    throw new AssetSelectorCriteriaError(criteria);
  }
}

function matchesCriteria(asset: AssetSelectorAssetLike, criteria: AssetSelectorRuntimeCriteria) {
  if (criteria.label !== undefined && asset.label !== criteria.label) {
    return false;
  }

  if (criteria.contentType !== undefined && asset.content_type !== criteria.contentType) {
    return false;
  }

  return true;
}

function describeCriteria(criteria: AssetSelectorRuntimeCriteria) {
  const descriptors: string[] = [];

  if (criteria.label !== undefined) {
    descriptors.push(`label="${criteria.label}"`);
  }

  if (criteria.contentType !== undefined) {
    descriptors.push(`contentType="${criteria.contentType}"`);
  }

  return descriptors.join(' and ');
}
