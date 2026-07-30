/**
 * RawJson — syntax-colored pretty-printed JSON with copy button.
 * Uses a hand-rolled tokenizer (no external deps).
 * The outer scrollable container is provided by the parent (payloadContent).
 */
import { useCallback, useState } from 'react';

import { cn } from '@/utils/css-class';

import styles from './tool-payload.module.css';

interface RawJsonProps {
  value: unknown;
}

export default function RawJson({ value }: RawJsonProps) {
  const [copied, setCopied] = useState(false);

  const json = formatJson(value);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(json).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [json]);

  return (
    <div className={styles.rawContainer}>
      <pre className={styles.rawPre}>
        <ColoredJson text={json} />
      </pre>
      <button
        type="button"
        className={cn(styles.rawCopyBtn, copied && styles.copyBtnDone)}
        onClick={handleCopy}
        aria-label="Copy JSON"
      >
        {copied ? '✓' : '⎘'}
      </button>
    </div>
  );
}

function formatJson(value: unknown): string {
  try {
    if (typeof value === 'string') {
      return JSON.stringify(JSON.parse(value), null, 2);
    }
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Simple JSON syntax colorizer via regex tokenization.
 */
function ColoredJson({ text }: { text: string }) {
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((token, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} className={token.className}>
          {token.text}
        </span>
      ))}
    </>
  );
}

interface Token {
  text: string;
  className?: string;
}

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|(\s+)/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex iteration pattern
  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: json.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ text: match[1], className: styles.jsonKey });
      const rest = json.slice(match.index + match[1].length);
      const colonMatch = rest.match(/^(\s*:)/);
      if (colonMatch) {
        tokens.push({ text: colonMatch[1], className: styles.jsonPunct });
        regex.lastIndex = match.index + match[1].length + colonMatch[1].length;
      }
    } else if (match[2] !== undefined) {
      tokens.push({ text: match[2], className: styles.jsonString });
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], className: styles.jsonNumber });
    } else if (match[4] !== undefined) {
      tokens.push({ text: match[4], className: styles.jsonBool });
    } else if (match[5] !== undefined) {
      tokens.push({ text: match[5], className: styles.jsonNull });
    } else if (match[6] !== undefined) {
      tokens.push({ text: match[6], className: styles.jsonPunct });
    } else if (match[7] !== undefined) {
      tokens.push({ text: match[7] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < json.length) {
    tokens.push({ text: json.slice(lastIndex) });
  }

  return tokens;
}
