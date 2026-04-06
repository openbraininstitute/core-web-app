import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import cellMorphologyImportTemplateGuide from './cell-morphology-import-guide.md?raw';
import electricalCellRecordingImportTemplateGuide from './electrical-cell-recording-import-guide.md?raw';

import type { IEntityImportTemplateGuideConfig } from '@/features/entity-import/core/adapter';

const ENTITY_IMPORT_TEMPLATE_GUIDES: Partial<
  Record<
    (typeof ExtendedEntitiesTypeDict)[keyof typeof ExtendedEntitiesTypeDict],
    Record<string, string>
  >
> = {
  [ExtendedEntitiesTypeDict.CellMorphology]: {
    'cell-morphology-import-guide.md': cellMorphologyImportTemplateGuide,
  },
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: {
    'electrical-cell-recording-import-guide.md': electricalCellRecordingImportTemplateGuide,
  },
};

export function getEntityImportTemplateGuide(templateGuide?: IEntityImportTemplateGuideConfig): {
  fileName: string;
  content: string;
} | null {
  if (!templateGuide) {
    return null;
  }

  const content =
    ENTITY_IMPORT_TEMPLATE_GUIDES[templateGuide.entityType]?.[templateGuide.guideFileName];
  if (!content) {
    return null;
  }

  return {
    fileName: templateGuide.guideFileName,
    content,
  };
}
