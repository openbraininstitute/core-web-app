// Types for the pre-resolved OBI Standard export (data/standard-data.json),
// generated from the entitycore OpenAPI schema + asset-label rules by the
// `obi-standard` project (GET /standard-data.json).

export type StdProperty = {
  name: string;
  typeLabel: string;
  refSlug?: string;
  format?: string;
  description?: string;
  required: boolean;
  nullable: boolean;
  isArray: boolean;
  enumValues?: (string | number)[];
  defaultValue?: unknown;
  refSchema?: string;
  /** The parent class it comes from (e.g. ScientificArtifact); absent if the type's own. */
  inheritedFrom?: string;
};

export type StdFileVariant = {
  label: string;
  contentType: string | null;
  mime: string | null;
  suffixes: string[];
  isDirectory: boolean;
  description: string;
};

export type StdFileGroup = {
  label: string;
  variants: StdFileVariant[];
};

export type SdkOperation = {
  label: string;
  code: string;
};

export type SdkSnippets = {
  setup: string;
  operations: SdkOperation[];
};

export type StdEntity = {
  slug: string;
  title: string;
  category: string;
  short: string;
  description: string;
  schema: string;
  entityType: string;
  apiPath: string;
  found: boolean;
  properties: StdProperty[];
  commonProperties: StdProperty[];
  files: StdFileGroup[];
  sdk: SdkSnippets;
  /** Its parent classes in entitycore, nearest first (e.g. ScientificArtifact, Entity). */
  parents?: string[];
  /** obi-one's endpoints for a validated registration, where it has them. */
  registration?: StdRegistration[];
  /** For the generic task types: the key that tells their kinds apart, and its values. */
  taskKey?: { name: string; values: string[] };
};

export type StdRegistration = {
  method: string;
  path: string;
  summary: string;
  description: string;
  body: string | null;
};

export type StdCategory = {
  id: string;
  title: string;
  blurb: string;
};

export type StdContentType = {
  name: string;
  mime: string;
  suffixes: string[];
};

export type StandardData = {
  generatedFrom: 'live' | 'snapshot';
  apiVersion: string | null;
  categories: StdCategory[];
  contentTypes: StdContentType[];
  entities: StdEntity[];
};
