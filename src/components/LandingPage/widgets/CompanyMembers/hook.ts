import React from 'react';

import { ContentForMember, useSanityContentForMembers } from '../../content';
import { Group } from './types';

export function useMembersBlocs(group: Group) {
  const [data, setData] = React.useState<{
    blocs: ContentForMember[][];
    small: boolean;
  }>({
    blocs: [],
    small: false,
  });
  const allMembers = useSanityContentForMembers();
  React.useEffect(() => {
    const specs = SPECS[group];
    const members = allMembers
      .filter((member) => member.group === specs.group)
      .sort(specs.sort ?? orderByIndex);
    setData({
      blocs: splitArray(members, specs.split),
      small: specs.small === true,
    });
  }, [group, allMembers]);
  return data;
}

const SPECS: Record<
  Group,
  {
    group: 'board' | 'executiveBoard' | 'team';
    sort?: (member1: ContentForMember, member2: ContentForMember) => -1 | 0 | 1;
    split?: number;
    small?: boolean;
  }
> = {
  memberBoard: {
    group: 'board',
    split: 2,
  },
  memberExecutiveBoard: {
    group: 'executiveBoard',
  },
  memberTeam: {
    group: 'team',
    sort: orderByName,
    small: true,
  },
};

function orderByIndex(member1: ContentForMember, member2: ContentForMember) {
  return (member1.order ?? 0) - (member2.order ?? 0);
}

function orderByName(member1: ContentForMember, member2: ContentForMember) {
  const lastName1 = member1.lastName.toLowerCase();
  const lastName2 = member2.lastName.toLowerCase();
  if (lastName1 < lastName2) return -1;
  if (lastName1 > lastName2) return +1;
  const firstName1 = member1.firstName.toLowerCase();
  const firstName2 = member2.firstName.toLowerCase();
  if (firstName1 < firstName2) return -1;
  if (firstName1 > firstName2) return +1;
  return 0;
}

function splitArray(members: ContentForMember[], split: number | undefined): ContentForMember[][] {
  return split ? [members.slice(0, split), members.slice(split)] : [members];
}
