import { z } from 'zod';

const ItemSchema = z.object({
  path: z.string(),
  mode: z.string(),
  type: z.string(),
  sha: z.string(),
  size: z.number().optional(),
  url: z.string(),
});
export type Item = z.infer<typeof ItemSchema>;

const MetadataInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  data_type: z.object({
    artefact: z.string().or(z.array(z.string())),
    mime_type: z.array(z.string()).optional(),
  }),
});

const MetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  scale: z.string(),
  input: z.array(MetadataInputSchema),
  authors: z.array(z.string()),
});
type Metadata = z.infer<typeof MetadataSchema>;

const NotebookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  authors: z.string(),
  notebookUrl: z.string(),
  readmeUrl: z.string(),
  metadataUrl: z.string(),
  path: z.string(),
  scale: z.string(),
  creationDate: z.string().nullable(),
  key: z.string(),
  githubUser: z.string(),
  githubRepo: z.string(),
  defaultBranch: z.string(),
  objectOfInterest: z.string(),
});
export type Notebook = z.infer<typeof NotebookSchema>;

const RepoDetailsSchema = z.object({
  user: z.string(),
  repo: z.string(),
});
type RepoDetails = z.infer<typeof RepoDetailsSchema>;

export function assertGithubApiResponse(response: Response) {
  if (response.status === 401) throw new Error('You are not logged in to Github');
  if (response.status === 404) throw new Error('Cannot find notebook in Github');
  if (response.status === 403)
    throw new Error('You do not have access to this notebook, please request access.');
}

export function validateMetadata(metadata: string): Metadata {
  return MetadataSchema.parse(JSON.parse(metadata));
}

export function extractUserAndRepo(repoUrl: string): RepoDetails {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  const [, user, repo] = match;
  return { user, repo: repo.replace('.git', '') };
}
