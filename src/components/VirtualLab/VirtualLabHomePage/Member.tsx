import VirtualLabMemberIcon from '../VirtualLabMemberIcon';
import { Role } from '@/types/virtual-lab/members';

type Props = {
  name: string;
  firstName: string;
  lastName: string;
  memberRole: Role;
  inviteAccepted?: boolean;
  email?: string;
};

export default function Member({
  name,
  firstName,
  lastName,
  memberRole,
  inviteAccepted,
  email,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 text-center">
      <VirtualLabMemberIcon
        firstName={firstName}
        lastName={lastName}
        memberRole={memberRole}
        inviteAccepted={inviteAccepted}
        email={email}
      />
      <div className="text-nowrap font-bold">{inviteAccepted ? name : email}</div>
      {/* Commenting out since feature is not present yet */}
      {/* <div className="text-primary-3">Active {lastActive}</div> */}
    </div>
  );
}
