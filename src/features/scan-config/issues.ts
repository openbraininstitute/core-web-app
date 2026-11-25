import { isNil } from 'es-toolkit';
import { get } from 'es-toolkit/compat';

import { isAtOrBelow } from '@/features/scan-config/store';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { ErrorObject } from 'ajv';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

/** One issue of the form at a field (`/section/field`, `/section/entry/field`) or at an entry. */
export type TFieldIssue = { path: string; message: string };

/** Where an issue is in the form, and how to name it to the user. */
export type TIssueLine = TFieldIssue & {
  title: string;
  rootElement: string;
  entry: string | undefined;
  field: string | undefined;
};

const REQUIRED = 'Required';
const VARIANT_REJECTED = /^(.*\/(?:oneOf|anyOf)\/\d+)\/properties\/[^/]+\/const$/;
const WRAPPER_KEYWORDS: ReadonlySet<string> = new Set(['oneOf', 'anyOf']);

const unescapePointer = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~');
const segmentsOf = (path: string) => path.split('/').slice(1).map(unescapePointer);
const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'));

const pathOf = (error: ErrorObject) =>
  error.keyword === 'required'
    ? `${error.instancePath}/${error.params.missingProperty}`
    : error.instancePath;

/**
 * The schema errors as one issue per path. An entry is validated against every variant of its
 * `oneOf`, and each variant it is not reports errors of its own; those are dropped, by the
 * `type` constant they reject. An empty value reads "Required" whatever the schema keyword.
 */
export function fieldIssuesOf(
  errors: readonly ErrorObject[] | null | undefined,
  config: Config
): TFieldIssue[] {
  if (!errors) return [];

  const rejectedVariants = errors.flatMap((error) => {
    const variant = error.keyword === 'const' ? VARIANT_REJECTED.exec(error.schemaPath)?.[1] : null;
    return variant ? [{ schemaPrefix: `${variant}/`, owner: parentOf(error.instancePath) }] : [];
  });
  const ofChosenVariant = (error: ErrorObject) =>
    !rejectedVariants.some(
      (variant) =>
        error.schemaPath.startsWith(variant.schemaPrefix) &&
        isAtOrBelow(error.instancePath, variant.owner)
    );
  const messageAt = (path: string, error: ErrorObject) =>
    isNil(get(config, segmentsOf(path))) ? REQUIRED : (error.message ?? 'Invalid value');

  const relevant = errors.filter(ofChosenVariant);
  const issues = new Map<string, string>();
  for (const error of relevant) {
    const path = pathOf(error);
    if (!WRAPPER_KEYWORDS.has(error.keyword) && !issues.has(path)) {
      issues.set(path, messageAt(path, error));
    }
  }
  for (const error of relevant) {
    const hasIssueBelow = [...issues.keys()].some((path) => isAtOrBelow(path, error.instancePath));
    if (WRAPPER_KEYWORDS.has(error.keyword) && !hasIssueBelow) {
      issues.set(error.instancePath, messageAt(error.instancePath, error));
    }
  }

  return [...issues].map(([path, message]) => ({ path, message }));
}

/** The first issue at or below a path. */
export function issueAt(issues: readonly TFieldIssue[], path: string): string | undefined {
  return issues.find((issue) => isAtOrBelow(issue.path, path))?.message;
}

type TLooseSchema = object | undefined;

function blockSchemaOf(rootSchema: TLooseSchema, block: unknown): TLooseSchema {
  const declaredVariants: unknown =
    get(rootSchema, 'additionalProperties.oneOf') ?? get(rootSchema, 'oneOf');
  const variants: TLooseSchema[] = Array.isArray(declaredVariants) ? declaredVariants : [];
  if (variants.length === 0) return rootSchema;

  const declared: unknown = get(rootSchema, 'discriminator');
  const discriminator: string =
    typeof declared === 'string' ? declared : (get(declared, 'propertyName') ?? 'type');
  return variants.find(
    (variant) =>
      get(variant, ['properties', discriminator, 'const']) === get(block, [discriminator])
  );
}

/** The title of the deepest part of a path that has one, walking the schema's `properties`. */
function deepestTitle(blockSchema: TLooseSchema, fieldPath: string[]): string | undefined {
  let node: TLooseSchema = blockSchema;
  let title: string | undefined;
  for (const segment of fieldPath) {
    node = get(node, ['properties', segment]);
    if (!node) break;
    title = get(node, 'title') ?? title;
  }
  return title;
}

/** An issue with the section, entry and field it belongs to, named by their schema titles. */
export function issueLineOf(schema: ConfigSchema, config: Config, issue: TFieldIssue): TIssueLine {
  const [rootElement = '', ...rest] = segmentsOf(issue.path);
  const rootSchema: TLooseSchema = get(schema, ['properties', rootElement]);
  const isDictionary = get(rootSchema, 'ui_element') === ScanConfigUIElementDict.BlockDictionary;
  const entry = isDictionary ? rest[0] : undefined;
  const fieldPath = isDictionary ? rest.slice(1) : rest;
  const [field] = fieldPath;
  const block = entry === undefined ? config[rootElement] : get(config, [rootElement, entry]);
  const fieldTitle = deepestTitle(blockSchemaOf(rootSchema, block), fieldPath) ?? field;
  const where = [get(rootSchema, 'title') ?? rootElement, entry].filter(Boolean).join(', ');

  return {
    ...issue,
    title: fieldTitle ? `${where}: ${fieldTitle}` : where,
    rootElement,
    entry,
    field,
  };
}
