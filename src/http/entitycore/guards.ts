import type { IOrganization, IPerson } from '@/http/entitycore/types/shared/global';

export function isOrganization(agent: unknown): agent is IOrganization {
  return (
    typeof agent === 'object' && agent !== null && 'pref_label' in agent && !('givenName' in agent)
  );
}

export function isPerson(agent: unknown): agent is IPerson {
  return (
    typeof agent === 'object' && agent !== null && 'givenName' in agent && 'familyName' in agent
  );
}
