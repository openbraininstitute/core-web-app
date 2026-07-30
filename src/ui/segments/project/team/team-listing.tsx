'use client';

import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { compact, get, sortBy } from 'es-toolkit/compat';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { RoleModifier } from '@/ui/segments/project/team/role-modifier';
import { extractInitials } from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { Member, MembersResponse } from '@/api/virtual-lab-svc/queries/types';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';

export function ListingMembers({
  onAddMemberClick,
  list,
}: {
  onAddMemberClick: () => void;
  list: MembersResponse;
}) {
  const { data } = useSession();
  const { virtualLabId, projectId } = useWorkspace();
  const { virtualLabAdmins, projectAdmins, virtualLabOwnerId, isLoading } = useWorkspaceMembership({
    virtualLabId,
    projectId,
  });

  const ownerId = list?.data?.owner_id;
  const total = list?.data?.total;
  const users = list?.data?.users;

  const orderedUsers = useMemo(
    () =>
      sortBy(users, [
        (member) => (member.id === ownerId ? 0 : 1),
        (member) => (member.id === data?.user.id ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'admin' ? 0 : 1),
        (member) => (member.invite_accepted && member.role === 'member' ? 0 : 1),
        (member) => (member.invite_accepted ? 0 : 1),
        'created_at',
      ]),
    [users, ownerId, data?.user.id]
  );

  const columns: Array<SimpleColumn<Member>> = [
    {
      id: 'name',
      header: '',
      width: { width: 400 },
      renderCell: (record) => (
        <div className="flex w-max items-center justify-center">
          <MemberAvatarCasual
            withEmail
            isOwner={ownerId === record.id || virtualLabAdmins?.includes(record.id)}
            shape={record.role === 'admin' ? 'square' : 'circle'}
            key={`project-avatar-${record.id ?? record.email}`}
            index={orderedUsers.indexOf(record)}
            size="small"
            layout="horizontal"
            id={record.id ?? record.email}
            email={record.email}
            role={record.role}
            pending={!record.invite_accepted}
            name={
              record.id
                ? compact([get(record, 'first_name'), get(record, 'last_name')]).join(' ') ||
                  get(record, 'username') ||
                  record.email
                : record.email
            }
            initials={extractInitials(
              record.id
                ? compact([get(record, 'first_name'), get(record, 'last_name')]).join(' ') ||
                    get(record, 'username') ||
                    record.email
                : record.email
            )}
            cls={{
              text: cn(
                'text-white  wrap-text',
                record.invite_accepted ? 'font-bold' : 'font-light'
              ),
              pending: cn(
                '[&_.avatar-email]:text-primary-9!',
                '[&_.avatar-role]:text-primary-8!',
                '[&_.avatar-icon]:text-primary-9!'
              ),
            }}
            pendingIcon={{
              envelop: '#d9d9d9',
              halfCircle: '#002766',
            }}
          />
        </div>
      ),
    },
    {
      id: 'role',
      header: '',
      align: 'right',
      width: { width: 250 },
      renderCell: (record) => {
        if (isLoading) return <LoadingOutlined />;
        return (
          <RoleModifier
            virtualLabOwnerId={virtualLabOwnerId}
            virtualLabAdmins={virtualLabAdmins}
            projectAdmins={projectAdmins}
            user={record}
          />
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in flex h-full w-full flex-col pr-4 pl-8">
      <div className="flex w-full items-center justify-between px-3">
        <div className="flex h-8 justify-center gap-2">
          <span className="text-primary-9 text-lg font-bold capitalize">members</span>

          {total && (
            <Badge variant="outline" className="text-neutral-4 py-1 text-lg font-bold">
              {total}
            </Badge>
          )}
        </div>
        <div className="mt-auto flex flex-shrink-0 items-center justify-end">
          <Button
            rounded
            borderless
            key="add-member"
            data-testid="add-member-btn"
            type="button"
            variant="success"
            size="md"
            className="px-6 md:h-10 lg:h-12"
            onClick={onAddMemberClick}
          >
            <div className="flex items-center justify-between gap-12 font-bold">
              <span>Add member</span>
              <PlusOutlined className="ml-auto text-sm text-current" />
            </div>
          </Button>
        </div>
      </div>
      <div className="secondary-scrollbar h-full grow overflow-y-auto py-5 pr-3">
        <SimpleGrid<Member>
          columns={columns}
          rows={orderedUsers}
          getRowId={(record) => record.id ?? record.email}
          hideHeader
          className={cn(
            'h-full w-full',
            // faithfully reproduce antd's transparent, borderless table so the
            // parent panel background shows through (avatars set their own colors)
            '[&_.ag-root-wrapper]:border-0 [&_.ag-root-wrapper]:bg-transparent!',
            '[&_.ag-row]:border-0 [&_.ag-row]:bg-transparent!',
            '[&_.ag-cell]:bg-transparent!'
          )}
        />
      </div>
    </div>
  );
}
