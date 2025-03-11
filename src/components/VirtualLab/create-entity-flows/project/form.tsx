'use client';

import { useState, useTransition } from 'react';
import { Form, ConfigProvider } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import find from 'lodash/find';

import VirtualLabsList from '@/components/VirtualLab/create-entity-flows/project/vlabs-list';
import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';
import Overview from '@/components/VirtualLab/create-entity-flows/project/overview';
import Footer from '@/components/VirtualLab/create-entity-flows/project/footer';
import useNotification from '@/hooks/notifications';

import type {
  ProjectFlowSteps,
  ProjectFlowStepsArray,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { List } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { extractInitials } from '@/util/slugify';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { tryCatch } from '@/api/utils';

type Props = {
  step: ProjectFlowSteps;
  steps: ProjectFlowStepsArray;
  onCancel: () => void;
  onStepChange: (t: ProjectFlowSteps) => void;
};

function Members() {
  const { data } = useSession();
  const id = data?.user.email!;
  const name = data?.user.name!;
  const email = data?.user.email!;
  const initials = extractInitials(name);

  return (
    <List
      members={[
        {
          id,
          email,
          role: 'admin',
          name,
          initials,
        },
      ]}
    />
  );
}

export default function CreationForm({ step, steps, onCancel, onStepChange }: Props) {
  const notify = useNotification();
  const { push: navigate } = useRouter();

  const [form] = Form.useForm<ProjectPayload & { virtual_lab_id: string }>();
  const [pending, startTransition] = useTransition();
  const [isFormValid, setIsFormValid] = useState(false);
  const [slideDirection, onSlideDirectionChange] = useState<'right' | 'left'>('right');
  const { virtualLabId } = useParams<{ virtualLabId: string }>();
  const fields = Form.useWatch([], form);

  const disableNextProject = !!find(steps, { id: 'virtual-lab' }) && !fields?.virtual_lab_id;
  const disableNextMembers = !isFormValid || !fields?.name;

  const onNextStep = () => {
    onSlideDirectionChange('left');
    const currentIndex = steps.findIndex((s) => s.id === step);
    if (currentIndex < steps.length - 1) {
      onStepChange(steps[currentIndex + 1].id);
    }
  };

  const onPreviousStep = () => {
    onSlideDirectionChange('right');
    const currentIndex = steps.findIndex((s) => s.id === step);
    if (currentIndex > 0) {
      onStepChange(steps[currentIndex - 1].id);
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

  const onFormSubmit = async (values: ProjectPayload & { virtual_lab_id: string }) => {
    startTransition(async () => {
      const id = virtualLabId ?? values.virtual_lab_id;
      const formValues = {
        ...values,
        include_members:
          values.include_members?.map((o) => ({ email: o.email, role: o.role })) ?? null,
      };
      const { data: result, error } = await tryCatch(createProject(id, formValues));
      if (error || !result || !result.data) {
        notify.error(
          'Project creation failed. Please check your details and try again.',
          undefined,
          'topRight',
          undefined
        );
      }
      if (result && result.data) {
        notify.success(
          `Your Project ${values.name} has been created successfully and is now ready to use.`,
          undefined,
          'topRight',
          undefined
        );
        navigate(`${generateVlProjectUrl(id, result.data.project.id)}/home`);
      }
    });
  };

  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Form
        name="project-creation-flow"
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
        disabled={pending}
      >
        <AnimatePresence initial={false} custom={slideDirection} mode="wait">
          <motion.div
            key={step}
            custom={slideDirection}
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.3,
              type: 'tween',
              ease: 'easeInOut',
            }}
            className="relative flex h-full flex-grow flex-col"
          >
            {virtualLabId && (
              <Form.Item hidden name="virtual_lab_id">
                <input name="virtual_lab_id" type="text" value={virtualLabId} hidden />
              </Form.Item>
            )}

            <div className={step !== 'virtual-lab' ? 'hidden' : ''}>
              <VirtualLabsList />
            </div>
            <div className={step !== 'information' ? 'hidden' : ''}>
              <Overview />
            </div>
            <div className={step !== 'members' ? 'hidden' : ''}>
              <MemberList
                ListCompo={Members}
                cls={{ listContainer: 'max-h-[calc(100vh-500px)] mb-5 secondary-scrollbar' }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mx-auto mt-auto w-full max-w-5xl px-4 lg:max-w-full">
          <div className="px-4 py-4">
            <Footer
              {...{
                step,
                steps,
                onCancel,
                onNextStep,
                onPreviousStep,
                disableNextProject,
                disableNextMembers,
                loading: pending,
                disableCreate: !isFormValid || pending,
              }}
            />
          </div>
        </div>
      </Form>
    </ConfigProvider>
  );
}
