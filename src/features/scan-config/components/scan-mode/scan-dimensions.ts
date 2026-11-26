import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  type ConfigValue,
  isType,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

/**
 * How a config's scanned fields combine. `grid`: every combination of their values runs.
 * `coupled`: they are stepped through together, the first value of each, then the second, so
 * every one holds the same number of values.
 */
export const ScanMode = { Grid: 'grid', Coupled: 'coupled' } as const;
export type TScanMode = (typeof ScanMode)[keyof typeof ScanMode];

/** The fewest values a coupled scan steps through; one value is no scan. */
export const MIN_COUPLED_SIZE = 2;

type TPath = readonly (string | number)[];

/** One scanned field: a list where the schema also takes a single value. */
export interface IScanDimension {
  /** Where the list sits in the config: root, entry (in a dictionary), field, then inside it. */
  path: TPath;
  root: string;
  /** The dictionary entry holding it; empty for a block with a form of its own. */
  entry: string;
  /** The block as the list of blocks names it. */
  owner: string;
  /** The field's title, with where in the field for a list nested in it. */
  label: string;
  values: readonly unknown[];
  /** Number fields, which can be left empty for now; a model or a filter cannot. */
  blankable: boolean;
}

/** Field types that hold their lists inside an object, or a list of objects (obi-one's ComplexVariableHolder). */
const HOLDERS: ReadonlySet<string> = new Set([
  ScanConfigUIElementDict.VoltageDuration,
  ScanConfigUIElementDict.IonChannelVariableModificationByNeuron,
  ScanConfigUIElementDict.ionChannelVariableModificationBySectionList,
]);

function isNumberOrBlank(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

/** A field the schema lets be one value or a list of them. */
function takesOneOrSeveral(paramSchema: unknown): boolean {
  const branches = isPlainObject(paramSchema as ConfigValue)
    ? (paramSchema as { anyOf?: unknown }).anyOf
    : undefined;
  if (!Array.isArray(branches)) return false;
  const types = branches.map((branch) => (branch as { type?: unknown } | null)?.type);
  return types.includes('array') && types.some((type) => type !== 'array' && type !== 'null');
}

/** The schema of `block` among those its root element allows. */
function blockSchemaOf(rootSchema: unknown, block: Record<string, ConfigValue>) {
  const root = rootSchema as {
    properties?: Record<string, unknown>;
    oneOf?: unknown[];
    additionalProperties?: { oneOf?: unknown[] };
  };
  const variants = root.additionalProperties?.oneOf ?? root.oneOf;
  if (!variants) return root;
  return variants.find(
    (variant) =>
      (variant as { properties?: { type?: { const?: unknown } } }).properties?.type?.const ===
      block.type
  ) as { properties?: Record<string, unknown> } | undefined;
}

function titleOf(schema: unknown, fallback: string): string {
  const title = (schema as { title?: unknown } | undefined)?.title;
  return typeof title === 'string' && title ? title : fallback;
}

/** The lists inside a holder's value: every list of numbers, as obi-one reads them. */
function nestedLists(value: unknown, path: TPath, found: { path: TPath; values: unknown[] }[]) {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isNumberOrBlank)) found.push({ path, values: value });
    else for (const [i, item] of value.entries()) nestedLists(item, [...path, i], found);
    return;
  }
  if (isPlainObject(value as ConfigValue)) {
    for (const [key, item] of Object.entries(value as object)) {
      nestedLists(item, [...path, key], found);
    }
  }
}

function blockDimensions(
  block: unknown,
  rootSchema: unknown,
  at: { root: string; entry: string; owner: string }
): IScanDimension[] {
  if (!isPlainObject(block as ConfigValue)) return [];
  const fields = block as Record<string, ConfigValue>;
  const properties = blockSchemaOf(rootSchema, fields)?.properties;
  if (!properties) return [];
  const base: TPath = at.entry ? [at.root, at.entry] : [at.root];

  return Object.entries(fields).flatMap(([field, value]): IScanDimension[] => {
    const paramSchema = properties[field];
    if (!paramSchema || field === 'type') return [];
    const label = titleOf(paramSchema, field);
    const element = (paramSchema as { ui_element?: unknown }).ui_element;

    if (typeof element === 'string' && HOLDERS.has(element)) {
      const found: { path: TPath; values: unknown[] }[] = [];
      nestedLists(value, [...base, field], found);
      return found.map((list) => ({
        ...at,
        path: list.path,
        // "Voltage levels · 1 · voltage": positions counted from one
        label: [label, ...list.path.slice(base.length + 1)]
          .map((part) => (typeof part === 'number' ? part + 1 : part))
          .join(' · '),
        values: list.values,
        blankable: true,
      }));
    }

    if (!Array.isArray(value) || !takesOneOrSeveral(paramSchema)) return [];
    return [
      {
        ...at,
        path: [...base, field],
        label,
        values: value,
        blankable: value.every(isNumberOrBlank),
      },
    ];
  });
}

/** Every scanned field of a config, in the order of the schema's root elements. */
export function scanDimensions(config: Config, schema: ConfigSchema): IScanDimension[] {
  return Object.entries(schema.properties).flatMap(([root, rootSchema]) => {
    if (isType(rootSchema)) return [];
    const value = config[root];
    const owner = titleOf(rootSchema, root);

    if (
      'ui_element' in rootSchema &&
      rootSchema.ui_element === ScanConfigUIElementDict.BlockDictionary
    ) {
      if (!isPlainObject(value)) return [];
      return Object.entries(value).flatMap(([entry, block]) =>
        blockDimensions(block, rootSchema, { root, entry, owner: entry })
      );
    }
    return blockDimensions(value, rootSchema, { root, entry: '', owner });
  });
}

/** Configurations a grid scan runs: every combination. */
export function gridSize(dimensions: readonly IScanDimension[]): number {
  return dimensions.reduce((size, dimension) => size * dimension.values.length, 1);
}

/** Configurations a coupled scan runs: the longest list's length, which the others are brought to. */
export function coupledSize(dimensions: readonly IScanDimension[]): number {
  return dimensions.reduce((size, dimension) => Math.max(size, dimension.values.length), 0);
}

function getIn(value: unknown, path: TPath): unknown {
  return path.reduce<unknown>((at, key) => (at as Record<string | number, unknown>)?.[key], value);
}

/** `value` with what sits at `path` replaced, copying only what lies on the way there. */
function setIn<T>(value: T, path: TPath, replacement: unknown): T {
  if (path.length === 0) return replacement as T;
  const [key, ...rest] = path;
  if (Array.isArray(value)) {
    return value.with(key as number, setIn(value[key as number], rest, replacement)) as T;
  }
  const object = value as Record<string, unknown>;
  return { ...object, [key]: setIn(object[key as string], rest, replacement) } as T;
}

function resized(dimension: IScanDimension, size: number): unknown[] | null {
  const { values, blankable } = dimension;
  if (values.length > size) return values.slice(0, size);
  if (values.length < size && blankable) {
    return [...values, ...Array<null>(size - values.length).fill(null)];
  }
  return null;
}

/**
 * The config with every scanned field at `size` values: longer lists lose their last values,
 * shorter number lists gain empty ones. Lists that cannot hold an empty value (models, filters,
 * sets of neuron ids) are left short, for the user to fill.
 */
export function withCoupledSize(config: Config, schema: ConfigSchema, size: number): Config {
  let result = config;
  for (const dimension of scanDimensions(config, schema)) {
    const values = resized(dimension, size);
    if (values) result = setIn(result, dimension.path, values);
  }
  return result;
}

/** The config with its scanned fields level: all as long as the longest. */
export function coupled(config: Config, schema: ConfigSchema): Config {
  const size = coupledSize(scanDimensions(config, schema));
  return size === 0 ? config : withCoupledSize(config, schema, size);
}

const pathKey = (path: TPath) => JSON.stringify(path);

/** Where `after` is `before` less one value: the first place they differ. */
function removedIndex(before: readonly unknown[], after: readonly unknown[]): number {
  const at = after.findIndex((value, i) => JSON.stringify(value) !== JSON.stringify(before[i]));
  return at === -1 ? after.length : at;
}

/**
 * A coupled config after an edit. A value removed from one field is removed at the same place
 * from the others, since a place is one configuration; then the fields are levelled, so a value
 * added to one opens an empty one in the rest.
 */
export function coupledAfterEdit(previous: Config, next: Config, schema: ConfigSchema): Config {
  if (previous === next) return next;
  const before = new Map(scanDimensions(previous, schema).map((d) => [pathKey(d.path), d]));
  const after = scanDimensions(next, schema);

  const changed = after.filter((d) => {
    const was = before.get(pathKey(d.path));
    return was !== undefined && was.values.length !== d.values.length;
  });
  const [shrunk] = changed;
  const was = shrunk && before.get(pathKey(shrunk.path));

  let result = next;
  if (changed.length === 1 && was && was.values.length - shrunk.values.length === 1) {
    const index = removedIndex(was.values, shrunk.values);
    for (const dimension of after) {
      if (dimension === shrunk || dimension.values.length <= index) continue;
      if (dimension.values.length <= 1) continue;
      result = setIn(result, dimension.path, dimension.values.toSpliced(index, 1));
    }
  }
  return coupled(result, schema);
}

/**
 * Back from coupled to grid: the empty values levelling added at the end of number lists are
 * dropped, down to the two a scan opens with.
 */
export function withoutTrailingBlanks(config: Config, schema: ConfigSchema): Config {
  let result = config;
  for (const dimension of scanDimensions(config, schema)) {
    if (!dimension.blankable) continue;
    let length = dimension.values.length;
    while (length > MIN_COUPLED_SIZE && dimension.values[length - 1] === null) length -= 1;
    if (length !== dimension.values.length) {
      result = setIn(result, dimension.path, dimension.values.slice(0, length));
    }
  }
  return result;
}

/** What `dimension` holds in `config` now; for callers that kept a dimension across edits. */
export function valuesAt(config: Config, dimension: IScanDimension): unknown {
  return getIn(config, dimension.path);
}
