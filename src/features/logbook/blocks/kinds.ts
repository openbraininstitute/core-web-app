import type { TValueOf } from '@/api/logbook/types';

export const EntityType = {
  Circuit: 'circuit',
  Morphology: 'morphology',
  Emodel: 'emodel',
  Simulation: 'simulation',
  IonChannelModel: 'ion_channel_model',
  Trace: 'trace',
  BrainRegion: 'brain_region',
} as const;
export type TEntityType = TValueOf<typeof EntityType>;

export interface ILook {
  readonly label: string;
  readonly colour: string;
  readonly tint: string;
}

export const entityLooks: Readonly<Record<TEntityType, ILook>> = {
  circuit: { label: 'Circuit', colour: '#1677c9', tint: '#e8f3fc' },
  morphology: { label: 'Cell morphology', colour: '#0f766e', tint: '#e6f4f2' },
  emodel: { label: 'E-model', colour: '#a16207', tint: '#fbf3e3' },
  simulation: { label: 'Simulation result', colour: '#9d174d', tint: '#fbe9f0' },
  ion_channel_model: { label: 'Ion channel model', colour: '#4338ca', tint: '#ecebfb' },
  trace: { label: 'Electrophysiology trace', colour: '#0e7490', tint: '#e5f3f6' },
  brain_region: { label: 'Brain region', colour: '#be185d', tint: '#fbe8f1' },
};

const isEntityType = (type: string): type is TEntityType => Object.hasOwn(entityLooks, type);

// Unknown types use their key as the label and the generic card.
export const entityLookOf = (type: string): ILook =>
  isEntityType(type)
    ? entityLooks[type]
    : { label: type.replaceAll('_', ' ') || 'Entity', colour: '#595959', tint: '#f0f2f5' };

export const FileLang = {
  Python: 'python',
  Notebook: 'notebook',
  Csv: 'csv',
  Json: 'json',
  Shell: 'shell',
  File: 'file',
} as const;
export type TFileLang = TValueOf<typeof FileLang>;

export interface IFileLook {
  readonly badge: string;
  readonly bg: string;
  readonly fg: string;
  readonly name: string;
}

export const fileLooks: Readonly<Record<TFileLang, IFileLook>> = {
  python: { badge: 'PY', bg: '#ffe9a8', fg: '#1e3a5f', name: 'Python' },
  notebook: { badge: 'NB', bg: '#fde3cf', fg: '#7c2d12', name: 'Jupyter notebook' },
  csv: { badge: 'CSV', bg: '#dcfce7', fg: '#14532d', name: 'Table' },
  json: { badge: '{ }', bg: '#e0e7ff', fg: '#312e81', name: 'JSON' },
  shell: { badge: 'SH', bg: '#e5e7eb', fg: '#111827', name: 'Shell' },
  file: { badge: 'FILE', bg: '#f0f2f5', fg: '#262626', name: 'File' },
};

const extensionLangs: Readonly<Record<string, TFileLang>> = {
  py: FileLang.Python,
  ipynb: FileLang.Notebook,
  csv: FileLang.Csv,
  json: FileLang.Json,
  sh: FileLang.Shell,
};

export const fileLangOf = (name: string): TFileLang =>
  extensionLangs[name.split('.').pop()?.toLowerCase() ?? ''] ?? FileLang.File;

export const CalloutKind = { Note: 'note', Tip: 'tip', Warning: 'warning' } as const;
export type TCalloutKind = TValueOf<typeof CalloutKind>;

export const calloutLooks: Readonly<Record<TCalloutKind, ILook>> = {
  note: { label: 'Note', colour: '#0050b3', tint: '#e8f3fc' },
  tip: { label: 'Tip', colour: '#166534', tint: '#e8f6ee' },
  warning: { label: 'Caveat', colour: '#854d0e', tint: '#fdf3e1' },
};

// Any other `[!X]` falls back to a note.
const isCalloutKind = (kind: string): kind is TCalloutKind => Object.hasOwn(calloutLooks, kind);

export const calloutKindOf = (raw: string): TCalloutKind => {
  const kind = raw.toLowerCase();
  return isCalloutKind(kind) ? kind : CalloutKind.Note;
};
