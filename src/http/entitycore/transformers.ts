import map from 'lodash/map';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import identity from 'lodash/identity';
import isEmpty from 'lodash/isEmpty';

import { isOrganization, isPerson } from '@/http/entitycore/guards';
import { Filter } from '@/features/listing-filter-panel/types';
import { toDate } from '@/util/date';

import type { IContributor } from '@/http/entitycore/types/shared/global';

type TransformFiltersToQueryReturnValue = Record<
  string,
  string | Array<string> | number | Array<number> | Date | null
>;

/**
 * Transforms a user-provided search pattern using `*` as a wildcard
 * into a PostgreSQL `ILIKE`-compatible pattern.
 *
 * - Escapes existing `%` and `_` characters to prevent unintended matches.
 * - Converts `*` into `%` for wildcard searches.
 * - Returns `null` if the input is empty or falsy.
 *
 * @param {string} str - The input string containing the search pattern.
 * @returns {string | null} The transformed pattern for PostgreSQL `ILIKE`, or `null` if input is empty.
 *
 * @example
 * transformToIlikePattern("foo*bar") // "foo%bar"
 * transformToIlikePattern("%special%") // "\\%special\\%"
 * transformToIlikePattern("exact_match") // "exact\\_match"
 */
export function transformToIlikePattern(str: string) {
  if (isEmpty(str)) return null;
  return str
    .replace(/%/g, '\\%') // Escape existing `%`
    .replace(/_/g, '\\_') // Escape existing `_`
    .replace(/\*/g, '%'); // Convert `*` to `%`
}

const QUERY_FIELDS_MODIFIERS: Array<{
  field: string;
  operator?: string;
  modifier: (input: any) => any;
}> = [
  { field: 'name', operator: 'ilike', modifier: transformToIlikePattern },
  { field: 'creation_date', modifier: toDate },
  { field: 'update_date', modifier: toDate },
  { field: 'registration_date', modifier: toDate },
];

export function transformFiltersToQuery(
  filters: Array<Filter>
): TransformFiltersToQueryReturnValue {
  return filters.reduce((acc, filter) => {
    const fieldModifier = find(QUERY_FIELDS_MODIFIERS, { field: filter.field });
    const modifier = fieldModifier?.modifier ?? identity;
    const operator = fieldModifier?.operator;

    if (filter.value !== null && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
      // Case: filter.value is an object (e.g., { gte: "...", lte: "..." })
      Object.entries(filter.value).forEach(([op, val]) => {
        if (val !== null) {
          acc[`${filter.field}__${operator ?? op}`] = modifier(val);
        }
      });
    } else {
      // Case: Primitive or Array
      const fieldKey = operator ? `${filter.field}__${operator}` : filter.field;
      acc[fieldKey] = modifier(filter.value);
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
    name: isPerson(agent)
      ? `${agent.givenName} ${agent.familyName}`
      : isOrganization(agent)
        ? agent.pref_label
        : '',
    type: isOrganization(agent) ? 0 : 1, // 0 for Org, 1 for Person
  }));

  return map(sortBy(processedAgents, ['type', 'name']), 'name').join(', ');
}
