// Presentation maps for the OBI Standard view (light theme, core-web-app tokens).

export type ContentFamily =
  | 'structured'
  | 'neuro'
  | 'image'
  | 'document'
  | 'archive'
  | 'directory'
  | 'other';

const FAMILY_BY_CONTENT: Record<string, ContentFamily> = {
  json: 'structured',
  swc: 'neuro',
  nrrd: 'neuro',
  obj: 'neuro',
  hoc: 'neuro',
  asc: 'neuro',
  abf: 'neuro',
  nwb: 'neuro',
  h5: 'neuro',
  mod: 'neuro',
  gltf_binary: 'neuro',
  png: 'image',
  jpg: 'image',
  webp: 'image',
  pdf: 'document',
  text: 'document',
  ipynb: 'document',
  zip: 'archive',
  gzip: 'archive',
  directory: 'directory',
  other: 'other',
};

export function contentFamily(contentType: string | null, isDirectory: boolean): ContentFamily {
  if (isDirectory || !contentType || contentType === 'directory') return 'directory';
  return FAMILY_BY_CONTENT[contentType] ?? 'other';
}

export const FAMILY_BADGE: Record<ContentFamily, string> = {
  structured: 'bg-sky-50 text-sky-700 border-sky-200',
  neuro: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  image: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  document: 'bg-amber-50 text-amber-700 border-amber-200',
  archive: 'bg-orange-50 text-orange-700 border-orange-200',
  directory: 'bg-slate-100 text-slate-700 border-slate-200',
  other: 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

export const FAMILY_LABEL: Record<ContentFamily, string> = {
  structured: 'Structured data',
  neuro: 'Scientific format',
  image: 'Image',
  document: 'Document',
  archive: 'Archive',
  directory: 'Directory',
  other: 'Binary',
};

const CATEGORY_COLORS: Record<string, string> = {
  foundational: '#6b7280',
  morphology: '#8b5cf6',
  electrophysiology: '#06b6d4',
  'cell-models': '#6366f1',
  'ion-channels': '#ec4899',
  circuits: '#f97316',
  composition: '#10b981',
  simulation: '#3b82f6',
  validation: '#eab308',
  tasks: '#475569',
};

export function categoryColor(categoryId: string): string {
  return CATEGORY_COLORS[categoryId] ?? '#6366f1';
}
