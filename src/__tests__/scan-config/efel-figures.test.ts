import { describe, expect, it } from 'vitest';

import {
  efelFiguresBaseUrl,
  figureLabelFromFileName,
  githubContentsApiUrl,
  parseGithubDirectoryFigures,
} from '@/features/scan-config/components/ui-elements/select-efeatures-by-protocol/efel-figures';

import type { ConfigSchema } from '@/features/scan-config/types';

/** What obi-one's `EModelEFeatureExtractionScanConfig` actually declares. */
const FIGURES_BASE_URL =
  'https://raw.githubusercontent.com/openbraininstitute/eFEL/master/docs/source/_static/figures';

describe('githubContentsApiUrl', () => {
  it('turns the declared raw directory into the contents API call that lists it', () => {
    expect(githubContentsApiUrl(FIGURES_BASE_URL)).toBe(
      'https://api.github.com/repos/openbraininstitute/eFEL/contents/docs/source/_static/figures?ref=master'
    );
  });

  it('tolerates a trailing slash', () => {
    expect(githubContentsApiUrl(`${FIGURES_BASE_URL}/`)).toBe(
      githubContentsApiUrl(FIGURES_BASE_URL)
    );
  });

  it('returns null for a host it cannot enumerate, rather than guessing file names', () => {
    expect(githubContentsApiUrl('https://docs.example.org/figures')).toBeNull();
    expect(githubContentsApiUrl('https://raw.githubusercontent.com/openbraininstitute')).toBeNull();
    expect(githubContentsApiUrl('not a url')).toBeNull();
  });
});

describe('parseGithubDirectoryFigures', () => {
  // the six the directory really holds, each covering a family of features
  const payload = [
    { name: 'AHP.png', type: 'file', download_url: `${FIGURES_BASE_URL}/AHP.png` },
    {
      name: 'AP_Amplitude.png',
      type: 'file',
      download_url: `${FIGURES_BASE_URL}/AP_Amplitude.png`,
    },
    { name: 'inv_ISI.png', type: 'file' },
    { name: 'README.md', type: 'file', download_url: `${FIGURES_BASE_URL}/README.md` },
    { name: 'nested', type: 'dir' },
  ];

  it('keeps the image files and drops everything else', () => {
    expect(parseGithubDirectoryFigures(payload, FIGURES_BASE_URL).map((f) => f.name)).toEqual([
      'AHP.png',
      'AP_Amplitude.png',
      'inv_ISI.png',
    ]);
  });

  it('prefers the API download url and falls back to the declared base', () => {
    const figures = parseGithubDirectoryFigures(payload, FIGURES_BASE_URL);

    expect(figures[0]?.url).toBe(`${FIGURES_BASE_URL}/AHP.png`);
    expect(figures[2]?.url).toBe(`${FIGURES_BASE_URL}/inv_ISI.png`);
  });

  it('returns nothing for a payload that is not a directory listing', () => {
    expect(parseGithubDirectoryFigures({ message: 'Not Found' }, FIGURES_BASE_URL)).toEqual([]);
    expect(parseGithubDirectoryFigures(null, FIGURES_BASE_URL)).toEqual([]);
  });
});

describe('figureLabelFromFileName', () => {
  it('reads the file name as the caption', () => {
    expect(figureLabelFromFileName('AP_Amplitude.png')).toBe('AP Amplitude');
    expect(figureLabelFromFileName('voltage_features.png')).toBe('voltage features');
    expect(figureLabelFromFileName('sag.png')).toBe('sag');
  });
});

describe('efelFiguresBaseUrl', () => {
  it('reads the root schema key and normalises the trailing slash', () => {
    const schema = { efel_figures_base_url: `${FIGURES_BASE_URL}/` } as unknown as ConfigSchema;
    expect(efelFiguresBaseUrl(schema)).toBe(FIGURES_BASE_URL);
  });

  it('returns null when the schema declares none', () => {
    expect(efelFiguresBaseUrl({} as ConfigSchema)).toBeNull();
  });
});
