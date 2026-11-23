import { isNotNil } from 'es-toolkit';
import { match, P } from 'ts-pattern';

import { TokenKind } from '@/features/logbook/types';

import type { IToken } from '@/features/logbook/types';

const KEYWORDS = new Set(
  'def import from for in return as if else elif with while class and or not None True False lambda try except'.split(
    ' '
  )
);
const TOKEN = /(#.*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

export function tokenize(line: string): IToken[] {
  const tokens: IToken[] = [];
  let at = 0;
  for (const found of line.matchAll(TOKEN)) {
    const index = found.index;
    if (index > at) tokens.push({ kind: TokenKind.Text, text: line.slice(at, index), from: at });
    const [text, comment, string, number, word] = found;
    const kind = match({ comment, string, number, word })
      .with({ comment: P.string.minLength(1) }, () => TokenKind.Comment)
      .with({ string: P.string.minLength(1) }, () => TokenKind.String)
      .with({ number: P.string.minLength(1) }, () => TokenKind.Number)
      .with({ word: P.when((w) => isNotNil(w) && KEYWORDS.has(w)) }, () => TokenKind.Keyword)
      .otherwise(() => TokenKind.Text);
    tokens.push({ kind, text, from: index });
    at = index + text.length;
  }
  if (at < line.length) tokens.push({ kind: TokenKind.Text, text: line.slice(at), from: at });
  return tokens;
}
