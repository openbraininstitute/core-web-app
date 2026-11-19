// Code highlighting for saved files (artifact tabs and file cards): Shiki, the VS Code grammars.
// Loaded on first use (dynamic import: nothing in the main bundle), with Shiki's JavaScript regex
// engine (no 470 KB WASM), one theme, and only the grammar the file needs. The editor's own code
// blocks keep the small synchronous tokenizer (highlight.ts): ProseMirror decorations cannot wait.
import { isNil } from 'es-toolkit';

import type { HighlighterCore, LanguageInput, ThemedToken } from 'shiki/core';

interface IGrammar {
  readonly id: string;
  readonly load: LanguageInput; // a getter: the grammar loads only when asked
}

const python: IGrammar = { id: 'python', load: () => import('shiki/langs/python.mjs') };
const shell: IGrammar = { id: 'shellscript', load: () => import('shiki/langs/shellscript.mjs') };
const json: IGrammar = { id: 'json', load: () => import('shiki/langs/json.mjs') };
const yaml: IGrammar = { id: 'yaml', load: () => import('shiki/langs/yaml.mjs') };
const javascript: IGrammar = { id: 'javascript', load: () => import('shiki/langs/javascript.mjs') };
const typescript: IGrammar = { id: 'typescript', load: () => import('shiki/langs/typescript.mjs') };

// By extension. A new language is one line here.
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
// Past this size the text shows plain: TextMate grammars cost about linear time per character,
// and a data dump that large is not read as code.
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

// The tokens of each line, or null when the file shows plain (no grammar, or too large).
export async function highlightLines(text: string, name: string): Promise<ThemedToken[][] | null> {
  const grammar = GRAMMARS[extensionOf(name)];
  if (isNil(grammar) || text.length > HIGHLIGHT_MAX_CHARS) return null;
  const shiki = await highlighter();
  if (!shiki.getLoadedLanguages().includes(grammar.id)) await shiki.loadLanguage(grammar.load);
  return shiki.codeToTokensBase(text, { lang: grammar.id, theme: THEME });
}
