'use client';

import { useState, useTransition } from 'react';
import { ConfigProvider, Form } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';
import Overview from '@/components/VirtualLab/create-entity-flows/virtual-lab/overview';

import Footer from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';
import Plans from '@/components/VirtualLab/subscription-plans';
import useNotification from '@/hooks/notifications';

import { List } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { extractInitials } from '@/util/slugify';
import {
  virtualLabFlowSteps,
  type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { tryCatch } from '@/api/utils';

type Props = {
  step: VirtualLabFlowSteps;
  onCancel: () => void;
  onStepChange: (step: VirtualLabFlowSteps) => void;
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

export default function CreationForm({ step, onCancel, onStepChange }: Props) {
  const notify = useNotification();
  const { push: navigate } = useRouter();
  const { data } = useSession();
  const params = useSearchParams();

  const [form] = Form.useForm<VirtualLabPayload>();
  const [isFormValid, setIsFormValid] = useState(false);
  const [pending, startTransition] = useTransition();
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const fields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);

  const disableNextPlans = Boolean(!(isFormValid && fields?.email_status === 'verified'));
  const disableNextMembers = !fields?.plan_id;
  const allowAskCode = Boolean(isFormValid && fields.email_status !== 'verified');
  const firstLogin = params.get('t') === 'f'; // check if the first login

  const onNextStep = () => {
    setSlideDirection('left');
    const currentIndex = virtualLabFlowSteps.findIndex((s) => s.id === step);
    if (currentIndex < virtualLabFlowSteps.length - 1) {
      onStepChange(virtualLabFlowSteps[currentIndex + 1].id);
    }
  };

  const onPreviousStep = () => {
    setSlideDirection('right');
    const currentIndex = virtualLabFlowSteps.findIndex((s) => s.id === step);
    if (currentIndex > 0) {
      onStepChange(virtualLabFlowSteps[currentIndex - 1].id);
    }
  };

  const resetForm = () => form.resetFields();

  const onSelectPlan = (id: string) => {
    form.setFieldValue('plan_id', id);
    if (typeof window !== 'undefined')
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const onValuesChange = (changedValues: VirtualLabPayload, values: VirtualLabPayload) => {
    if ('reference_email' in changedValues && values?.email_status !== 'none') {
      form.setFieldValue('email_status', 'none');
    }
    form
      .validateFields({ validateOnly: true })
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        setIsFormValid(!(error.errorFields.length > 0));
      });
  };

  const onFormSubmit = async (values: VirtualLabPayload) => {
    startTransition(async () => {
      const formValues = {
        ...values,
        include_members:
          values.include_members?.map((o) => ({ email: o.email, role: o.role })) ?? null,
      };
      const { data: result, error } = await tryCatch(createVirtualLab(formValues));
      if (error || !result || !result.data) {
        notify.error(
          'Virtual Lab creation failed. Please check your details and try again.',
          undefined,
          'topRight',
          undefined
        );
      }
      if (result && result.data) {
        notify.success(
          'Your Virtual Lab has been created successfully and is now ready to use.',
          undefined,
          'topRight',
          undefined
        );
        resetForm();
        const labUrl = generateLabUrl(result.data.virtual_lab.id);
        navigate(`${labUrl}/overview`);
      }
    });
  };

  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Form
        name="virtual-lab-creation-flow"
        form={form}
        layout="vertical"
        onFinish={onFormSubmit}
        className="relative flex h-full flex-grow flex-col px-4 py-2"
        requiredMark={false}
        validateTrigger={['onChange']}
        initialValues={{
          name: firstLogin ? `${data?.user.name}'s virtual lab` : undefined,
          description: '',
          entity: null,
          include_members: [],
        }}
        onValuesChange={onValuesChange}
        disabled={pending}
      >
        <Form.Item hidden name="plan_id">
          <input name="plan_id" type="text" hidden />
        </Form.Item>
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
            <div className={step !== 'information' ? 'hidden' : ''}>
              <Overview allowAskCode={allowAskCode} />
            </div>
            <div className={step !== 'members' ? 'hidden' : ''}>
              <MemberList
                ListCompo={Members}
                cls={{ listContainer: 'max-h-[calc(100vh-500px)] mb-5 secondary-scrollbar' }}
              />
            </div>
            <div className={step !== 'plans' ? 'hidden' : ''}>
              <Plans selectedPlan={fields?.plan_id} onSelectPlan={onSelectPlan} />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
          <div className="px-4 py-4">
            <Footer
              {...{
                step,
                onCancel,
                onNextStep,
                onPreviousStep,
                disableNextPlans,
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
