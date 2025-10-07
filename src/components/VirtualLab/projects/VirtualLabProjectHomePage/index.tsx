'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import sortBy from 'es-toolkit/compat/sortBy';

import WelcomeUserBanner from '@/components/VirtualLab/VirtualLabHomePage/WelcomeUserBanner';
import MemberAvatar from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { ProjectDetailBanner } from '@/components/VirtualLab/VirtualLabBanner';

import {
  virtualLabProjectDetailsAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { useAppNotification } from '@/components/notification';
import { useLoadableValue, useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { extractInitials } from '@/util/slugify';

type UsersHorizontalListProps = {
  virtualLabId: string;
  projectId?: string;
};

export function UsersHorizontalList({ virtualLabId, projectId }: UsersHorizontalListProps) {
  const notification = useAppNotification();

  const users = useLoadableValue(
    projectId
      ? virtualLabProjectUsersAtomFamily({ virtualLabId, projectId })
      : virtualLabMembersAtomFamily(virtualLabId)
  );

  if (users.state === 'loading') {
    return <Spin indicator={<LoadingOutlined />} />;
  }

  if (users.state === 'hasData') {
    return (
      <div className="flex-no-wrap horizontal-thin-scrollbar flex items-center gap-4 overflow-x-auto overflow-y-hidden pb-4">
        {users.data?.data?.users &&
          sortBy(users.data?.data?.users, ['role']).map((user, indx) => {
            return (
              <MemberAvatar
                key={user.id ?? user.email}
                index={indx}
                layout="vertical"
                id={user.id ?? user.email}
                email={user.email}
                role={user.role}
                status={user.invite_accepted ? 'accept' : 'pending'}
                name={user.id ? `${user.first_name} ${user.last_name}` : user.email}
                initials={extractInitials(
                  user.id ? `${user.first_name} ${user.last_name}` : user.email
                )}
                cls={{ text: 'text-white font-light wrap-text' }}
              />
            );
          })}
      </div>
    );
  }
  if (users.state === 'hasError') {
    notification.error({
      message: 'Something went wrong when fetching users',
      placement: 'topRight',
    });
  }

  return null;
}

export default function VirtualLabProjectHomePage({
  virtualLabId,
  projectId,
}: UsersHorizontalListProps) {
  const projectDetails = useUnwrappedValue(
    virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId: projectId! })
  );

  if (projectDetails) {
    return (
      <div>
        <WelcomeUserBanner title={projectDetails.name} />
        <ProjectDetailBanner
          createdAt={projectDetails.created_at}
          description={projectDetails.description}
          name={projectDetails.name}
          projectId={projectId!}
          virtualLabId={virtualLabId}
        />
        <div>
          <div className="my-10 text-lg font-bold uppercase">Members</div>
          <UsersHorizontalList virtualLabId={virtualLabId} projectId={projectId} />
        </div>
      </div>
    );
  }
  return null;
}
