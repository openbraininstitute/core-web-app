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
  const [showInvitation, setShowInvitation] = useState(true);
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
    <Form form={form} layout="vertical">
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
                  <Select.Option value="admin">Administrator</Select.Option>
                  <Select.Option value="member">Member</Select.Option>
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
              <div className="ml-5 inline-block font-bold">{member.email}</div>
              <div className="flex-grow" />
              <div className="flex flex-row items-center justify-end gap-4">
                <div className="ml-5 inline-block font-bold">
                  <span className="font-bold">
                    {member.role === 'admin' ? 'Administrator' : 'Member'}
                  </span>
                </div>
                <Button
                  htmlType="button"
                  type="text"
                  onClick={() => {
                    dispatch({ type: 'remove', payload: member });
                  }}
                  aria-label="Cancel Invitation"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
        {showInvitation && (
          <div className="my-10 flex w-full items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center bg-gray-100">
              <MailOutlined />
            </div>
            <div className="flex items-center">
              <Input
                allowClear
                type="email"
                placeholder="Enter email address"
                value={newInvite?.email}
                onChange={(v) => setNewInvite({ ...newInvite, email: v.currentTarget.value })}
                className="rounded-none border border-gray-400 px-2 py-1 shadow-none focus:shadow-none"
              />
            </div>
            <div className="flex items-center">
              <div className="ml-2 mr-4 uppercase">As</div>
              <Select
                defaultValue="admin"
                placeholder="Choose role..."
                className="w-40 rounded-none border border-gray-400 shadow-none focus:shadow-none [&_.ant-select-selector]:!border-none"
                onChange={(v: 'admin' | 'member') => setNewInvite({ ...newInvite, role: v })}
              >
                <Option value="admin">Administrator</Option>
                <Option value="member">Member</Option>
              </Select>
            </div>
            <div className="ml-auto mr-3 flex">
              <Button
                htmlType="button"
                type="default"
                onClick={() => {
                  dispatch({ type: 'add', payload: newInvite });
                  setNewInvite({ email: '', role: 'admin' });
                  setShowInvitation(true);
                }}
                aria-label="confirm invitation"
                className="rounded-none"
                disabled={!newInvite.email}
              >
                Confirm
              </Button>
              <Button
                htmlType="button"
                type="text"
                onClick={() => {
                  setNewInvite({ email: '', role: 'admin' });
                }}
                aria-label="Cancel Invitation"
                className="ml-2 rounded-none"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </ConfigProvider>
    </Form>
  );
}
