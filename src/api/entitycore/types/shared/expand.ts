import type { EntityExpandParam } from '@/api/entitycore/types/entities/derivation';

/**
 * entitycore `expand` values (openbraininstitute/entitycore#751): optional fields returned only
 * when requested, sent as repeated `expand=` params. An unrequested field is absent, not `null`.
 *
 * - {@link EntityExpandParam}: every entity read (`EntityExpand` / `<Schema>ReadExpand` enums).
 * - {@link TMeasurableEntityExpandParam}: cell morphology and EM cell mesh reads
 *   (`MeasurableEntityExpand`), which add `measurement_annotation`.
 */
export type { EntityExpandParam };

export type TMeasurableEntityExpandParam = EntityExpandParam | 'measurement_annotation';

/** Any value some endpoint accepts; for code spanning every entity type (e.g. the registry). */
export type TAnyEntityExpandParam = EntityExpandParam | TMeasurableEntityExpandParam;

/** `expand` as the API client's `queryParams` takes it (a mutable array; `undefined` is dropped). */
export function toExpandQueryParam(expand?: ReadonlyArray<string>): Array<string> | undefined {
  return expand && [...expand];
}
