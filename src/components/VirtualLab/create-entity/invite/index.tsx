import { useState } from 'react';
import { Form, Button } from 'antd';
import { useSetAtom } from 'jotai';
import isNull from 'lodash/isNull';

import CreateEntityModal from '@/components/VirtualLab/create-entity/common/modal';
import MemberList from '@/components/VirtualLab/create-entity/common/members';
import useNotification from '@/hooks/notifications';

import { Role } from '@/api/virtual-lab-svc/types';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { inviteToProject, inviteToVirtualLab } from '@/api/virtual-lab-svc/queries/invite';

interface BaseProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
}

type VLabContext = { virtualLabId: string };
type ProjectContext = { virtualLabId: string; projectId: string };

type Props = BaseProps &
  ({ type: 'vlab'; context: VLabContext } | { type: 'project'; context: ProjectContext });

type InvitePayload = {
  email: string;
  role: Role;
};

export default function InviteModal({ isOpen, onClose, type, title, context }: Props) {
  const notify = useNotification();
  const [form] = Form.useForm<{ include_members: Array<InvitePayload> }>();
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const refreshProjectInvites = useSetAtom(
    virtualLabProjectUsersAtomFamily({
      virtualLabId: context.virtualLabId,
      projectId: (context as ProjectContext).projectId,
    })
  );
  const refreshVirtualLabInvites = useSetAtom(virtualLabMembersAtomFamily(context.virtualLabId));

  const resetForm = () => form.resetFields();
  const onModalClose = () => {
    resetForm();
    onClose();
  };

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

  const onFormSubmit = async (values: { include_members: Array<InvitePayload> }) => {
    try {
      setLoading(true);
      const items = values.include_members.filter((o) => !isNull(o));

      const invites = await Promise.allSettled(
        items.map(({ email, role }) => {
          if (type === 'project')
            return inviteToProject({
              virtualLabId: context.virtualLabId,
              projectId: context.projectId,
              email,
              role,
            });
          if (type === 'vlab')
            return inviteToVirtualLab({ virtualLabId: context.virtualLabId, email, role });
          return null;
        })
      );

      const failedInvites = invites
        .map((o, idx) => {
          if (o.status === 'rejected') return items.at(idx);
          return -1;
        })
        .filter((o) => o !== -1);

      if (failedInvites.length && items.length !== failedInvites.length) {
        notify.warning(
          `Some invitations were sent successfully, but a few may not have been delivered. 
          Please try re-inviting these users: ${failedInvites.map((o) => o?.email).join('\n')}.
          `,
          undefined,
          'topLeft',
          undefined
        );
      }

      notify.success(
        'All invitations have been sent successfully!',
        undefined,
        'topRight',
        undefined
      );

      if (type === 'vlab') refreshVirtualLabInvites();
      if (type === 'project') refreshProjectInvites();

      resetForm();
      onClose();
    } catch (error) {
      notify.error(
        'We couldn’t send the invitations. Please try again shortly.',
        undefined,
        'topRight',
        undefined
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CreateEntityModal
      isOpen={isOpen}
      footer={null}
      onClose={onModalClose}
      cls={{ content: '!min-h-[30rem]' }}
    >
      <h1 className="mb-4 text-xl font-bold text-primary-8">{title}</h1>
      <div className="flex h-full flex-grow flex-col rounded-lg bg-white">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFormSubmit}
          className="flex h-full flex-grow flex-col"
          requiredMark={false}
          validateTrigger={['onChange']}
          onValuesChange={onValuesChange}
        >
          <MemberList cls={{ listContainer: '!max-h-[400px] !px-0' }} />
          <div className="mt-auto flex items-end justify-end gap-3">
            <Button
              key="cancel-members-btn"
              className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
              type="text"
              size="large"
              htmlType="button"
              onClick={onModalClose}
            >
              Cancel
            </Button>
            <Button
              key="create-vlab-btn"
              className="h-14 rounded-none border-primary-8 bg-primary-8 px-10 text-white hover:!text-white"
              type="default"
              size="large"
              htmlType="submit"
              loading={loading}
              disabled={!isFormValid}
            >
              Invite
            </Button>
          </div>
        </Form>
      </div>
    </CreateEntityModal>
  );
}
