/**
 * DisplayValue — recursive, schema-agnostic renderer for Display mode.
 * Key-value pairs render as tight rows. Arrays of objects get full-width blocks.
 */
import { useCallback, useMemo, useState } from 'react';

import { cn } from '@/utils/css-class';

import {
  detectType,
  formatBytes,
  humanizeKey,
  isLikelyBytes,
  pickTitle,
  truncateMiddle,
  truncateUrl,
} from './format';

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
const MAX_SUMMARY_FIELDS = 3;

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

  const summaryEntries = Object.entries(obj)
    .filter(([k]) => k !== titleField?.key)
    .slice(0, MAX_SUMMARY_FIELDS);

  return (
    <div className={styles.itemCard}>
      <span className={styles.itemCardTitle}>
        {titleField?.key === 'id' ? truncateMiddle(title, 10, 8) : title}
      </span>
      <span className={styles.itemCardSummary}>
        {summaryEntries.map(([k, v]) => {
          if (Array.isArray(v)) {
            return (
              <span key={k} className={styles.itemCardSummaryField}>
                <span className={styles.itemCardSummaryLabel}>{humanizeKey(k)}:</span>
                <span className={styles.expandableCount}>{v.length}</span>
              </span>
            );
          }
          return (
            <span key={k} className={styles.itemCardSummaryField}>
              <span className={styles.itemCardSummaryLabel}>{humanizeKey(k)}:</span>
              <InlineSummaryValue value={v} keyName={k} />
            </span>
          );
        })}
      </span>
    </div>
  );
}

function InlineSummaryValue({ value, keyName }: { value: unknown; keyName?: string }) {
  const type = detectType(value);
  switch (type) {
    case 'null':
      return <span className={styles.chipMuted}>—</span>;
    case 'boolean':
      return <span>{(value as boolean) ? 'Yes' : 'No'}</span>;
    case 'number':
      if (keyName && isLikelyBytes(keyName, value as number))
        return <span>{formatBytes(value as number)}</span>;
      return <span>{String(value)}</span>;
    case 'uuid':
      return <span>{truncateMiddle(value as string, 6, 4)}</span>;
    case 'url':
      return <span>{truncateUrl(value as string, 30)}</span>;
    default:
      return <span>{truncateMiddle(String(value), 20, 10)}</span>;
  }
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

  // Split entries: inline (primitives, short strings) vs block (arrays of objects, nested objects with arrays)
  const inlineEntries: [string, unknown][] = [];
  const blockEntries: [string, unknown][] = [];

  for (const [k, v] of entries) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      blockEntries.push([k, v]);
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
      {blockEntries.map(([k, v]) => {
        const arr = v as unknown[];
        return (
          <div key={k} className={styles.defBlock}>
            <span className={styles.defBlockLabel}>{humanizeKey(k)}</span>
            <span className={styles.defBlockCount}>· {arr.length} items</span>
            <DisplayValue value={v} keyName={k} depth={depth + 1} hideArrayHeader />
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
