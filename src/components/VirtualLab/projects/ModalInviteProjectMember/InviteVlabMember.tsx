import { useState } from 'react';
import { Button, ConfigProvider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSetAtom } from 'jotai';

import { UsersHorizontalList } from '../VirtualLabProjectHomePage';
import { Footer } from './Footer';
import { addMember, removeMember } from './utils';
import { useInviteHandler } from './hooks';
import { Member } from './types';
import { NewMember } from './NewMember';
import { IconMail } from './IconMail';
import { RoleCombo } from './RoleCombo';

import { useParamVirtualLabId } from '@/util/params';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';

interface InviteVlabMemberProps {
  members: Member[];
  onChange(members: Member[]): void;
  onClose(this: void): void;
}

export function InviteVlabMember({ onClose, members, onChange }: InviteVlabMemberProps) {
  const [editMode, setEditMode] = useState(false);
  const virtualLabId = useParamVirtualLabId();
  const refreshVlabUsers = useSetAtom(virtualLabMembersAtomFamily(virtualLabId!));

  const { loading, handleInvite } = useInviteHandler('lab', members, () => {
    refreshVlabUsers();
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
        <div className="mb-8">
          <UsersHorizontalList virtualLabId={virtualLabId ?? ''} />
        </div>
        <PendingInvitations members={members} onChange={onChange} />
        {editMode ? (
          <NewMember
            onCancel={() => setEditMode(false)}
            onOK={(member: Member) => {
              setEditMode(false);
              onChange(addMember(members, member));
            }}
          />
        ) : (
          <AddMemberButton onClick={() => setEditMode(true)} />
        )}
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
          <IconMail />
          <b className="flex-1">{member.email}</b>
          <RoleCombo
            role={member.role}
            onChange={(role) =>
              onChange(
                addMember(members, {
                  email: member.email,
                  role,
                })
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(removeMember(members, member))}
            aria-label="Cancel Invitation"
          >
            Cancel Invitation
          </button>
        </div>
      ))}
    </div>
  );
}
