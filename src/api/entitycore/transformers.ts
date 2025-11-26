import isEmpty from 'es-toolkit/compat/isEmpty';
import sortBy from 'es-toolkit/compat/sortBy';
import omit from 'es-toolkit/compat/omit';
import map from 'es-toolkit/compat/map';

import { AgentType, type Agent, type IContributor } from '@/api/entitycore/types/shared/global';
import type { CoreFilter } from '@/entity-configuration/definitions/types';

type TransformFiltersToQueryReturnValue = Record<
  string,
  string | Array<string> | number | Array<number> | Date | null | boolean
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
function transformToIlikePattern(str: string) {
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
 * @deprecated See release notes: https://github.com/openbraininstitute/entitycore/releases/tag/2025.7.2
 * @example
 * // input: { "contribution_perf_label__in": ["A", "B", "C"],  }
 * // output: { "contribution_perf_label__in": "A,B,C", }
 */
export function transformQueryParamsListToServerString(
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
 * @param {Array<CoreFilter>} filters - The filters to transform
 * @returns {TransformFiltersToQueryReturnValue} The transformed query object
 */
export function transformFiltersToQuery(
  filters: Array<CoreFilter>
): TransformFiltersToQueryReturnValue {
  return filters.reduce((acc, filter) => {
    // Skip filters with null values
    if (filter.value === null) {
      return acc;
    }

    // handle different value types with their constraints
    if (typeof filter.value === 'object' && !Array.isArray(filter.value)) {
      // case: filter.value is an object (e.g., { gte: "...", lte: "..." })
      Object.entries(filter.value).forEach(([op, val]) => {
        if (val !== null && filter.constraint) {
          // If constraint is an object with matching keys (e.g., { gte: "creation_date__gte" })
          if (typeof filter.constraint === 'object') {
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
          else if (typeof filter.constraint === 'string') {
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
    } else if (filter.value !== '' && filter.constraint && typeof filter.constraint === 'string') {
      // case: Primitive value (string, number, etc.)
      const constraintKey = filter.constraint;
      // apply transformToIlikePattern for ilike constraints
      if (typeof filter.value === 'string' && constraintKey.endsWith('__ilike')) {
        acc[constraintKey] = transformToIlikePattern(filter.value);
      } else {
        acc[constraintKey] = filter.value;
      }
    }

    return acc;
  }, {} as TransformFiltersToQueryReturnValue);
}

export function transformAgentToNames(
  agentsWithRoles: Array<IContributor> | undefined | null,
  asArray: boolean = false
): string | Array<string> {
  if (!agentsWithRoles) {
    return '';
  }
  const agents = map(agentsWithRoles, 'agent');
  const processedAgents = map(agents, (agent) => ({
    // eslint-disable-next-line no-nested-ternary
    name: resolveAgentName(agent),
    type: agent.type === 'organization' ? 0 : 1, // 0 for Org, 1 for Person
  }));

  return asArray
    ? map(sortBy(processedAgents, ['type', 'name']), 'name')
    : map(sortBy(processedAgents, ['type', 'name']), 'name').join(';\n');
}

function resolveAgentName(agent: Agent) {
  switch (agent.type) {
    case AgentType.Person:
    case AgentType.Organization:
      return agent.pref_label;
    default:
      return '';
  }
}

export function discardBrainRegionQueryParams(filters?: Record<string, any>) {
  return omit(filters, [
    'within_brain_region_hierarchy_id',
    'within_brain_region_brain_region_id',
    'within_brain_region_direction',
  ]);
}
