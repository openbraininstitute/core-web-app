import { useState } from 'react';
import { Button, ConfigProvider, Select } from 'antd';
import { MailOutlined, PlusOutlined } from '@ant-design/icons';
import { useSetAtom } from 'jotai';

import { Footer } from './Footer';
import { addMember, removeMember } from './utils';
import { useInviteHandler } from './hooks';
import { Member } from './types';
import { NewMember } from './NewMember';

import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { Role } from '@/types/virtual-lab/members';

interface InviteProjectMemberProps {
  members: Member[];
  onChange(members: Member[]): void;
  onClose(this: void): void;
}

export function InviteProjectMember({ onClose, members, onChange }: InviteProjectMemberProps) {
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const [editMode, setEditMode] = useState(() => true);

  const refreshProjectUsers = useSetAtom(
    virtualLabProjectUsersAtomFamily({
      virtualLabId: virtualLabId ?? null,
      projectId: projectId ?? null,
    })
  );
  const { loading, handleInvite } = useInviteHandler('project', members, () => {
    refreshProjectUsers();
    setEditMode(false);
    onClose();
    onChange([]);
  });

  return (
    <ConfigProvider
      theme={{
        components: {
          Select: {
            colorBorder: 'rgba(255, 255, 255, 0)',
            colorText: '#002766',
          },
          Form: {
            labelColor: '#003A8C',
          },
          Input: {
            colorText: '#003A8C',
          },
        },
      }}
    >
      <div className="mt-5">
        <PendingInvitations members={members} onChange={onChange} />
        {(editMode || !members.length) && (
          <div className="mb-4">
            <NewMember
              onCancel={() => setEditMode(false)}
              onOK={(member: Member) => {
                setEditMode(false);
                onChange(addMember(members, member));
              }}
            />
          </div>
        )}
        <div className="mt-8">
          <AddMemberButton onClick={() => setEditMode(true)} />
        </div>
        <div className="mt-8">
          <Footer loading={loading} members={members} onClose={onClose} onInvite={handleInvite} />
        </div>
      </div>
    </ConfigProvider>
  );
}

function AddMemberButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="primary"
      htmlType="submit"
      onClick={onClick}
      className="flex w-[200px] flex-row items-center justify-between rounded-none border-neutral-2 bg-transparent py-6 text-primary-8"
    >
      <span>Add member</span>
      <PlusOutlined />
    </Button>
  );
}

function PendingInvitations({
  members,
  onChange,
}: {
  members: Member[];
  onChange: (members: Member[]) => void;
}) {
  return (
    <div className="mb-8">
      {members.map((member) => (
        <div
          key={member.email}
          className="mb-4 flex w-full flex-wrap items-center gap-4 whitespace-nowrap font-normal text-dark"
        >
          <div className="back-black flex h-12 w-12 items-center justify-center bg-primary-8 text-white">
            <MailOutlined />
          </div>
          <b className="flex-1">{member.email}</b>
          <Select
            defaultValue={member.role}
            value={member.role}
            placeholder="Choose role..."
            className="w-40 rounded-none border border-gray-400 shadow-none focus:shadow-none [&_.ant-select-selector]:!border-none"
            onChange={(role: Role) =>
              onChange(
                addMember(members, {
                  email: member.email,
                  role,
                })
              )
            }
          >
            <Select.Option value="admin">Administrator</Select.Option>
            <Select.Option value="member">Member</Select.Option>
          </Select>
          <Button
            htmlType="button"
            type="text"
            onClick={() => onChange(removeMember(members, member))}
            aria-label="Cancel Invitation"
            className="ml-2 rounded-none"
          >
            Cancel
          </Button>
        </div>
      ))}
    </div>
  );
}
