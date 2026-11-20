// Shiki for saved files, loaded on first use with the JS regex engine (no WASM).
// Editor code blocks use highlight.ts instead: decorations can't wait.
import { isNil } from 'es-toolkit';

import type { HighlighterCore, ThemedToken } from 'shiki/core';
import type { IGrammar } from '@/features/logbook/types';

const python: IGrammar = { id: 'python', load: () => import('shiki/langs/python.mjs') };
const shell: IGrammar = { id: 'shellscript', load: () => import('shiki/langs/shellscript.mjs') };
const json: IGrammar = { id: 'json', load: () => import('shiki/langs/json.mjs') };
const yaml: IGrammar = { id: 'yaml', load: () => import('shiki/langs/yaml.mjs') };
const javascript: IGrammar = { id: 'javascript', load: () => import('shiki/langs/javascript.mjs') };
const typescript: IGrammar = { id: 'typescript', load: () => import('shiki/langs/typescript.mjs') };

// By file extension.
const GRAMMARS: Readonly<Record<string, IGrammar>> = {
  py: python,
  sh: shell,
  bash: shell,
  json,
  ipynb: json,
  yaml,
  yml: yaml,
  js: javascript,
  mjs: javascript,
  ts: typescript,
  toml: { id: 'toml', load: () => import('shiki/langs/toml.mjs') },
  r: { id: 'r', load: () => import('shiki/langs/r.mjs') },
  jl: { id: 'julia', load: () => import('shiki/langs/julia.mjs') },
  m: { id: 'matlab', load: () => import('shiki/langs/matlab.mjs') },
};

export const THEME = 'github-light';
// Past this size, show plain: grammars cost linear time and nobody reads that as code.
export const HIGHLIGHT_MAX_CHARS = 200_000;

export const extensionOf = (name: string): string =>
  /\.([^./]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';

let core: Promise<HighlighterCore> | null = null;

function highlighter(): Promise<HighlighterCore> {
  core ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
    ]);
    return createHighlighterCore({
      themes: [import('shiki/themes/github-light.mjs')],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  })().catch((error: unknown) => {
    core = null; // a failed load (offline) is tried again next time
    throw error;
  });
  return core;
}

// null: show plain (no grammar, or too large).
export async function highlightLines(text: string, name: string): Promise<ThemedToken[][] | null> {
  const grammar = GRAMMARS[extensionOf(name)];
  if (isNil(grammar) || text.length > HIGHLIGHT_MAX_CHARS) return null;
  const shiki = await highlighter();
  if (!shiki.getLoadedLanguages().includes(grammar.id)) await shiki.loadLanguage(grammar.load);
  return shiki.codeToTokensBase(text, { lang: grammar.id, theme: THEME });
}
