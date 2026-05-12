/* eslint-disable react/no-array-index-key */
import React from 'react';

import { styleBlockMedium } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import TeamMember from './team-member';

import type { ContentForMember } from '@/services/sanity/api/get-members';
import type { Group } from './types';

import styles from './company-members.module.css';

interface WidgetCompanyMembersProps {
  className?: string;
  data: ContentForMember[];
  group: Group;
}

const SPECS: Record<
  Group,
  {
    group: 'board' | 'executiveBoard' | 'team';
    sort?: (member1: ContentForMember, member2: ContentForMember) => number;
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
  if (lastName1 > lastName2) return 1;
  const firstName1 = member1.firstName.toLowerCase();
  const firstName2 = member2.firstName.toLowerCase();
  if (firstName1 < firstName2) return -1;
  if (firstName1 > firstName2) return 1;
  return 0;
}

function splitArray(members: ContentForMember[], split: number | undefined): ContentForMember[][] {
  return split ? [members.slice(0, split), members.slice(split)] : [members];
}

export function WidgetCompanyMembers({ className, data, group }: WidgetCompanyMembersProps) {
  const specs = SPECS[group];
  const members = data
    .filter((member) => member.group === specs.group)
    .sort(specs.sort ?? orderByIndex);
  const blocs = splitArray(members, specs.split);
  const small = specs.small === true;

  return (
    <div className={classNames(className, styles.people, styleBlockMedium)}>
      {blocs.map((bloc, index) => (
        <div key={index} className={styles.board}>
          {bloc.map((member) => (
            <TeamMember
              key={`${member.firstName}/${member.lastName}`}
              big={!small}
              value={member}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
