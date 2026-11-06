import { type TViewVariant, ViewVariant } from '@/constants';
import {
  detailViewPanelBorderClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type JsonObject = { [key: string]: Json };

function isObject(value: Json): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** objects, and arrays holding objects or arrays, get their own section; the rest is one line */
function isNested(value: Json) {
  if (isObject(value)) return Object.keys(value).length > 0;
  return Array.isArray(value) && value.some((item) => typeof item === 'object' && item !== null);
}

const MAX_ARRAY_ITEMS = 10;

function moreItems(count: number) {
  return `(+${count - MAX_ARRAY_ITEMS} more)`;
}

function formatLeaf(value: Json): string {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const shown = value.slice(0, MAX_ARRAY_ITEMS).map(formatLeaf).join(', ');
    return value.length > MAX_ARRAY_ITEMS ? `${shown}, ${moreItems(value.length)}` : shown;
  }
  if (isObject(value)) return '{}';
  return String(value);
}

/** `neuron_sets` -> `Neuron sets` */
function humanize(key: string) {
  const text = key.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function keyClass(variant: TViewVariant) {
  return variant === ViewVariant.Default ? 'text-primary-3' : 'text-neutral-4';
}

/**
 * Read-only rendering of any JSON value as nested sections in one column: leaves are key/value
 * rows, objects and arrays of objects are collapsible sections titled by their key. Arrays show
 * their first ten items.
 */
export function JsonView({ value, variant }: { value: Json; variant: TViewVariant }) {
  return (
    <div className="font-mono text-sm">
      <Node value={value} variant={variant} depth={0} />
    </div>
  );
}

function Node({ value, variant, depth }: { value: Json; variant: TViewVariant; depth: number }) {
  const entries: Array<[string, Json]> = isObject(value)
    ? Object.entries(value)
    : Array.isArray(value)
      ? value.slice(0, MAX_ARRAY_ITEMS).map((item, index) => [String(index), item])
      : [];
  const leaves = entries.filter(([, item]) => !isNested(item));
  const nested = entries.filter(([, item]) => isNested(item));

  return (
    <div className={cn('flex flex-col', depth === 0 ? 'gap-6' : 'gap-3')}>
      {leaves.length > 0 && (
        <dl className="grid grid-cols-[minmax(8rem,max-content)_1fr] gap-x-8 gap-y-1.5">
          {leaves.map(([key, item]) => (
            <div key={key} className="contents">
              <dt className={keyClass(variant)}>{humanize(key)}</dt>
              <dd className={cn('break-all', detailViewValueClass(variant))}>{formatLeaf(item)}</dd>
            </div>
          ))}
        </dl>
      )}
      {nested.map(([key, item]) => (
        <details
          key={key}
          open
          className={cn(
            depth === 0 ? 'rounded-2xl border p-5' : 'border-l pl-4',
            detailViewPanelBorderClass(variant)
          )}
        >
          <summary
            className={cn(
              'cursor-pointer font-bold [[open]>&]:mb-3',
              depth === 0 ? 'text-base' : 'text-sm',
              detailViewValueClass(variant)
            )}
          >
            <h3 className="inline">{humanize(key)}</h3>
          </summary>
          <Node value={item} variant={variant} depth={depth + 1} />
        </details>
      ))}
      {Array.isArray(value) && value.length > MAX_ARRAY_ITEMS && (
        <div className={keyClass(variant)}>{moreItems(value.length)}</div>
      )}
    </div>
  );
}
