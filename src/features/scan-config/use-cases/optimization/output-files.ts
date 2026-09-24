import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';

/**
 * Rank of each listed output, lowest first: the models the run built, then the task result's
 * summary and the figures drawn from it.
 */
const OPTIMIZATION_OUTPUT_RANK: readonly ((file: TActivityCustomFile) => boolean)[] = [
  (file) => isEntityRow(file, EntityTypeDict.Emodel),
  (file) => isEntityRow(file, EntityTypeDict.Memodel),
  (file) => file.asset?.label === AssetLabel.emodel_analysis_summary,
  (file) => file.asset?.label === AssetLabel.emodel_analysis_figures,
];

/** Only useful to resume a run, so it is not worth a row. */
const HIDDEN_ASSET_LABELS: ReadonlySet<string> = new Set([
  AssetLabel.emodel_optimisation_checkpoint,
]);

function isEntityRow(file: TActivityCustomFile, type: string): boolean {
  return file.renderer === ActivityCustomFileRenderer.MiniDetailView && file.entity.type === type;
}

function rank(file: TActivityCustomFile): number {
  const index = OPTIMIZATION_OUTPUT_RANK.findIndex((matches) => matches(file));
  return index === -1 ? OPTIMIZATION_OUTPUT_RANK.length : index;
}

/**
 * Arranges what an optimization run generated for the output panel.
 *
 * A run generates its task result first, then the draft e-model and me-model, but the models are
 * what a reader came for, so they lead. The me-model row only exists once it carries a file.
 *
 * @param files - Every output file row, in `generated` order
 * @returns The rows to list: e-model, me-model, `final.json`, analysis figures, then anything
 *   unnamed in its incoming order; the checkpoint is dropped
 */
export function arrangeOptimizationOutputFiles(
  files: readonly TActivityCustomFile[]
): TActivityCustomFile[] {
  return files
    .filter((file) => !HIDDEN_ASSET_LABELS.has(file.asset?.label ?? ''))
    .sort((a, b) => rank(a) - rank(b));
}
