import { z } from 'zod';

const NotebookSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  github_file_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const NotebooksArraySchema = z.array(NotebookSchema);

export { NotebookSchema, NotebooksArraySchema };
