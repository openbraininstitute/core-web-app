import map from 'lodash/map';
import sortBy from 'lodash/sortBy';

import { isOrganization, isPerson } from '@/http/entitycore/guards';
import { Filter } from '@/components/Filter/types';
import { toDate } from '@/util/date';

import type { IContributor } from '@/http/entitycore/types/shared/global';

const DATE_FIELDS = new Set(['creation_date', 'update_date', 'registration_date']);

const SPECIAL_FIELDS: Record<string, string> = {
  name: 'name__ilike',
};

type TransformFiltersToQueryReturnValue = Record<
  string,
  string | Array<string> | number | Array<number> | Date | null
>;

export const transformFiltersToQuery = (filters: Filter[]): TransformFiltersToQueryReturnValue => {
  return filters.reduce((acc, filter) => {
    const fieldKey = SPECIAL_FIELDS[filter.field] || filter.field;

    if (filter.value !== null && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
      Object.entries(filter.value).forEach(([operator, val]) => {
        if (val !== null) {
          acc[`${fieldKey}__${operator}`] = DATE_FIELDS.has(filter.field)
            ? toDate(val.toString())
            : val;
        }
      });
    } else if (filter.value !== null) {
      acc[fieldKey] = DATE_FIELDS.has(filter.field)
        ? toDate(filter.value.toString())
        : filter.value;
    }

    return acc;
  }, {} as TransformFiltersToQueryReturnValue);
};

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
