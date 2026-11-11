'use client';

import { useQuery } from '@tanstack/react-query';

import type { ConfigSchema } from '@/features/scan-config/types';

/**
 * The eFEL illustrations, listed from wherever the schema points.
 *
 * There is no per-feature figure to look up. `efel_figures_base_url` addresses a directory of
 * illustrations that cover *families* of features — one `AHP.png` for every AHP measure, one
 * `inv_ISI.png` for the six inverse-ISI features — and the file names do not line up with eFEL
 * keys anyway (`AP_Amplitude.png` against the key `AP_amplitude`). Deriving a URL per feature
 * therefore 404s for all but one of the 26 classes, which is why the directory is listed instead.
 */

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp)$/i;

/** `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path…>` */
const GITHUB_RAW_HOST = 'raw.githubusercontent.com';

export type TEFelFigure = {
  name: string;
  label: string;
  url: string;
};

/**
 * Turns a GitHub raw directory URL into the contents-API URL that can enumerate it.
 *
 * Raw URLs serve files, never listings, so the host has to be recognised to ask the right
 * question. Returns `null` for anything else — the caller then shows nothing rather than
 * guessing at file names.
 */
export function githubContentsApiUrl(baseUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return null;
  }

  if (parsed.host !== GITHUB_RAW_HOST) return null;

  const [owner, repo, ref, ...path] = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (!owner || !repo || !ref || path.length === 0) return null;

  return `https://api.github.com/repos/${owner}/${repo}/contents/${path.join('/')}?ref=${ref}`;
}

/** `AP_Amplitude.png` -> `AP Amplitude`; the file name is the only label the directory gives us. */
export function figureLabelFromFileName(fileName: string): string {
  return fileName.replace(IMAGE_EXTENSIONS, '').replace(/[_-]+/g, ' ').trim();
}

export function efelFiguresBaseUrl(schema: ConfigSchema): string | null {
  const base = (schema as unknown as Record<string, unknown>).efel_figures_base_url;
  return typeof base === 'string' && base ? base.replace(/\/$/, '') : null;
}

type TGithubContentEntry = { name?: unknown; type?: unknown; download_url?: unknown };

/** Keeps the image files, in the order the directory reports them. */
export function parseGithubDirectoryFigures(payload: unknown, baseUrl: string): TEFelFigure[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((entry: TGithubContentEntry) => {
    if (entry?.type !== 'file' || typeof entry.name !== 'string') return [];
    if (!IMAGE_EXTENSIONS.test(entry.name)) return [];

    return [
      {
        name: entry.name,
        label: figureLabelFromFileName(entry.name),
        // prefer the raw URL the API hands back, so a moved directory still resolves
        url:
          typeof entry.download_url === 'string' && entry.download_url
            ? entry.download_url
            : `${baseUrl}/${entry.name}`,
      },
    ];
  });
}

/**
 * Every illustration the schema's figure directory holds.
 *
 * Cached for the session: the directory is upstream documentation, not project data, and the
 * unauthenticated GitHub API is rate-limited per IP. A failure is not surfaced as an error —
 * the tab simply has nothing to show, which is also the case for a base URL that cannot be
 * enumerated.
 */
export function useEFelFigures(schema: ConfigSchema) {
  const baseUrl = efelFiguresBaseUrl(schema);
  const listingUrl = baseUrl ? githubContentsApiUrl(baseUrl) : null;

  const { data, isLoading } = useQuery({
    queryKey: ['efel-figures', listingUrl],
    queryFn: async (): Promise<TEFelFigure[]> => {
      const response = await fetch(listingUrl as string, {
        headers: { accept: 'application/vnd.github+json' },
      });
      if (!response.ok) return [];

      return parseGithubDirectoryFigures(await response.json(), baseUrl as string);
    },
    enabled: Boolean(listingUrl),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { figures: data ?? [], isLoading: Boolean(listingUrl) && isLoading, baseUrl };
}
