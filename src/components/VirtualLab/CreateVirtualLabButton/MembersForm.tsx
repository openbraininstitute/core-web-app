import { Dispatch, SetStateAction, useState } from 'react';
import { Button, ConfigProvider, Form, Input, Select } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';

import VirtualLabMemberIcon from '../VirtualLabMemberIcon';
import { VirtualLabWithOptionalId } from './types';

import { Role } from '@/types/virtual-lab/members';

type MembersFormProps = {
  loading: boolean;
  currentVirtualLab: VirtualLabWithOptionalId;
  setVirtualLabFn: Dispatch<SetStateAction<VirtualLabWithOptionalId>>;
  closeModalFn: () => void;
  createVirtualLabFn: () => void;
  handleBackClick: () => void;
};

function NewMemberForm({
  setVirtualLabFn,
}: {
  setVirtualLabFn: Dispatch<SetStateAction<VirtualLabWithOptionalId>>;
}) {
  const [form] = Form.useForm();
  // Rule disabled for SfN since Member form is disabled
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFormValid, setIsFormValid] = useState(false);
  const onValuesChange = () => {
    form
      .validateFields()
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        if (error.errorFields.length > 0) {
          setIsFormValid(false);
        } else {
          setIsFormValid(true);
        }
      });
  };

  const onFinish = (values: { email: string; role: Role }) => {
    setVirtualLabFn((currentVl) => ({
      ...currentVl,
      include_members: [
        ...(currentVl.include_members || []),
        { email: values.email, role: values.role },
      ],
    }));
    form.resetFields();
  };

  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Form
        form={form}
        className="my-5"
        name="member_form"
        onFinish={onFinish}
        onValuesChange={onValuesChange}
        initialValues={{
          email: '',
          role: 'member',
        }}
        requiredMark={false}
      >
        <div className="flex items-center gap-3">
          <div
            className="inline-flex h-12 w-12 items-center justify-center bg-gray-100"
            style={{ animationFillMode: 'forwards' }}
          >
            <MailOutlined />
          </div>
          <Form.Item
            name="email"
            className="mb-0 [&.ant-form-item-has-error>.ant-form-item-row]:pt-6"
            rules={[
              {
                type: 'email',
                required: true,
                message: 'Please enter a valid email address',
              },
            ]}
          >
            <Input
              allowClear
              className="rounded-none border border-gray-400 shadow-none outline-none focus:shadow-none"
              placeholder="Enter email address"
            />
          </Form.Item>
          <div className="mx-2 uppercase">as</div>
          <Form.Item name="role" className="mb-0 flex items-center">
            <Select
              defaultValue="member"
              placeholder="Choose role..."
              className="!w-40 rounded-none border border-gray-400 shadow-none focus:shadow-none [&_.ant-select-selector]:!border-none"
            >
              <Select.Option value="admin">Administrator</Select.Option>
              <Select.Option value="member">Member</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item className="mb-0 ml-auto items-end">
            <Button
              htmlType="submit"
              type="default"
              className="rounded-none"
              aria-label="Cancel Invitation"
              disabled={!isFormValid}
            >
              Confirm
            </Button>
            <Button
              htmlType="button"
              className="ml-2 rounded-none"
              onClick={() => {
                form.resetFields();
              }}
              type="text"
              aria-label="Cancel Invitation"
            >
              Cancel
            </Button>
          </Form.Item>
        </div>
      </Form>
    </ConfigProvider>
  );
}

function NonInvitedMember({ label, inviteAccepted }: { label: string; inviteAccepted?: boolean }) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="flex flex-row items-center gap-4">
        <VirtualLabMemberIcon
          inviteAccepted={inviteAccepted}
          firstName={label.split(' ')[0]}
          lastName={label.split(' ')[1]}
          memberRole="admin"
        />
        <span className="font-bold">{label}</span>
      </div>
      <div className="flex flex-row items-center gap-4">
        <span className="font-bold">Administrator</span>
      </div>
    </div>
  );
}

function InvitedMember({
  label,
  role,
  setVirtualLabFn,
}: {
  label: string;
  role: Role;
  setVirtualLabFn: Dispatch<SetStateAction<VirtualLabWithOptionalId>>;
}) {
  const removeMember = () => {
    setVirtualLabFn((currentVl) => ({
      ...currentVl,
      include_members: (currentVl.include_members || []).filter((member) => member.email !== label),
    }));
  };

  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="flex flex-row items-center gap-4">
        <div className="inline-flex h-12 w-12 items-center justify-center bg-primary-8">
          <span className="text-2xl font-bold text-white">
            <MailOutlined />
          </span>
        </div>
        <span className="font-bold">{label}</span>
      </div>
      <div className="flex flex-row items-center gap-4">
        <span className="font-bold">{role === 'admin' ? 'Administrator' : 'Member'}</span>
        <Button htmlType="button" type="text" onClick={removeMember} aria-label="Cancel Invitation">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function MembersForm({
  loading,
  currentVirtualLab,
  setVirtualLabFn,
  closeModalFn,
  createVirtualLabFn,
  handleBackClick,
}: MembersFormProps) {
  const { data } = useSession();

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
      <div className="my-10 flex w-full flex-col gap-4 text-primary-8">
        {data?.user.name && <NonInvitedMember label={data.user.name} inviteAccepted />}
        {!!currentVirtualLab.include_members?.length && (
          <div className="my-4 h-px w-full bg-gray-200" />
        )}
        {currentVirtualLab.include_members?.map((member) => (
          <InvitedMember
            key={member.email}
            label={member.email}
            role={member.role}
            setVirtualLabFn={setVirtualLabFn}
          />
        ))}
        <NewMemberForm setVirtualLabFn={setVirtualLabFn} />
      </div>
      <div className="flex flex-row justify-end gap-2">
        <Button
          title="Cancel"
          htmlType="button"
          onClick={handleBackClick}
          className="h-14 w-40 rounded-none bg-transparent font-light text-primary-8 hover:bg-neutral-1"
        >
          Back
        </Button>
        <Button
          title="Cancel"
          htmlType="button"
          onClick={closeModalFn}
          className="h-14 w-40 rounded-none bg-transparent font-light text-primary-8 hover:bg-neutral-1"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          title="Save Changes"
          htmlType="submit"
          onClick={createVirtualLabFn}
          className="ml-3 h-14 w-40 rounded-none bg-primary-8 font-semibold"
          disabled={loading}
        >
          Save
        </Button>
      </div>
    </ConfigProvider>
  );
}
