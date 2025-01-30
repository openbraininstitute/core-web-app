import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import { MailOutlined } from '@ant-design/icons';

import { Member } from './types';
import { isValidEMail } from './utils';
import useNotification from '@/hooks/notifications';

export function NewMember({
  onCancel,
  onOK,
}: {
  onCancel: () => void;
  onOK: (member: Member) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const notify = useNotification();

  return (
    <div className="flex w-full flex-wrap items-center gap-2 whitespace-nowrap font-normal text-dark">
      <div className="back-black flex h-12 w-12 items-center justify-center bg-gray-100 text-black">
        <MailOutlined />
      </div>
      <div className="flex items-center">
        <Input
          allowClear
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          className="rounded-none border border-gray-400 px-2 py-1 shadow-none focus:shadow-none"
        />
      </div>
      <div className="flex items-center">
        <div className="ml-2 mr-4 uppercase">As</div>
        <Select
          defaultValue="admin"
          value={role}
          placeholder="Choose role..."
          className="w-40 rounded-none border border-gray-400 shadow-none focus:shadow-none [&_.ant-select-selector]:!border-none"
          onChange={(v: 'admin' | 'member') => setRole(v)}
        >
          <Select.Option value="admin">Administrator</Select.Option>
          <Select.Option value="member">Member</Select.Option>
        </Select>
      </div>
      <div className="ml-auto mr-3 flex">
        <Button
          htmlType="button"
          type="default"
          onClick={() => {
            if (isValidEMail(email)) {
              onOK({
                email,
                role,
              });
            } else {
              notify.warning('The email address is not valid!', undefined, 'topRight');
            }
          }}
          aria-label="confirm invitation"
          className="rounded-none"
        >
          Confirm
        </Button>
        <Button
          htmlType="button"
          type="text"
          onClick={onCancel}
          aria-label="Cancel Invitation"
          className="ml-2 rounded-none"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
