import { Button, Checkbox, ConfigProvider, Empty, List } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { SearchOutlined } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSession } from 'next-auth/react';
import { unwrap } from 'jotai/utils';
import compact from 'es-toolkit/compat/compact';
import isEmpty from 'es-toolkit/compat/isEmpty';
import reject from 'es-toolkit/compat/reject';
import find from 'es-toolkit/compat/find';
import get from 'es-toolkit/compat/get';

import CreateEntityModal from '@/components/VirtualLab/create-entity-flows/common/modal';
import { useAppNotification } from '@/components/notification';

import { MemberAvatarCasual } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { Select, Input } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { attachUsersToProject } from '@/api/virtual-lab-svc/queries/project';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { Member, Role } from '@/api/virtual-lab-svc/queries/types';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

type AddMembersProps = {
  query?: string;
  users: Array<Member>;
  selectedMembers: Array<Member>;
  onSelect: (record: Member) => (e: CheckboxChangeEvent) => void;
  onRoleChange: (record: Member, role: Role) => void;
};
type ProjectContext = { virtualLabId: string; projectId: string };

export function useFilteredMembers(members: Member[], query: string) {
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const filtered = useMemo(() => {
    if (!deferredQuery) return members;

    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(deferredQuery) ||
        member.username.toLowerCase().includes(deferredQuery)
    );
  }, [members, deferredQuery]);

  return filtered;
}

export function AddMembers({
  query,
  users,
  selectedMembers,
  onSelect,
  onRoleChange,
}: AddMembersProps) {
  return (
    <ConfigProvider
      renderEmpty={() => (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            isEmpty(query) ? (
              <div className="text-primary-9 font-light">
                <div>No members found within your virtual lab</div>
                <div>Please add some in the virtual lab team page</div>
              </div>
            ) : (
              <div className="text-primary-9 font-light">
                <div>
                  No members found match <span className="font-bold">{query}</span>
                </div>
              </div>
            )
          }
        />
      )}
    >
      <List
        size="large"
        header={null}
        footer={null}
        dataSource={users}
        className="border-0"
        rowKey={(record) => record.id}
        renderItem={(record, indx) => {
          const name = record.id
            ? compact([get(record, 'first_name'), get(record, 'last_name')]).join(' ') ||
              get(record, 'username') ||
              record.email
            : record.email;
          return (
            <List.Item className="w-full !px-0">
              <div className="flex w-full items-center justify-center gap-4">
                <div className="flex w-full items-center gap-2">
                  <Checkbox
                    title={record.name ?? record.username}
                    id={record.id}
                    value={record.id}
                    defaultChecked={false}
                    checked={find(selectedMembers, { id: record.id }) !== undefined}
                    onChange={onSelect(record)}
                  />
                  <MemberAvatarCasual
                    withEmail
                    shape={record.role === 'admin' ? 'square' : 'circle'}
                    pending={false}
                    key={`vlab-avatar-${record.id ?? record.email}`}
                    index={indx}
                    size="small"
                    layout="horizontal"
                    id={record.id ?? record.email}
                    email={record.email}
                    role={record.role}
                    name={name}
                    initials={extractInitials(name)}
                    cls={{
                      text: classNames(
                        'text-primary-8 wrap-text',
                        record.invite_accepted ? 'font-bold' : 'font-light'
                      ),
                    }}
                  />
                </div>
                <div className="ml-auto flex content-end items-center justify-center">
                  <div className="">
                    <Select
                      defaultValue={record.role}
                      placeholder="Select a role"
                      className={classNames(
                        'border-primary-8 min-w-36 !border',
                        'focus:border-primary-8 w-40 shadow-none ring-0 focus:border-2',
                        '[&_.ant-select-selector]:rounded-none [&_.ant-select-selector]:!border-0'
                      )}
                      onSelect={(value: Role) => {
                        onRoleChange(record, value);
                      }}
                      options={[
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Administrator' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    </ConfigProvider>
  );
}

type Props = {
  context: ProjectContext;
  isOpen: boolean;
  onClose: () => void;
};

export default function AddMembersModal({ context, isOpen, onClose }: Props) {
  const { data } = useSession();
  const notify = useAppNotification();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchValue] = useState('');
  const [membersList, updateMembersList] = useState<Array<Member>>([]);
  const refreshAtom = useSetAtom(
    virtualLabProjectUsersAtomFamily({
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
    })
  );
  const [loading, setLoading] = useState(false);
  const usersAtom = virtualLabMembersAtomFamily(context.virtualLabId);
  const result = useAtomValue(useMemo(() => unwrap(usersAtom), [usersAtom]));
  const users = reject(
    result?.data?.users,
    (user) =>
      user.id === result?.data?.owner_id ||
      user.id === data?.user.id ||
      user.invite_accepted === false
  );
  const filteredUsers = useFilteredMembers(users, searchQuery);

  const onSelectUser = (record: Member) => (e: CheckboxChangeEvent) => {
    const { checked } = e.target;
    if (checked) {
      updateMembersList((prev) => [...prev, record]);
    } else {
      const filteredList = reject(membersList, { id: record.id });
      updateMembersList(filteredList);
    }
  };

  const onRoleChange = (record: Member, role: Role) => {
    updateMembersList((prev) => {
      const existingMember = find(prev, { id: record.id });
      if (existingMember) {
        return prev.map((member) =>
          member.id === existingMember.id ? { ...member, role } : member
        );
      }
      return [...prev, { ...record, role }];
    });
  };

  const handleSearchClick = () => {
    setIsSearchVisible((prev) => !prev);
    if (isSearchVisible) {
      setSearchValue('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const onAttachUsers = async () => {
    setLoading(true);
    const { data: resultAttachment, error } = await tryCatch(
      attachUsersToProject({
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        users: membersList.map((user) => ({
          email: user.email,
          role: user.role,
          id: user.id,
        })),
      }),
      () => {
        setLoading(false);
      },
      {
        section: 'virtual-lab-project',
        feature: 'attach-users-to-project',
        extra: { 'virtual-lab-id': context.virtualLabId, 'project-id': context.projectId },
      }
    );

    if (error || !resultAttachment) {
      notify.error({
        message: 'Failed to add users to the current project',
        placement: 'topRight',
        key: 'attach-users',
      });
      return;
    }
    notify.success({
      message: 'Users added successfully to the current project',
      placement: 'topRight',
      key: 'attach-users',
    });
    updateMembersList([]);
    refreshAtom();
    onClose();
  };

  return (
    <CreateEntityModal
      isOpen={isOpen}
      footer={null}
      onClose={onClose}
      cls={{ content: 'min-h-[46rem]!' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-primary-8 text-xl font-bold">Add new members to project</h1>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={classNames(
              'transition-all duration-300 ease-in-out',
              isSearchVisible ? 'w-60 opacity-100' : 'w-0 opacity-0'
            )}
            style={{ visibility: isSearchVisible ? 'visible' : 'hidden' }}
            disabled={!users.length || loading}
          />
          <Button
            type="text"
            icon={<SearchOutlined className="text-primary-8 text-xl" />}
            onClick={handleSearchClick}
            className="!p-1"
            disabled={!users.length || loading}
          />
        </div>
      </div>

      <div className="flex h-full flex-grow flex-col rounded-lg bg-white">
        <div
          data-testid="all-users-list"
          className="mx-auto h-full w-full max-w-5xl flex-grow bg-white"
        >
          <div className="secondary-scrollbar flex h-[450px] flex-grow flex-col overflow-y-auto">
            <div className="w-full pr-4">
              <AddMembers
                query={searchQuery}
                users={filteredUsers}
                selectedMembers={membersList}
                onSelect={onSelectUser}
                onRoleChange={onRoleChange}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto flex items-end justify-end gap-3">
        <Button
          key="cancel-members-btn"
          className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
          type="text"
          size="large"
          htmlType="button"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          key="invite-btn"
          data-testid="invite-btn"
          className="border-primary-8 bg-primary-8 h-14 rounded-none px-10 text-white hover:!text-white"
          type="default"
          size="large"
          htmlType="button"
          onClick={onAttachUsers}
          loading={loading}
          disabled={!membersList.length || loading}
        >
          Submit
        </Button>
      </div>
    </CreateEntityModal>
  );
}
