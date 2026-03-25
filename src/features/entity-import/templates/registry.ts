import type { EntityImportTemplateGuideConfig } from '../core/adapter';

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

## Optional columns

- \`Experiment Date\`
- \`Contact Email\`
- \`Published In\`
- \`Location\`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- \`Location\` must contain all \`X\`, \`Y\`, and \`Z\` coordinates together.
- \`Contributions\` and \`Morphology File\` are completed in the import UI, not in the CSV.
`;

const ENTITY_IMPORT_TEMPLATE_GUIDES: Record<string, Record<string, string>> = {
  'cell-morphology': {
    'cell-morphology-import-template.md': cellMorphologyImportTemplateGuide,
  },
};

export function getEntityImportTemplateGuide(templateGuide?: EntityImportTemplateGuideConfig): {
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
