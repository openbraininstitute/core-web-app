/**
 * DisplayValue — recursive, schema-agnostic renderer for Display mode.
 * Key-value pairs render as tight rows. Arrays of objects get full-width blocks.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { highlightCode } from '@/ui/molecules/code-blocks';
import { cn } from '@/utils/css-class';

import {
  detectType,
  formatBytes,
  guessCodeLanguage,
  humanizeKey,
  isCodeKey,
  isLikelyBytes,
  pickTitle,
  truncateMiddle,
  truncateUrl,
} from './format';

import type { BundledLanguage } from 'shiki';

import styles from './tool-payload.module.css';

interface DisplayValueProps {
  value: unknown;
  keyName?: string;
  depth?: number;
  /** When true, suppress the "N items" header on arrays (already shown by parent) */
  hideArrayHeader?: boolean;
}

const MAX_AUTO_EXPAND_DEPTH = 3;
const DEFAULT_VISIBLE_ITEMS = 5;

export default function DisplayValue({
  value,
  keyName,
  depth = 0,
  hideArrayHeader,
}: DisplayValueProps) {
  const type = detectType(value);

  switch (type) {
    case 'null':
      return <span className={styles.chipMuted}>—</span>;
    case 'boolean':
      return <BooleanValue value={value as boolean} />;
    case 'number':
      return <NumberValue value={value as number} keyName={keyName} />;
    case 'uuid':
      return <UuidValue value={value as string} />;
    case 'url':
      return <UrlValue value={value as string} />;
    case 'iso-date':
      return <DateValue value={value as string} />;
    case 'long-string':
      return (
        <span className={styles.longString} title={value as string}>
          {value as string}
        </span>
      );
    case 'string':
      return <StringValue value={value as string} />;
    case 'array':
      return <ArrayValue value={value as unknown[]} depth={depth} hideHeader={hideArrayHeader} />;
    case 'object':
      return <ObjectValue value={value as Record<string, unknown>} depth={depth} />;
    default:
      return <span>{String(value)}</span>;
  }
}

/* === Primitives === */

function BooleanValue({ value }: { value: boolean }) {
  return (
    <span className={cn(styles.pill, value ? styles.pillOn : styles.pillOff)}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}

function NumberValue({ value, keyName }: { value: number; keyName?: string }) {
  if (keyName && isLikelyBytes(keyName, value)) {
    return <span className={styles.bytes}>{formatBytes(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

function UuidValue({ value }: { value: string }) {
  return (
    <span className={styles.chip} title={value}>
      {truncateMiddle(value, 8, 6)}
      <CopyButton text={value} />
    </span>
  );
}

function UrlValue({ value }: { value: string }) {
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.urlLink}
      title={value}
    >
      {truncateUrl(value)}
    </a>
  );
}

function DateValue({ value }: { value: string }) {
  const formatted = useMemo(() => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }, [value]);
  return (
    <span className={styles.dateText} title={value}>
      {formatted}
    </span>
  );
}

function StringValue({ value }: { value: string }) {
  if (/^[+-]/.test(value)) {
    const dir = value[0] === '-' ? '↓' : '↑';
    const field = humanizeKey(value.slice(1));
    return (
      <span className={cn(styles.chip, styles.sortChip)}>
        <span className={styles.sortArrow}>{dir}</span>
        {field}
      </span>
    );
  }
  return <span>{value}</span>;
}

/* === Arrays === */

function ArrayValue({
  value,
  depth,
  hideHeader,
}: {
  value: unknown[];
  depth: number;
  hideHeader?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (value.length === 0) return <span className={styles.emptyPlaceholder}>Empty</span>;

  const allPrimitive = value.every((item) => item === null || typeof item !== 'object');

  if (allPrimitive) {
    // For numeric arrays or short arrays, render as a compact inline string
    const allNumeric = value.every((item) => typeof item === 'number');
    if (allNumeric || value.length > 5) {
      const maxShow = 20;
      const formatted = value
        .slice(0, maxShow)
        .map((v) =>
          typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v)
        );
      const displayed = formatted.join(', ');
      const suffix = value.length > maxShow ? `, … (${value.length})` : '';
      return (
        <span className={styles.vectorChip} title={`[${value.join(', ')}]`}>
          [{displayed}
          {suffix}]
        </span>
      );
    }
    // Short non-numeric arrays: individual chips
    return (
      <div className={styles.chipList}>
        {value.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className={styles.chip}>
            <DisplayValue value={item} depth={depth + 1} />
          </span>
        ))}
      </div>
    );
  }

  const visibleItems = showAll ? value : value.slice(0, DEFAULT_VISIBLE_ITEMS);
  const hiddenCount = value.length - DEFAULT_VISIBLE_ITEMS;

  return (
    <div className={styles.cardList}>
      {!hideHeader && <div className={styles.cardListHeader}>{value.length} items</div>}
      {visibleItems.map((item, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <ArrayItemCard key={i} item={item} index={i} depth={depth} />
      ))}
      {!showAll && hiddenCount > 0 && (
        <button type="button" className={styles.showMoreItems} onClick={() => setShowAll(true)}>
          Show {hiddenCount} more
        </button>
      )}
    </div>
  );
}

function ArrayItemCard({ item, index, depth }: { item: unknown; index: number; depth: number }) {
  const [expanded, setExpanded] = useState(false);

  if (typeof item !== 'object' || item === null) {
    return (
      <div className={styles.itemCard}>
        <DisplayValue value={item} depth={depth + 1} />
      </div>
    );
  }

  const obj = item as Record<string, unknown>;
  const titleField = pickTitle(obj);
  const title = titleField ? titleField.value : `Item ${index + 1}`;

  if (!expanded) {
    return (
      <div
        className={styles.itemCard}
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded(true);
        }}
      >
        <span className={styles.itemCardTitle}>{truncateMiddle(title, 30, 10)}</span>
        <span className={styles.expandHint}>›</span>
      </div>
    );
  }

  // Expanded: show first-level key-value pairs (no deeper nesting)
  const allEntries = Object.entries(obj);

  return (
    <div className={styles.itemCardExpanded}>
      <div
        className={styles.itemCardExpandedHeader}
        onClick={() => setExpanded(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded(false);
        }}
      >
        <span className={styles.itemCardTitle}>{truncateMiddle(title, 30, 10)}</span>
        <span className={styles.expandHintOpen}>‹</span>
      </div>
      <div className={styles.itemCardExpandedBody}>
        {allEntries.map(([k, v]) => (
          <div key={k} className={styles.itemCardExpandedRow}>
            <span className={styles.itemCardExpandedKey}>{humanizeKey(k)}</span>
            <span className={styles.itemCardExpandedValue}>
              <InlineExpandedValue value={v} keyName={k} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render values in expanded items — nested objects/arrays collapsed by default */
function InlineExpandedValue({ value, keyName }: { value: unknown; keyName?: string }) {
  const type = detectType(value);
  switch (type) {
    case 'null':
      return <span className={styles.chipMuted}>—</span>;
    case 'boolean':
      return <BooleanValue value={value as boolean} />;
    case 'number':
      if (keyName && isLikelyBytes(keyName, value as number))
        return <span>{formatBytes(value as number)}</span>;
      return <span>{String(value)}</span>;
    case 'uuid':
      return <UuidValue value={value as string} />;
    case 'url':
      return <UrlValue value={value as string} />;
    case 'iso-date':
      return <DateValue value={value as string} />;
    case 'array':
      if ((value as unknown[]).length === 0) return <span className={styles.chipMuted}>—</span>;
      return (
        <CollapsibleNested
          label={`${(value as unknown[]).length} items`}
          value={value}
          keyName={keyName}
        />
      );
    case 'object':
      if (Object.keys(value as object).length === 0)
        return <span className={styles.chipMuted}>—</span>;
      return (
        <CollapsibleNested
          label={`${Object.keys(value as object).length} fields`}
          value={value}
          keyName={keyName}
        />
      );
    default:
      return <span>{truncateMiddle(String(value), 40, 10)}</span>;
  }
}

/** A collapsed-by-default nested value that expands on click */
function CollapsibleNested({
  label,
  value,
  keyName,
}: {
  label: string;
  value: unknown;
  keyName?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button type="button" className={styles.collapsibleBtn} onClick={() => setExpanded(true)}>
        {label} ›
      </button>
    );
  }

  return (
    <div>
      <button type="button" className={styles.collapsibleBtn} onClick={() => setExpanded(false)}>
        {label} ‹
      </button>
      <DisplayValue value={value} keyName={keyName} depth={2} />
    </div>
  );
}

/* === Objects === */

function ObjectValue({ value, depth }: { value: Record<string, unknown>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < MAX_AUTO_EXPAND_DEPTH);
  const entries = Object.entries(value);

  if (entries.length === 0) return <span className={styles.emptyPlaceholder}>No data</span>;

  if (!expanded) {
    return (
      <span className={styles.collapsedObj}>
        <span className={styles.chip}>{`{…} ${entries.length} keys`}</span>
        <button type="button" className={styles.expandBtn} onClick={() => setExpanded(true)}>
          expand
        </button>
      </span>
    );
  }

  // Split entries: inline (primitives, short strings) vs block (arrays of objects, nested objects) vs code
  const inlineEntries: [string, unknown][] = [];
  const blockEntries: [string, unknown][] = [];
  const codeEntries: [string, string][] = [];

  for (const [k, v] of entries) {
    if (isCodeKey(k) && typeof v === 'string' && v.length > 0) {
      codeEntries.push([k, v]);
    } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      blockEntries.push([k, v]);
    } else if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.keys(v).length > 0
    ) {
      blockEntries.push([k, v]);
    } else if (typeof v === 'string' && v.trim() === '') {
      // Skip empty strings entirely
    } else {
      inlineEntries.push([k, v]);
    }
  }

  const content = (
    <>
      {inlineEntries.length > 0 && (
        <div className={styles.defList}>
          {inlineEntries.map(([k, v]) => (
            <div key={k} className={styles.defRow}>
              <div className={styles.defKey} title={k}>
                {humanizeKey(k)}
              </div>
              <div className={styles.defValue}>
                <DisplayValue value={v} keyName={k} depth={depth + 1} />
              </div>
            </div>
          ))}
        </div>
      )}
      {codeEntries.map(([k, v]) => (
        <div key={k} className={styles.defBlock}>
          <div className={styles.defKey}>{humanizeKey(k)}</div>
          <CodeValue code={v} language={guessCodeLanguage(k)} />
        </div>
      ))}
      {blockEntries.map(([k, v]) => {
        const isArray = Array.isArray(v);
        const count = isArray ? (v as unknown[]).length : Object.keys(v as object).length;
        const countLabel = isArray ? `${count} items` : `${count} fields`;
        return (
          <div key={k} className={styles.defBlock}>
            <span className={styles.defBlockLabel}>{humanizeKey(k)}</span>
            <span className={styles.defBlockCount}>· {countLabel}</span>
            <DisplayValue value={v} keyName={k} depth={depth + 1} hideArrayHeader={isArray} />
          </div>
        );
      })}
    </>
  );

  if (depth > 0) {
    return <div className={styles.nestedGroup}>{content}</div>;
  }

  return <>{content}</>;
}

/* === Copy button === */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      type="button"
      className={cn(styles.copyBtn, copied && styles.copyBtnDone)}
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

/* === Code block renderer === */

/**
 * Format shell/python commands for readability by inserting line breaks
 * at logical operator boundaries (&&, ||, |, ;) that are not inside quotes.
 */
function formatCodeForDisplay(code: string, language: string): string {
  if (language !== 'bash' && language !== 'python') return code;

  // For python code passed via -c flag, format the inline code
  if (language === 'bash') {
    return formatShellCommand(code);
  }

  // For direct python code blocks, add breaks at statement boundaries
  if (language === 'python') {
    return formatPythonCode(code);
  }

  return code;
}

/**
 * Format shell commands: break at &&, ||, | and ; boundaries
 * that are outside of quoted strings.
 */
function formatShellCommand(cmd: string): string {
  // If the command is short enough, don't reformat
  if (cmd.length < 60) return cmd;

  const result: string[] = [];
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let current = '';

  while (i < cmd.length) {
    const ch = cmd[i];

    // Track quote state (ignore escaped quotes)
    if (ch === "'" && !inDoubleQuote && (i === 0 || cmd[i - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote;
      current += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingleQuote && (i === 0 || cmd[i - 1] !== '\\')) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      i++;
      continue;
    }

    // Only split when outside quotes
    if (!inSingleQuote && !inDoubleQuote) {
      // Check for && or ||
      if ((cmd[i] === '&' && cmd[i + 1] === '&') || (cmd[i] === '|' && cmd[i + 1] === '|')) {
        const op = cmd.slice(i, i + 2);
        result.push(current.trimEnd());
        current = `  ${op} `;
        i += 2;
        // Skip whitespace after operator
        while (i < cmd.length && cmd[i] === ' ') i++;
        continue;
      }
      // Check for pipe (single |, not ||)
      if (cmd[i] === '|' && cmd[i + 1] !== '|') {
        result.push(current.trimEnd());
        current = '  | ';
        i++;
        while (i < cmd.length && cmd[i] === ' ') i++;
        continue;
      }
      // Check for semicolons (statement separator in shell, but NOT inside python -c strings)
      if (cmd[i] === ';' && !isInsidePythonFlag(cmd, i)) {
        current += ch;
        result.push(current.trimEnd());
        current = '';
        i++;
        while (i < cmd.length && cmd[i] === ' ') i++;
        continue;
      }
    }

    current += ch;
    i++;
  }

  if (current.trim()) {
    result.push(current);
  }

  return result.join('\n');
}

/**
 * Check if a position is inside a `python -c "..."` string argument.
 * This prevents splitting on semicolons that are Python statement separators.
 */
function isInsidePythonFlag(cmd: string, pos: number): boolean {
  // Look backwards for an unmatched quote that follows -c
  const before = cmd.slice(0, pos);
  const cFlagMatch = before.match(/-c\s+["']/);
  if (!cFlagMatch) return false;

  // Count unmatched quotes between the -c flag and current position
  const quoteChar = before[cFlagMatch.index! + cFlagMatch[0].length - 1];
  const afterFlag = before.slice(cFlagMatch.index! + cFlagMatch[0].length);
  let escaped = false;
  let open = true;
  for (const ch of afterFlag) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === quoteChar) {
      open = !open;
    }
  }
  return open; // If still open, we're inside the quoted python string
}

/**
 * Format Python code: break at top-level statement boundaries (`;`)
 * when the code is a single-line multi-statement string.
 */
function formatPythonCode(code: string): string {
  // Only format if it's a single line with semicolons (common in -c invocations)
  if (code.includes('\n') || !code.includes(';')) return code;
  if (code.length < 60) return code;

  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];

    if (ch === '\\' && (inSingleQuote || inDoubleQuote)) {
      current += ch + (code[i + 1] || '');
      i++;
      continue;
    }
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;

      // Split on semicolons only at top level
      if (ch === ';' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        statements.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.join('\n');
}

function CodeValue({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string>('');
  const mounted = useRef(false);
  const formatted = useMemo(() => formatCodeForDisplay(code, language), [code, language]);

  useEffect(() => {
    mounted.current = true;
    highlightCode(formatted, language as BundledLanguage, false)
      .then((highlighted) => {
        if (mounted.current) setHtml(highlighted);
      })
      .catch(() => {
        // Fallback: no highlighting
        if (mounted.current) setHtml('');
      });
    return () => {
      mounted.current = false;
    };
  }, [formatted, language]);

  if (!html) {
    // Fallback while loading or on error
    return (
      <pre className={styles.codeBlock}>
        <code>{formatted}</code>
      </pre>
    );
  }

  return (
    <div
      className={styles.codeBlockHighlighted}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
