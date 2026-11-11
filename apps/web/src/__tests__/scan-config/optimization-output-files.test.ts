import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import { arrangeOptimizationOutputFiles } from '@/features/scan-config/use-cases/optimization/output-files';

import type { TActivityCustomFile } from '@/features/scan-config/types';

function entityRow(type: string): TActivityCustomFile {
  return {
    id: type,
    entity: { id: type, type },
    asset: { id: `${type}-asset`, label: 'any', path: `${type}.json` },
    renderer: ActivityCustomFileRenderer.MiniDetailView,
  } as unknown as TActivityCustomFile;
}

function resultFile(label: string, path: string): TActivityCustomFile {
  return {
    id: path,
    entity: { id: 'result', type: EntityTypeDict.TaskResult },
    asset: { id: path, label, path },
    renderer: ActivityCustomFileRenderer.Default,
  } as unknown as TActivityCustomFile;
}

const summary = resultFile(AssetLabel.emodel_analysis_summary, 'final.json');
const figures = resultFile(AssetLabel.emodel_analysis_figures, 'analysis_figures');
const checkpoint = resultFile(AssetLabel.emodel_optimisation_checkpoint, 'checkpoint.h5');
const emodel = entityRow(EntityTypeDict.Emodel);
const memodel = entityRow(EntityTypeDict.Memodel);

describe('arrangeOptimizationOutputFiles', () => {
  it('lists the models first, then the summary and figures, and drops the checkpoint', () => {
    const arranged = arrangeOptimizationOutputFiles([
      checkpoint,
      figures,
      summary,
      emodel,
      memodel,
    ]);

    expect(arranged.map((file) => file.id)).toEqual([
      EntityTypeDict.Emodel,
      EntityTypeDict.Memodel,
      'final.json',
      'analysis_figures',
    ]);
  });

  it('keeps the order without a me-model row', () => {
    const arranged = arrangeOptimizationOutputFiles([summary, figures, checkpoint, emodel]);

    expect(arranged.map((file) => file.id)).toEqual([
      EntityTypeDict.Emodel,
      'final.json',
      'analysis_figures',
    ]);
  });

  it('lists files it does not name last, in the order they arrived', () => {
    const other = resultFile('something_else', 'other.json');
    const arranged = arrangeOptimizationOutputFiles([other, summary, emodel]);

    expect(arranged.map((file) => file.id)).toEqual([
      EntityTypeDict.Emodel,
      'final.json',
      'other.json',
    ]);
  });
});
