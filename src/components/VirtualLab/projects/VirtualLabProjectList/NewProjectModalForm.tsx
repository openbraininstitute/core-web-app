import { useState, useEffect, useReducer } from 'react';
import { Button, ConfigProvider, Form, Input, Select } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useAtom } from 'jotai';
import sortBy from 'lodash/sortBy';

import NewProjectModalInputs from '@/components/VirtualLab/projects/VirtualLabProjectList/NewProjectModalInputs';
import VirtualLabMemberIcon from '@/components/VirtualLab/VirtualLabMemberIcon';
import {
  InvitedMember,
  selectedMembersAtom,
  Form as FormT,
} from '@/components/VirtualLab/projects/VirtualLabProjectList/shared';
import { VirtualLabMember } from '@/types/virtual-lab/members';

const { Option } = Select;

export default function NewProjectModalForm({
  vlabId,
  form,
  members,
}: {
  vlabId: string;
  form: FormT;
  members?: VirtualLabMember[] | null;
}) {
  const session = useSession();
  const [showInvitation, setShowInvitation] = useState(false);
  const [newInvite, setNewInvite] = useState<InvitedMember>({ email: '', role: 'admin' });

  const [invitedMembers, dispatch] = useReducer(
    (
      prevMembers: InvitedMember[],
      { type, payload }: { type: 'add' | 'remove'; payload: InvitedMember }
    ): InvitedMember[] => {
      if (type === 'add') return [...prevMembers, payload];
      if (type === 'remove') return prevMembers.filter((m) => m.email !== payload.email);
      return prevMembers;
    },
    []
  );
  const [selectedMembers, setSelectedMembers] = useAtom(selectedMembersAtom);

  useEffect(() => {
    setSelectedMembers(invitedMembers);
  }, [invitedMembers, setSelectedMembers]);

  return (
    <Form form={form} layout="vertical" style={{ paddingBlockStart: 40 }}>
      <ConfigProvider
        theme={{
          hashed: false,
          components: {
            Input: {
              activeBg: 'transparent',
              addonBg: 'transparent',
              borderRadius: 0,
              colorBgContainer: 'transparent',
              colorBorder: 'transparent',
              colorText: '#003A8C',
              colorTextDisabled: '#fff',
              colorTextPlaceholder: '#8C8C8C',
              fontSizeLG: 16,
              hoverBorderColor: 'transparent',
              paddingInline: 0,
              paddingBlock: 0,
            },
            Form: {
              itemMarginBottom: 40,
              verticalLabelMargin: 0,
              verticalLabelPadding: 0,
            },
            Select: {
              colorText: 'text-primary-8',
              colorBorder: 'transparent',
            },
          },
        }}
      >
        <NewProjectModalInputs vlabId={vlabId} />
        <div className="flex w-full flex-col gap-2">
          {sortBy(members, ['role'])
            .filter((o) => o.invite_accepted)
            ?.map((member) => (
              <div key={member.id} className="flex items-center text-primary-8">
                <VirtualLabMemberIcon
                  inviteAccepted={member.invite_accepted}
                  email={member.email}
                  memberRole={member.role}
                  firstName={member.first_name}
                  lastName={member.last_name}
                />
                <div
                  key={member.id}
                  className="ml-5 inline-block h-8 text-center align-middle font-bold"
                >
                  {member.invite_accepted ? member.name : member.email}
                </div>
                <Select
                  style={{ width: 200, marginLeft: 'auto' }}
                  defaultValue={member.role}
                  onChange={(v) => {
                    const m = members?.find((m_) => m_.id === v);
                    if (m) setSelectedMembers([...selectedMembers, { ...member, role: v }]);
                  }}
                  disabled={member.email === session.data?.user?.email}
                  className="float-right inline-block"
                >
                  <Option value="admin">Admin</Option>
                  <Option value="member">Member</Option>
                </Select>
              </div>
            ))}
        </div>
        {!!invitedMembers.length && <div className="my-4 h-px w-full bg-gray-200" />}
        <div className="flex w-full flex-col gap-2">
          {invitedMembers.map((member) => (
            <div key={member.email} className="mt-1 flex items-center gap-2 text-primary-8">
              <div className="inline-flex h-12 w-12 items-center justify-center bg-primary-8">
                <MailOutlined className="text-white" />
              </div>
              <div key={member.email} className="ml-5 inline-block font-bold">
                {member.email}
              </div>
              <div className="flex-grow" />
              <button
                type="button"
                className="float-right mr-3 inline-block"
                onClick={() => {
                  dispatch({ type: 'remove', payload: member });
                }}
              >
                Cancel invitation
              </button>
            </div>
          ))}
        </div>
        {showInvitation && (
          <div className="mt-5 flex w-full items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center bg-gray-100">
              <MailOutlined />
            </div>
            <div className="flex items-center">
              <span className="inline-block font-bold text-primary-8">Invitation to: </span>
              <div className="ml-1 inline-block">
                <Input
                  placeholder="Enter email address"
                  value={newInvite?.email}
                  onChange={(v) => setNewInvite({ ...newInvite, email: v.currentTarget.value })}
                  className="px-2 py-1"
                />
              </div>
            </div>
            <div className="flex items-center">
              <div className="mr-1">As</div>
              <Select
                defaultValue="admin"
                onChange={(v: 'admin' | 'member') => setNewInvite({ ...newInvite, role: v })}
              >
                <Option value="admin">Admin</Option>
                <Option value="member">Member</Option>
              </Select>
            </div>
            <div className="ml-auto mr-3 flex">
              {!!newInvite.email && (
                <button
                  type="button"
                  className="text-sm text-primary-7"
                  onClick={() => {
                    dispatch({ type: 'add', payload: newInvite });
                    setNewInvite({ email: '', role: 'admin' });
                    setShowInvitation(false);
                  }}
                >
                  Confirm
                </button>
              )}
              <button
                type="button"
                className="ml-3 text-sm text-primary-7"
                onClick={() => {
                  setNewInvite({ email: '', role: 'admin' });
                  setShowInvitation(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <Button
          className="mt-5 flex h-12 items-center rounded-none bg-white font-bold text-primary-8"
          onClick={() => setShowInvitation(true)}
        >
          <div className="relative -top-1">
            Add Member
            <span className="relative top-0.5 ml-3 inline-block text-3xl font-normal text-gray-400 ">
              +
            </span>
          </div>
        </Button>
      </ConfigProvider>
    </Form>
  );
}
