import type { EntityExpandParam } from '@/api/entitycore/types/entities/derivation';

/**
 * entitycore `expand` values (openbraininstitute/entitycore#751): optional fields returned only
 * when requested, sent as repeated `expand=` params. An unrequested field is absent, not `null`.
 */

/** Generic: accepted by every entity endpoint (`EntityExpand`); the default until a type has its own. */
export type TAnyEntityExpandParam = EntityExpandParam;

/** Cell morphology and EM cell mesh (`MeasurableEntityExpand`): adds `measurement_annotation`. */
export type TMeasurableEntityExpandParam = TAnyEntityExpandParam | 'measurement_annotation';
