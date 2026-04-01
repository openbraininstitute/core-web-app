'use client';

import {
  type LocationValue,
  parseLocationSummary,
  summarizeLocation,
} from '@/ui/segments/contribute/multiple/adapters/cell-morphology/location-editor';

export {
  type IParsedContributionCsvEntry as ParsedContributionCsvEntry,
  type IParsedContributionCsvValue as ParsedContributionCsvValue,
  parseContributionCsvValue,
} from '@/features/entity-import/core/shared/contribution-csv-parser';

export interface IParsedLocationCsvValue {
  rawValue: string;
  parsedValue: LocationValue | null;
  issues: Array<string>;
}

const LOCATION_TUPLE_ERROR = 'Location must be provided as a tuple in the form (x, y, z).';

export function parseLocationCsvValue(rawValue: string): IParsedLocationCsvValue {
  const normalized = rawValue.trim();
  if (!normalized) {
    return {
      rawValue: '',
      parsedValue: null,
      issues: [],
    };
  }

  const parsedSummary = parseLocationSummary(normalized);
  if (parsedSummary) {
    return {
      rawValue: summarizeLocation(parsedSummary),
      parsedValue: parsedSummary,
      issues: [],
    };
  }

  const tupleMatch = normalized.match(/^\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)$/);
  if (!tupleMatch) {
    return {
      rawValue: normalized,
      parsedValue: null,
      issues: [LOCATION_TUPLE_ERROR],
    };
  }

  const [x, y, z] = tupleMatch.slice(1).map((part) => Number(part.trim()));
  if ([x, y, z].some((value) => Number.isNaN(value))) {
    return {
      rawValue: normalized,
      parsedValue: null,
      issues: [LOCATION_TUPLE_ERROR],
    };
  }

  const parsedValue = { x, y, z };
  return {
    rawValue: summarizeLocation(parsedValue),
    parsedValue,
    issues: [],
  };
}
