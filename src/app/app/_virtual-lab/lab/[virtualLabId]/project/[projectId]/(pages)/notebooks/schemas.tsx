import { z } from 'zod';

const NotebookSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  github_file_url: z.url(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

const NotebooksArraySchema = z.array(NotebookSchema);

export { NotebooksArraySchema };
