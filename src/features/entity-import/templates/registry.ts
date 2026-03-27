import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IEntityImportTemplateGuideConfig } from '../core/adapter';

const cellMorphologyImportTemplateGuide = `# Cell Morphology CSV Guide

Use the CSV template to bulk import one morphology per row.

## Required columns

- \`Name\`
- \`Description\`
- \`Brain Region\`
- \`Subject\`
- \`License\`
- \`Protocol\`
- \`M-type\`
- \`Contributions\`

## Optional columns

- \`Experiment Date\`
- \`Contact Email\`
- \`Published In\`
- \`Location\`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- \`Contributions\` accepts tuple arrays in one cell: \`[(type, name, role), ...]\`.
- \`Contributions\` supports fixed three-slot tuples with blanks and abbreviated tuples such as \`(person, Jane Doe)\`, \`(Jane Doe)\`, or \`(Author)\`. Ambiguous tokens stay unresolved and must be fixed in the validator.
- Supported contributor types are \`person\`, \`organization\`, and \`consortium\`.
- \`Location\` accepts \`(x, y, z)\` and also keeps backward compatibility with \`x, y, z\`.
- \`Morphology File\` is still completed in the import UI, not in the CSV.
`;

const electricalCellRecordingImportTemplateGuide = `# Electrical Cell Recording CSV Guide

Use the CSV template to bulk import one electrical cell recording per row.

## Required columns

- \`Name\`
- \`Description\`
- \`Brain Region\`
- \`Subject\`
- \`License\`
- \`E-type\`
- \`Recording Location\`
- \`Recording Type\`
- \`Recording Origin\`
- \`Contributions\`

## Optional columns

- \`Experiment Date\`
- \`Contact Email\`
- \`Published In\`
- \`Temperature\`
- \`LJP\`
- \`Comment\`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- \`Recording Location\` accepts one of: \`Dend\`, \`Axon\`, \`Soma\`, \`Apic\`.
- \`Recording Type\` accepts one of: \`intracellular\`, \`extracellular\`, \`both\`, \`unknown\`.
- \`Recording Origin\` accepts one of: \`in_vivo\`, \`in_vitro\`, \`in_silico\`, \`unknown\`.
- \`Temperature\` is in degrees Celsius.
- \`LJP\` is the liquid junction potential in millivolts. Defaults to 0 if left blank.
- \`Contributions\` accepts tuple arrays in one cell: \`[(type, name, role), ...]\`.
- \`Contributions\` supports abbreviated tuples such as \`(person, Jane Doe)\`, \`(Jane Doe)\`, or \`(Author)\`. Ambiguous tokens stay unresolved and must be fixed in the validator.
- Supported contributor types are \`person\`, \`organization\`, and \`consortium\`.
- \`NWB File\` is completed in the import UI, not in the CSV.
`;

const ENTITY_IMPORT_TEMPLATE_GUIDES: Record<string, Record<string, string>> = {
  [ExtendedEntitiesTypeDict.CellMorphology]: {
    'cell-morphology-import-template.md': cellMorphologyImportTemplateGuide,
  },
  'cell-morphology': {
    'cell-morphology-import-template.md': cellMorphologyImportTemplateGuide,
  },
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: {
    'electrical-cell-recording-import-template.md': electricalCellRecordingImportTemplateGuide,
  },
  'electrical-cell-recording': {
    'electrical-cell-recording-import-template.md': electricalCellRecordingImportTemplateGuide,
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
