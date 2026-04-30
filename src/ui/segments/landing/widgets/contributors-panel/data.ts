import { CONTRIBUTORS_LIST, type ContributorProps } from '@/constants/home/contributors-list';

export type Contributor = ContributorProps;

function sortContributors(c1: Contributor, c2: Contributor) {
  const l1 = c1.last_name.toUpperCase();
  const l2 = c2.last_name.toUpperCase();
  if (l1 < l2) return -1;
  if (l1 > l2) return +1;

  const f1 = c1.full_name.toUpperCase();
  const f2 = c2.full_name.toUpperCase();
  if (f1 < f2) return -1;
  if (f1 > f2) return +1;
  return 0;
}

const SORTED_CONTRIBUTORS: Contributor[] = [...CONTRIBUTORS_LIST].sort(sortContributors);

export function useContributors(): Contributor[] {
  return SORTED_CONTRIBUTORS;
}
