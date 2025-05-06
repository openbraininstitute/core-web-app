import map from 'lodash/map';
import sortBy from 'lodash/sortBy';
import isEmpty from 'lodash/isEmpty';

import { Filter } from '@/features/listing-filter-panel/types';

import type { IContributor } from '@/api/entitycore/types/shared/global';

type TransformFiltersToQueryReturnValue = Record<
  string,
  string | Array<string> | number | Array<number> | Date | null
>;

/**
 * transforms a user-provided search pattern using `*` as a wildcard
 * into a PostgreSQL `ILIKE`-compatible pattern.
 *
 * - Escapes existing `%` characters to prevent unintended matches.
 * - Converts `*` into `%` for wildcard searches.
 * - Returns `null` if the input is empty or falsy.
 *
 * @param {string} str - The input string containing the search pattern.
 * @returns {string | null} The transformed pattern for PostgreSQL `ILIKE`, or `null` if input is empty.
 *
 * @example
 * transformToIlikePattern("foo*bar") // "foo%bar"
 * transformToIlikePattern("%special%") // "\\%special\\%"
 */
export function transformToIlikePattern(str: string) {
  if (isEmpty(str)) return null;
  return str
    .replace(/%/g, '\\%') // Escape existing `%`
    .replace(/\*/g, '%'); // Convert `*` to `%`
}

/**
 * Transforms query parameters that end with "__in" from arrays to comma-separated strings.
 *
 * @param {Record<string, any>} queryParams -  query parameters object to transform
 * @returns {Record<string, any>}  transformed query parameters object
 *
 * @example
 * // input: { "contribution_perf_label__in": ["A", "B", "C"],  }
 * // output: { "contribution_perf_label__in": "A,B,C", }
 */
export function transformQueryParamsArrayToString(
  queryParams: Record<string, any>
): Record<string, any> {
  const transformedParams: Record<string, any> = {};

  for (const [key, value] of Object.entries(queryParams)) {
    if (key.endsWith('__in') && Array.isArray(value)) {
      transformedParams[key] = value.join(',');
    } else {
      transformedParams[key] = value;
    }
  }

  return transformedParams;
}

/**
 * transforms an array of filters into a query object for API requests.
 * Uses the constraint field to determine the query parameter names.
 *
 * @param {Array<Filter>} filters - The filters to transform
 * @returns {TransformFiltersToQueryReturnValue} The transformed query object
 */
export function transformFiltersToQuery(
  filters: Array<Filter>
): TransformFiltersToQueryReturnValue {
  return filters.reduce((acc, filter) => {
    // Skip filters with null values
    if (filter.value === null) {
      return acc;
    }

    // handle different value types with their constraints
    if (filter.value !== null && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
      // case: filter.value is an object (e.g., { gte: "...", lte: "..." })
      Object.entries(filter.value).forEach(([op, val]) => {
        if (val !== null) {
          // If constraint is an object with matching keys (e.g., { gte: "creation_date__gte" })
          if (filter.constraint && typeof filter.constraint === 'object') {
            const constraintObj = filter.constraint as Record<string, string>;
            if (op in constraintObj) {
              const constraintKey = constraintObj[op];
              // Apply transformToIlikePattern for ilike constraints
              if (typeof val === 'string' && constraintKey.endsWith('__ilike')) {
                acc[constraintKey] = transformToIlikePattern(val);
              } else if (val instanceof Date) {
                acc[constraintKey] = val.toISOString();
              } else {
                acc[constraintKey] = val;
              }
            }
          }
          // if constraint is a string, append the operation (e.g., "creation_date__gte")
          else if (filter.constraint && typeof filter.constraint === 'string') {
            const constraintKey = `${filter.constraint}__${op}`;
            // Apply transformToIlikePattern for ilike constraints
            if (typeof val === 'string' && constraintKey.endsWith('__ilike')) {
              acc[constraintKey] = transformToIlikePattern(val);
            } else if (val instanceof Date) {
              acc[constraintKey] = val.toISOString();
            } else {
              acc[constraintKey] = val;
            }
          }
        }
      });
    } else if (Array.isArray(filter.value)) {
      // case: Array values (e.g., CheckList)
      if (filter.value.length > 0 && filter.constraint && typeof filter.constraint === 'string') {
        acc[filter.constraint] = filter.value;
      }
    } else {
      // case: Primitive value (string, number, etc.)
      if (filter.value !== '' && filter.constraint && typeof filter.constraint === 'string') {
        const constraintKey = filter.constraint;
        // apply transformToIlikePattern for ilike constraints
        if (typeof filter.value === 'string' && constraintKey.endsWith('__ilike')) {
          acc[constraintKey] = transformToIlikePattern(filter.value);
        } else {
          acc[constraintKey] = filter.value;
        }
      }
    }

    return acc;
  }, {} as TransformFiltersToQueryReturnValue);
}

export function transformAgentToNames(
  agentsWithRoles: Array<IContributor> | undefined | null
): string {
  if (!agentsWithRoles) {
    return '';
  }
  const agents = map(agentsWithRoles, 'agent');
  const processedAgents = map(agents, (agent) => ({
    // eslint-disable-next-line no-nested-ternary
    name:
      agent.type === 'person'
        ? // ? `${agent.givenName} ${agent.familyName}`
          agent.pref_label
        : agent.type === 'organization'
          ? agent.pref_label
          : '',
    type: agent.type === 'organization' ? 0 : 1, // 0 for Org, 1 for Person
  }));

  return map(sortBy(processedAgents, ['type', 'name']), 'name').join('\n');
}

export function buildBrainRegionFilterQuery(
  brainRegionUrl?: string | null,
  hierarchyName: string = 'aibs',
  includeAscendants: boolean = true
) {
  // if (!brainRegionUrl) return undefined;
  const hierarchyId = Number(brainRegionUrl?.split('/').pop() ?? 997);
  return `${hierarchyId},${hierarchyName},${String(includeAscendants)}`;
}
