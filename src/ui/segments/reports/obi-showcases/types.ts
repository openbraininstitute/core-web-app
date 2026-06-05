import { z } from 'zod';

// Re-export types from the main types file for consistency
export type {
  EModelListType,
  EModelTableType,
  MeModelListType,
  MeModelTableType,
  MinimalMeModelType,
  NotebookType,
  OBIShowcaseType,
  ShowcaseAuthorType,
  SynaptomeTableType,
  VideosListType,
} from '@/types/virtual-lab/obi-showcases';

// Type matching the actual Sanity query structure
export type SanityShowcaseType = {
  name: string;
  slug: string;
  virtualLabId?: string;
  projectId?: string;
  authorsList: {
    firstName: string;
    lastName: string;
    email: string;
    institution: string;
  }[];
  introduction: string;
  projectCategory?: string | null;
  projectType?: string | null;
  projectDate?: string | null;
  category?: string | null;
  type?: string | null;
  date?: string | null;
  customDate?: string | null;
  _updatedAt: string;
  heroImage: string;
  description: any[]; // PortableTextBlock[]
  videosList?: {
    url: string;
    title: string;
    alt: string;
    hasCaption: boolean;
    useTimestamps: boolean;
    captionTrack?: string;
  }[];
  artifactType?: string[];
  artifact?: {
    title: string;
    description: string;
    file: string;
    url: string;
    _type: string;
  }[];
  meModelsList?: {
    file: string;
    name: string;
    hasMorphologyThumbnail: boolean;
    morphology: string;
    hasTraceThumbnail: boolean;
    trace: string;
    validated: boolean;
    brainRegion: string;
    species: string;
    mType: string;
    eType: string;
    createdBy: string;
    creationDate: string;
    morphologyId: string;
    traceFileId: string;
    url: string;
    _type: string;
  }[];
  minimalMeModel?: {
    name: string;
    brainRegion: string;
    mType: string;
    eType: string;
    species: string;
  }[];
  eModelsList?: {
    name: string;
    hasResponseThumbnail: boolean;
    response: string;
    brainRegion: string;
    mType: string;
    eType: string;
    morphologyName: string;
    modelCumulatedScore: number;
    species: string;
    validated: boolean;
    contributor: string;
    creationDate: string;
  }[];
  eModelTable?: {
    name: string;
    response: string;
    brainRegion: string;
    mType: string;
    eType: string;
    morphology: string;
    modelCumulatedScore: number;
    species: string;
    contributors: string;
    creationDate: string;
    downloadLink: string;
    download: string;
  }[];
  meModelTable?: {
    name: string;
    morphologyThumbnail: string;
    traceThumbnail: string;
    validated: boolean;
    brainRegion: string;
    mType: string;
    eType: string;
    species: string;
    createdBy: string;
    creationDate: string;
    download: string;
  }[];
  notebook?: {
    name: string;
    description: string;
    objectOfInterest: string;
    scale: string;
    authors: string;
    creationDate: string;
    readMe: any[]; // PortableTextBlock
    url: string;
  }[];
  synaptomeTable?: {
    name: string;
    description: string;
    MEModel: string;
    MType: string;
    EType: string;
    brainRegion: string;
    species: string;
    createdBy: string;
    creationDate: string;
    download: string;
  }[];
};

// Legacy type for backward compatibility
export type AuthorListProps = {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
};

export type OBIShowcaseProjectType = {
  name: string;
  slug: string;
  introduction: string;
  heroImage: string;
  authorsList: AuthorListProps[];
  _updatedAt: string;
};

// Zod schemas matching OBIShowcaseType structure
const ShowcaseAuthorSchema = z.object({
  _key: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  institution: z.string(),
});

const EModelTableSchema = z.object({
  _key: z.string(),
  brainRegion: z.string(),
  contributors: z.string(),
  creationDate: z.string(),
  downloadLink: z.string(),
  eType: z.string(),
  mType: z.string(),
  modelCumulatedScore: z.number(),
  morphology: z.string(),
  name: z.string(),
  response: z.string(),
  species: z.string(),
});

const EModelListSchema = z.object({
  _key: z.string(),
  brainRegion: z.string(),
  contributors: z.string(),
  creationDate: z.string(),
  eType: z.string(),
  mType: z.string(),
  hasMorphologyThumbnail: z.boolean(),
  hasResponseThumbnail: z.boolean(),
  modelCumulatedScore: z.number(),
  morphology: z.string(),
  name: z.string(),
  species: z.string(),
  validated: z.boolean(),
});

const MeModelTableSchema = z.object({
  _key: z.string(),
  _type: z.string(),
  brainRegion: z.string(),
  createdBy: z.string(),
  creationDate: z.string(),
  download: z.string(),
  eType: z.string(),
  mType: z.string(),
  morphologyThumbnail: z.string(),
  name: z.string(),
  species: z.string(),
  traceThumbnail: z.string(),
  validated: z.boolean(),
});

const MeModelListSchema = z.object({
  _key: z.string(),
  _type: z.string(),
  brainRegion: z.string(),
  eType: z.string(),
  file: z.string(),
  hasMorphologyThumbnail: z.boolean(),
  hasTraceThumbnail: z.boolean(),
  mType: z.string(),
  morphologyId: z.string(),
  name: z.string(),
  species: z.string(),
  trace: z.string(),
  traceFileId: z.string(),
  validated: z.boolean(),
});

const MinimalMeModelSchema = z.object({
  _key: z.string(),
  brainRegion: z.string(),
  eType: z.string(),
  mType: z.string(),
  name: z.string(),
  species: z.string(),
});

const NotebookSchema = z.object({
  _key: z.string(),
  _type: z.string(),
  authors: z.string(),
  creationDate: z.string(),
  description: z.string(),
  name: z.string(),
  objectOfInterest: z.string(),
  readMe: z.array(z.any()), // PortableTextBlock
  scale: z.string(),
  url: z.string(),
});

const SynaptomeTableSchema = z.object({
  EType: z.string(),
  MEModel: z.string(),
  MType: z.string(),
  _key: z.string(),
  _type: z.string(),
  brainRegion: z.string(),
  createdBy: z.string(),
  creationDate: z.string(),
  description: z.string(),
  download: z.string(),
  name: z.string(),
  species: z.string(),
});

const VideosListSchema = z.object({
  _key: z.string(),
  _type: z.string(),
  alt: z.string(),
  hasCaption: z.boolean(),
  title: z.string(),
  url: z.string(),
  useTimestamps: z.boolean(),
});

// Schema matching the actual Sanity query structure
const SanityShowcaseAuthorSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  institution: z.string(),
});

const SanityVideosListSchema = z.object({
  url: z.string(),
  title: z.string(),
  alt: z.string(),
  hasCaption: z.boolean(),
  useTimestamps: z.boolean(),
  captionTrack: z.string().optional(),
});

const SanityArtifactSchema = z.object({
  title: z.string(),
  description: z.string(),
  file: z.string(),
  url: z.string(),
  _type: z.string(),
});

const SanityMeModelListSchema = z.object({
  file: z.string(),
  name: z.string(),
  hasMorphologyThumbnail: z.boolean(),
  morphology: z.string(),
  hasTraceThumbnail: z.boolean(),
  trace: z.string(),
  validated: z.boolean(),
  brainRegion: z.string(),
  species: z.string(),
  mType: z.string(),
  eType: z.string(),
  createdBy: z.string(),
  creationDate: z.string(),
  morphologyId: z.string(),
  traceFileId: z.string(),
  url: z.string(),
  _type: z.string(),
});

const SanityMinimalMeModelSchema = z.object({
  name: z.string(),
  brainRegion: z.string(),
  mType: z.string(),
  eType: z.string(),
  species: z.string(),
});

const SanityEModelListSchema = z.object({
  name: z.string(),
  hasResponseThumbnail: z.boolean(),
  response: z.string(),
  brainRegion: z.string(),
  mType: z.string(),
  eType: z.string(),
  morphologyName: z.string(),
  modelCumulatedScore: z.number(),
  species: z.string(),
  validated: z.boolean(),
  contributor: z.string(),
  creationDate: z.string(),
});

const SanityEModelTableSchema = z.object({
  name: z.string(),
  response: z.string(),
  brainRegion: z.string(),
  mType: z.string(),
  eType: z.string(),
  morphology: z.string(),
  modelCumulatedScore: z.number(),
  species: z.string(),
  contributors: z.string(),
  creationDate: z.string(),
  downloadLink: z.string(),
  download: z.string(),
});

const SanityMeModelTableSchema = z.object({
  name: z.string(),
  morphologyThumbnail: z.string(),
  traceThumbnail: z.string(),
  validated: z.boolean(),
  brainRegion: z.string(),
  mType: z.string(),
  eType: z.string(),
  species: z.string(),
  createdBy: z.string(),
  creationDate: z.string(),
  download: z.string(),
});

const SanityNotebookSchema = z.object({
  name: z.string(),
  description: z.string(),
  objectOfInterest: z.string(),
  scale: z.string(),
  authors: z.string(),
  creationDate: z.string(),
  readMe: z.array(z.any()), // PortableTextBlock
  url: z.string(),
});

const SanitySynaptomeTableSchema = z.object({
  name: z.string(),
  description: z.string(),
  MEModel: z.string(),
  MType: z.string(),
  EType: z.string(),
  brainRegion: z.string(),
  species: z.string(),
  createdBy: z.string(),
  creationDate: z.string(),
  download: z.string(),
});

// Schema matching the actual Sanity query structure
const SanityShowcaseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  authorsList: z.array(SanityShowcaseAuthorSchema),
  introduction: z.string(),
  projectCategory: z.string().nullable().optional(),
  projectType: z.string().nullable().optional(),
  projectDate: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  customDate: z.string().nullable().optional(),
  _updatedAt: z.string(),
  heroImage: z.string(),
  description: z.array(z.any()), // PortableTextBlock[]
  videosList: z.array(SanityVideosListSchema).optional(),
  artifactType: z.array(z.string()).optional(),
  artifact: z.array(SanityArtifactSchema).optional(),
  meModelsList: z.array(SanityMeModelListSchema).optional(),
  minimalMeModel: z.array(SanityMinimalMeModelSchema).optional(),
  eModelsList: z.array(SanityEModelListSchema).optional(),
  eModelTable: z.array(SanityEModelTableSchema).optional(),
  meModelTable: z.array(SanityMeModelTableSchema).optional(),
  notebook: z.array(SanityNotebookSchema).optional(),
  synaptomeTable: z.array(SanitySynaptomeTableSchema).optional(),
});

// Main OBIShowcaseType schema (for reference, but using Sanity schema for validation)
const OBIShowcaseTypeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  introduction: z.string(),
  artifactType: z.array(z.string()),
  authorsList: z.array(ShowcaseAuthorSchema),
  description: z.array(z.any()), // PortableTextBlock[]
  eModelTable: z.array(EModelTableSchema),
  eModelsList: z.array(EModelListSchema),
  heroImage: z.string(),
  meModelTable: z.array(MeModelTableSchema),
  meModelsList: z.array(MeModelListSchema),
  minimalMeModel: z.array(MinimalMeModelSchema),
  notebook: z.array(NotebookSchema),
  synaptomeTable: z.array(SynaptomeTableSchema),
  videosList: z.array(VideosListSchema),
});

const OBIShowcaseTypeArraySchema = z.array(OBIShowcaseTypeSchema);

// Legacy schemas for backward compatibility
const AuthorListSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  institution: z.string(),
});

const OBIShowcaseProjectSchema = z.object({
  name: z.string(),
  slug: z.string(),
  introduction: z.string(),
  heroImage: z.string(),
  authorsList: z.array(AuthorListSchema),
  _updatedAt: z.string(),
});

const OBIShowcaseProjectArraySchema = z.array(OBIShowcaseProjectSchema);

// Export schemas for use in other files
export {
  AuthorListSchema,
  EModelListSchema,
  EModelTableSchema,
  MeModelListSchema,
  MeModelTableSchema,
  MinimalMeModelSchema,
  NotebookSchema,
  OBIShowcaseProjectSchema,
  OBIShowcaseTypeSchema,
  SanityShowcaseSchema,
  ShowcaseAuthorSchema,
  SynaptomeTableSchema,
  VideosListSchema,
};

// Converted from tryType to Zod
export const isOBIShowcaseProjectProps = (data: unknown): data is OBIShowcaseProjectType[] => {
  const result = OBIShowcaseProjectArraySchema.safeParse(data);
  return result.success;
};

// New validation function for OBIShowcaseType
export const isOBIShowcaseTypeProps = (
  data: unknown
): data is import('@/types/virtual-lab/obi-showcases').OBIShowcaseType[] => {
  const result = OBIShowcaseTypeArraySchema.safeParse(data);
  return result.success;
};
