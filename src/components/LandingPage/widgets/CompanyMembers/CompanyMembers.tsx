import { classNames } from '@/util/utils';

import { styleBlockMedium } from '../../styles';
import { useMembersBlocs } from './hook';
import TeamMember from './TeamMember';

import type { Group } from './types';

import styles from './CompanyMembers.module.css';

interface WidgetCompanyMembersProps {
  className?: string;
  group: Group;
}

export function WidgetCompanyMembers({ className, group }: WidgetCompanyMembersProps) {
  const { blocs, small } = useMembersBlocs(group);

  return (
    <div className={classNames(className, styles.people, styleBlockMedium)}>
      {blocs.map((members, index) => (
        <div key={index} className={styles.board}>
          {members.map((member) => (
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
