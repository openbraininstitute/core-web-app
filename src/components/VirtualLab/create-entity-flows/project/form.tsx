import { useState } from 'react';
import { Form, Button } from 'antd';
import { useRouter } from 'next/navigation';

import { useSetAtom } from 'jotai';
import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';
import Overview from '@/components/VirtualLab/create-entity-flows/project/overview';
import useNotification from '@/hooks/notifications';

import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';

interface Props {
  from: 'vlab' | 'home';
  virtualLabId: string;
  onClose: () => void;
  onPreviousStep?: () => void;
}

export default function CreationForm({ from, virtualLabId, onPreviousStep, onClose }: Props) {
  const notify = useNotification();
  const { push: navigate } = useRouter();
  const [form] = Form.useForm<ProjectPayload>();
  const [loading, setLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const refreshProjects = useSetAtom(virtualLabProjectsAtomFamily(virtualLabId));

  const resetForm = () => form.resetFields();

  const onModalClose = () => {
    resetForm();
    onClose();
  };

  const onFormSubmit = async (values: ProjectPayload) => {
    try {
      setLoading(true);
      const {
        data: { project },
      } = await createProject(virtualLabId, values);
      notify.success(
        `Your Project ${values.name} has been created successfully and is now ready to use.`,
        undefined,
        'topRight',
        undefined
      );

      refreshProjects();
      resetForm();
      onClose();
      navigate(`/virtual-lab/lab/${virtualLabId}/project/${project.id}/home`);
    } catch (error) {
      notify.error(
        'Project creation failed. Please check your details and try again.',
        undefined,
        'topRight',
        undefined
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex h-full flex-grow flex-col rounded-lg bg-white">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFormSubmit}
        className="flex h-full flex-grow flex-col p-2"
        requiredMark={false}
        validateTrigger={['onChange']}
        initialValues={{
          name: '',
          description: '',
          include_members: [],
        }}
        onValuesChange={onValuesChange}
      >
        <Overview virtualLabId={virtualLabId} />
        <div className="my-5 h-px bg-gray-100" />
        <MemberList cls={{ listContainer: 'max-h-[150px]' }} />
        <div className="mt-auto flex items-end justify-end gap-3">
          <Button
            key="cancel-create-project"
            className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
            type="text"
            size="large"
            htmlType="button"
            onClick={onModalClose}
          >
            Cancel
          </Button>
          {from === 'home' && (
            <Button
              key="previous-step-create-project"
              className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
              type="text"
              size="large"
              htmlType="button"
              onClick={onPreviousStep}
            >
              Back
            </Button>
          )}
          <Button
            key="create-project"
            className="h-14 rounded-none border-primary-8 bg-primary-8 px-10 text-white hover:!text-white"
            type="default"
            size="large"
            htmlType="submit"
            loading={loading}
            disabled={!isFormValid}
          >
            Create
          </Button>
        </div>
      </Form>
    </div>
  );
}
