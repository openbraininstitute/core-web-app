import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityCustomFile } from '@/features/scan-config/types';

/**
 * The order a run's output files are listed in, per output type.
 *
 * Assets reach us in whatever order the API returns them, which is not the order a reader wants:
 * results are read before the figures drawn from them. An output type listed here has its files
 * arranged by asset label; anything not named keeps its incoming order, after the named ones.
 *
 * Ordering is declared by *label* rather than by file name so it survives a run writing
 * `features.json` instead of `extracted_features.json`.
 *
 * A type absent from this map is listed exactly as it arrives, which is what every output did
 * before this existed — so adding a workflow here is opt-in and leaves the others untouched.
 */
const OUTPUT_FILE_ORDER: Partial<Record<TExtendedEntitiesTypeDict, readonly string[]>> = {
  [ExtendedEntitiesTypeDict.EFeatureExtractionResult]: [
    AssetLabel.efeature_extraction_features,
    AssetLabel.efeature_extraction_figures,
  ],
};

/**
 * Arranges one output's files for display.
 *
 * @param files - The files a strategy produced for a single generated entity
 * @param extendedType - The entity's extended type; `undefined` when it could not be resolved
 * @returns The files in listing order — the same array when the type declares no order
 *
 * @remarks
 * Task logs are not ordered here: they are prepended by the panel, ahead of everything a run
 * generated, so they stay first whatever a workflow declares.
 *
 * @example
 * orderOutputFiles(files, ExtendedEntitiesTypeDict.EFeatureExtractionResult);
 * // → extracted features, then figures, then anything else
 */
export function orderOutputFiles(
  files: TActivityCustomFile[],
  extendedType: TExtendedEntitiesTypeDict | undefined
): TActivityCustomFile[] {
  const order = extendedType ? OUTPUT_FILE_ORDER[extendedType] : undefined;
  if (!order || files.length < 2) return files;

  const rank = (file: TActivityCustomFile): number => {
    const index = order.indexOf(file.asset?.label ?? '');
    return index === -1 ? order.length : index;
  };

  // `sort` is stable, so equally-ranked files — several figures, or anything unnamed — keep the
  // order the API gave them.
  return [...files].sort((a, b) => rank(a) - rank(b));
}
