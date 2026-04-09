import z from 'zod';

import { ContributionArraySchema } from '@/ui/segments/contribute/shared';

export const ScaleEnum = z.enum(['subcellular', 'cellular', 'circuit', 'system']);

export type TScale = z.infer<typeof ScaleEnum>;

export const AnalysisNotebookTemplateAssetsSchema = z.object({
  notebook: z.literal(true, {
    error: () => ({ message: 'Notebook file (.ipynb) is required' }),
  }),
  requirements: z.literal(true).optional(),
  zip: z.literal(true).optional(),
});

export const AnalysisNotebookTemplateSchema = z.object({
  setup: z.object({
    name: z.string({ message: 'Name is required' }).nonempty({ message: 'Name is required' }),
    description: z
      .string({ message: 'Description is required' })
      .nonempty({ message: 'Description is required' }),
    scale: ScaleEnum,
  }),

  assets: AnalysisNotebookTemplateAssetsSchema,

  contribution: ContributionArraySchema,
});

export type TAnalysisNotebookTemplateForm = z.infer<typeof AnalysisNotebookTemplateSchema>;
