// One regex highlighter, Python-ish, for every language.
import type { TValueOf } from '@/api/logbook/types';

export const TokenKind = {
  Comment: 'comment',
  String: 'string',
  Number: 'number',
  Keyword: 'keyword',
  Text: 'text',
} as const;
export type TTokenKind = TValueOf<typeof TokenKind>;

export interface IToken {
  readonly kind: TTokenKind;
  readonly text: string;
  readonly from: number;
}

const KEYWORDS = new Set(
  'def import from for in return as if else elif with while class and or not None True False lambda try except'.split(
    ' '
  )
);
const TOKEN = /(#.*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

export function tokenize(line: string): IToken[] {
  const tokens: IToken[] = [];
  let at = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index;
    if (index > at) tokens.push({ kind: TokenKind.Text, text: line.slice(at, index), from: at });
    const [text, comment, string, number, word] = match;
    const kind = comment
      ? TokenKind.Comment
      : string
        ? TokenKind.String
        : number
          ? TokenKind.Number
          : word && KEYWORDS.has(word)
            ? TokenKind.Keyword
            : TokenKind.Text;
    tokens.push({ kind, text, from: index });
    at = index + text.length;
  }
  if (at < line.length) tokens.push({ kind: TokenKind.Text, text: line.slice(at), from: at });
  return tokens;
}
