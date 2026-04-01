import Papa from 'papaparse';
import { match } from 'ts-pattern';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { createCellMorphologyImportAdapter } from '@/features/entity-import/adapters/cell-morphology/adapter';
import { createElectricalCellRecordingImportAdapter } from '@/features/entity-import/adapters/electrical-cell-recording/adapter';
import { buildTemplateColumns } from '@/features/entity-import/core/csv';
import { getEntityImportTemplateGuide } from '@/features/entity-import/templates/registry';

import type { IEntityImportAdapter } from '@/features/entity-import/core/adapter';

export function downloadBlob({
  content,
  type,
  fileName,
}: {
  content: BlobPart;
  type: string;
  fileName: string;
}): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadImportCsvTemplate(adapter: IEntityImportAdapter<unknown, unknown>): void {
  const csv = Papa.unparse({
    fields: buildTemplateColumns(adapter.fields),
    data: [],
  });
  downloadBlob({
    content: csv,
    type: 'text/csv;charset=utf-8;',
    fileName: adapter.templateFileName,
  });
}

/** @returns `true` if a guide was downloaded */
export function tryDownloadImportGuide(adapter: IEntityImportAdapter<unknown, unknown>): boolean {
  const templateGuide = getEntityImportTemplateGuide(adapter.templateGuide);
  if (!templateGuide) {
    return false;
  }
  downloadBlob({
    content: templateGuide.content,
    type: 'text/markdown;charset=utf-8;',
    fileName: templateGuide.fileName,
  });
  return true;
}

export function resolveContributeMultipleImportAdapter(
  type: TExtendedEntitiesTypeDict
): IEntityImportAdapter<unknown, unknown> | null {
  return match(type)
    .with(ExtendedEntitiesTypeDict.CellMorphology, () => createCellMorphologyImportAdapter({}))
    .with(ExtendedEntitiesTypeDict.ElectricalCellRecording, () =>
      createElectricalCellRecordingImportAdapter()
    )
    .otherwise(() => null);
}
