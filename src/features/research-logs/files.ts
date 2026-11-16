/** Paths inside a research log's `research_log_files` folder, as a log's markdown links to them. */

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const MARKDOWN_FILE = /\.(md|markdown)$/i;

/** The path of a link without its `?query` and `#fragment`. */
function pathOf(href: string): string {
  return href.replace(/[?#].*$/, '');
}

/** A link to a markdown file kept beside the log: relative, with no scheme, and ending in `.md`. */
export function isRelativeMarkdownLink(href: string | undefined): href is string {
  if (!href || SCHEME.test(href) || href.startsWith('/') || href.startsWith('#')) return false;
  return MARKDOWN_FILE.test(pathOf(href));
}

/** The folder of a file path: `notes/a.md` is `notes`, `a.md` is the root (empty). */
export function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? '' : path.slice(0, cut);
}

/**
 * Resolves a link against the folder of the file holding it, to a path inside the files folder.
 * `..` cannot climb out of it, so a link never reaches beyond the log's own files.
 */
export function resolveLogPath(baseDir: string, href: string): string {
  let target = pathOf(href);
  try {
    target = decodeURIComponent(target);
  } catch {
    // keep it as written
  }
  const out: string[] = [];
  for (const part of [...baseDir.split('/'), ...target.split('/')]) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

/** The file name for a page titled `title`: its words in lower case, joined by dashes. */
export function pageFileName(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'page'}.md`;
}

/** Where a new page goes: in `dir`, named for its title, and numbered when that name is taken. */
export function newPagePath(title: string, dir: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const name = pageFileName(title);
  const at = (file: string) => (dir ? `${dir}/${file}` : file);
  let path = at(name);
  for (let n = 2; used.has(path); n++) path = at(`${name.slice(0, -3)}-${n}.md`);
  return path;
}
