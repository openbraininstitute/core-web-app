import { useState, useTransition } from 'react';
import { Form, Button } from 'antd';
import { useSetAtom } from 'jotai';
import isNull from 'es-toolkit/compat/isNull';

import CreateEntityModal from '@/components/VirtualLab/create-entity-flows/common/modal';
import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';

import { inviteToProject, inviteToVirtualLab } from '@/api/virtual-lab-svc/queries/invite';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { useAppNotification } from '@/components/notification';

import type { Role } from '@/api/virtual-lab-svc/types';

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
  const notify = useAppNotification();
  const [form] = Form.useForm<{ include_members: Array<InvitePayload> }>();
  const [pending, startTransition] = useTransition();
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
    startTransition(async () => {
      try {
        const items = values.include_members.filter((o) => !isNull(o));
        // TODO: create bulk invite in vlab-svc
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
          notify.warning({
            message: `Some invitations were sent successfully, but a few may not have been delivered.
            ${failedInvites.map((o) => o?.email).join('\n')}.
            `,
            placement: 'topRight',
          });
        }

        notify.success({
          message: 'All invitations have been sent successfully!',
          placement: 'topRight',
        });

        if (type === 'vlab') refreshVirtualLabInvites();
        if (type === 'project') refreshProjectInvites();

        resetForm();
        onClose();
      } catch (error) {
        notify.error({
          message: 'We couldn’t send the invitations. Please try again shortly.',
          placement: 'topRight',
        });
      }
    });
  };

  return (
    <CreateEntityModal
      isOpen={isOpen}
      footer={null}
      onClose={onModalClose}
      cls={{ content: 'min-h-[46rem]!' }}
    >
      <h1 className="text-primary-8 mb-4 text-xl font-bold">{title}</h1>
      <div className="flex h-full grow flex-col rounded-lg bg-white">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFormSubmit}
          className="flex h-full grow flex-col"
          requiredMark={false}
          validateTrigger={['onChange']}
          onValuesChange={onValuesChange}
          disabled={pending}
          initialValues={{
            include_members: [
              {
                email: '',
                role: 'member',
              },
            ],
          }}
        >
          <MemberList cls={{ listContainer: 'max-h-[400px]! px-0!' }} />
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
              key="invite-btn"
              className="border-primary-8 bg-primary-8 h-14 rounded-none px-10 text-white hover:text-white!"
              type="default"
              size="large"
              htmlType="submit"
              loading={pending}
              disabled={!isFormValid || pending}
            >
              Invite
            </Button>
          </div>
        </Form>
      </div>
    </CreateEntityModal>
  );
}
