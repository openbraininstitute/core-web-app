'use client';

import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Table } from 'antd';
import { ColumnType } from 'antd/es/table';
import sortBy from 'lodash/sortBy';
import get from 'lodash/get';
import find from 'lodash/find';

import { useParams } from 'next/navigation';
import VirtualLabMemberIcon from '@/components/VirtualLab/VirtualLabMemberIcon';
import InviteModal from '@/components/VirtualLab/create-entity-flows/invite';
import { MockRole, Role, VirtualLabMember } from '@/types/virtual-lab/members';

type Props = {
  users: VirtualLabMember[];
};

export default function VirtualLabTeamTable({ users }: Props) {
  const context = useParams<{ virtualLabId: string }>();
  const [isOpen, setOpen] = useState(false);
  const onClose = () => setOpen(false);
  const onOpen = () => setOpen(true);

  const roleOptions: { value: Role; label: string }[] = [
    { value: 'admin', label: 'Administrator' },
    { value: 'member', label: 'Member' },
  ];

  const columns: ColumnType<VirtualLabMember>[] = [
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: VirtualLabMember) => (
        <div>
          <span>
            <VirtualLabMemberIcon
              inviteAccepted={record.invite_accepted}
              email={record.email}
              firstName={record.first_name}
              lastName={record.last_name}
              memberRole={record.role}
            />
          </span>
          {record.invite_accepted ? (
            <span className="ml-4 inline-block font-bold">{`${record.first_name} ${record.last_name}`}</span>
          ) : (
            <span className="ml-4 inline-block font-bold">{`${record.email}`}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Last active',
      dataIndex: 'last_active',
      key: 'last_active',
      render: () => <span className="text-primary-3" />, // Empty element for now, to be included when 'active' info is available
    },
    {
      title: 'Action',
      key: 'role',
      dataIndex: 'role',
      align: 'left',
      width: '200px',
      render: (role: MockRole) => (
        <div className="ml-auto text-base text-white">
          {get(find(roleOptions, { value: role }), 'label', '')}
        </div>
      ),
    },
  ];

  return (
    <div className="my-10">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="mr-2">Total members</span>
          <span className="font-bold">{users.length}</span>
        </div>
        <Button
          htmlType="button"
          size="large"
          className="flex items-center justify-between rounded-none"
          onClick={onOpen}
          color="white"
          type="default"
        >
          <span className="mr-4 text-lg font-medium text-primary-8">Invite member</span>
          <PlusOutlined className="text-lg text-primary-8" />
        </Button>
      </div>
      <ConfigProvider
        theme={{
          components: {
            Table: {
              colorBgContainer: 'rgba(255, 255, 255, 0)',
              colorText: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0)',
              cellPaddingInline: 0,
            },
          },
        }}
      >
        <Table
          bordered={false}
          dataSource={sortBy(users, ['role'])}
          pagination={false}
          columns={columns}
          showHeader={false}
          rowKey={(record) => record.id ?? record.email}
        />
      </ConfigProvider>
      <InviteModal
        key="invite-member-to-vlab"
        type="vlab"
        isOpen={isOpen}
        onClose={onClose}
        context={context}
        title="Invite new members to virtual lab"
      />
    </div>
  );
}
