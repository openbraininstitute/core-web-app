import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import type { ConfigValue } from '../types';

export type Primitive = null | boolean | number | string;

type TNumericBounds = {
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  /** true when the schema actually offers an array branch, i.e. the value may be swept */
  allowMultiple: boolean;
};

function readBound(schema: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = schema?.[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Numeric bounds for a `float_parameter_sweep` / `int_parameter_sweep` field.
 *
 * A sweepable field is declared `float | list[float]` and arrives as an `anyOf` pair, but the same
 * ui_element is also used for plain, non-sweepable numbers (the extraction stimulus timings), which
 * have no `anyOf` at all. Reading `anyOf[0]` directly throws on those, so the bare schema is used
 * as the fallback and sweeping is offered only when an array branch really exists.
 */
export function numericSchemaBounds(paramSchema: unknown): TNumericBounds {
  const schema = isPlainObject(paramSchema)
    ? (paramSchema as unknown as Record<string, unknown>)
    : undefined;
  const branches = Array.isArray(schema?.anyOf)
    ? (schema.anyOf as Array<Record<string, unknown>>)
    : undefined;

  const numeric = branches?.find(
    (branch) => branch?.type === 'number' || branch?.type === 'integer'
  );
  const source = numeric ?? schema;

  return {
    min: readBound(source, 'minimum'),
    max: readBound(source, 'maximum'),
    exclusiveMin: readBound(source, 'exclusiveMinimum'),
    exclusiveMax: readBound(source, 'exclusiveMaximum'),
    allowMultiple: Boolean(branches?.some((branch) => branch?.type === 'array')),
  };
}

export function isPlainObject(value: unknown): value is Record<string, ConfigValue> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

const simExecStatusListOrdered = [
  ActivityStatus.CREATED,
  ActivityStatus.PENDING,
  ActivityStatus.RUNNING,
  ActivityStatus.DONE,
  ActivityStatus.ERROR,
];

export function getLatestSimExecStatus(remoteStatus: ActivityStatus, localStatus: ActivityStatus) {
  const remoteStatusIdx = simExecStatusListOrdered.indexOf(remoteStatus);
  const localStatusIdx = simExecStatusListOrdered.indexOf(localStatus);

  const latestStatus = Math.max(remoteStatusIdx, localStatusIdx);

  return simExecStatusListOrdered[latestStatus];
}

export const LEGACY_SIMULATION_ERROR_CODE = 'LEGACY_SIMULATION_ERROR';
export const SCAN_CONFIG_ERRORS = {
  [LEGACY_SIMULATION_ERROR_CODE]: {
    title: 'Configuration is not available',
    message: 'Configuration currently not viewable for historic simulations',
  },
};
