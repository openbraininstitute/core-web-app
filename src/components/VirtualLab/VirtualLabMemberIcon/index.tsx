import { useMemo } from 'react';
import { CheckCircleFilled, ClockCircleFilled } from '@ant-design/icons';

import colorDictionary from './availableColors';
import { Role } from '@/types/virtual-lab/members';
import { classNames } from '@/util/utils';

type Props = {
  memberRole: Role;
  firstName: string;
  lastName: string;
  inviteAccepted?: boolean;
  email?: string;
};

export default function VirtualLabMemberIcon({
  memberRole,
  firstName,
  lastName,
  inviteAccepted,
  email,
}: Props) {
  const initials = useMemo(() => {
    return inviteAccepted ? `${firstName[0]}${lastName[0]}` : email?.split('@')[0].slice(0, 1);
  }, [firstName, lastName, inviteAccepted, email]);

  const index = useMemo(() => {
    const codePoint = firstName.codePointAt(0);

    if (codePoint) {
      return codePoint % colorDictionary.length;
    }
    return 0;
  }, [firstName]);

  return (
    <div
      style={{ backgroundColor: colorDictionary[index].background }}
      className={`relative inline-flex h-[72px] w-[72px] items-center justify-center ${memberRole === 'member' ? 'rounded-full' : ''}`}
      data-testid="virtual-lab-member-icon"
    >
      {inviteAccepted ? (
        <div
          className={classNames(
            'absolute',
            memberRole === 'admin' ? 'right-0 top-0' : '-top-px right-[3px]'
          )}
        >
          <CheckCircleFilled className="p-1" style={{ mixBlendMode: 'difference' }} />
        </div>
      ) : (
        <div
          className={classNames(
            'absolute',
            memberRole === 'admin' ? 'right-0 top-0' : '-top-px right-[3px]'
          )}
        >
          <ClockCircleFilled className="p-1" style={{ mixBlendMode: 'difference' }} />
        </div>
      )}
      <span
        className="text-2xl font-bold uppercase"
        style={{ color: colorDictionary[index].color }}
        data-testid="virtual-lab-member-initials"
      >
        {initials}
      </span>
    </div>
  );
}
