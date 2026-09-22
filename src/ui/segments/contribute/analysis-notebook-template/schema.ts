import z from 'zod';

import { ContributionArraySchema } from '@/ui/segments/contribute/shared';

export const ScaleEnum = z.enum(['subcellular', 'cellular', 'circuit', 'system']);

export type TScale = z.infer<typeof ScaleEnum>;

export const AnalysisNotebookTemplateAssetsSchema = z.object({
  notebook: z.literal(true, { message: 'Notebook file (.ipynb) is required' }),
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
    assignment_id: z.string().trim().optional(),
    // Consent token, not user input: the id of the notebook the user agreed to release the
    // assignment ID from. Never sent to the API — the pipeline builds its payload field by field.
    assignment_conflict_id: z.string().optional(),
  }),

  assets: AnalysisNotebookTemplateAssetsSchema,

  contribution: ContributionArraySchema,
});

export type TAnalysisNotebookTemplateForm = z.infer<typeof AnalysisNotebookTemplateSchema>;
