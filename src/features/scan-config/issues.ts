import { isNil } from 'es-toolkit';
import { get } from 'es-toolkit/compat';

import { isAtOrBelow } from '@/features/scan-config/store';

import type { ErrorObject } from 'ajv';
import type { Config, TFieldIssue } from '@/features/scan-config/types';

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
