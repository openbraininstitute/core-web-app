export function basename(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

export function dirname(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

export function extension(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Breadcrumb segments for a directory path, root first. */
export function pathSegments(path: string): { name: string; path: string }[] {
  const parts = path.split('/').filter(Boolean);
  const out: { name: string; path: string }[] = [];
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    out.push({ name: part, path: acc });
  }
  return out;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'py',
  'js',
  'jsx',
  'ts',
  'tsx',
  'json',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'csv',
  'tsv',
  'sh',
  'bash',
  'zsh',
  'sql',
  'html',
  'css',
  'scss',
  'xml',
  'r',
  'jl',
  'rs',
  'go',
  'c',
  'h',
  'cpp',
  'hpp',
  'java',
  'rb',
  'lua',
  'log',
  'env',
  'gitignore',
  'dockerfile',
  'makefile',
  'tex',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']);

export type FileKind = 'notebook' | 'text' | 'image' | 'binary';

export function fileKind(path: string, mimetype?: string | null): FileKind {
  const ext = extension(path);
  if (ext === 'ipynb') return 'notebook';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (!ext && /^(makefile|dockerfile|license|readme)$/i.test(basename(path))) return 'text';
  if (mimetype?.startsWith('text/')) return 'text';
  return 'binary';
}
