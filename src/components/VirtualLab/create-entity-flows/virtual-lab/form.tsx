'use client';

import { useEffect, useState } from 'react';
import { Form } from 'antd';
import { useAtom } from 'jotai';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';
import Overview from '@/components/VirtualLab/create-entity-flows/virtual-lab/overview';
import Footer from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';
import Plans from '@/components/VirtualLab/subscription-plans';
import useNotification from '@/hooks/notifications';

import { flowSteps } from '@/components/VirtualLab/create-entity-flows/virtual-lab/step-menu';
import { List } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { extractInitials } from '@/util/slugify';
import type { Step } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
  step: Step;
  onCancel: () => void;
  onStepChange: (step: Step) => void;
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

const fadeVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

export function CreationSteps({ step, onCancel, onStepChange }: Props) {
  const notify = useNotification();

  const { push: navigate } = useRouter();
  const [form] = Form.useForm<VirtualLabPayload>();
  const [loading, setLoading] = useState(false);
  const overviewFields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);
  const [isFormValid, setIsFormValid] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  const disableNextPlans = Boolean(!(isFormValid && overviewFields.email_status === 'verified'));
  const disableNextMembers = !overviewFields?.plan_id;
  const allowAskCode = Boolean(isFormValid && overviewFields.email_status !== 'verified');

  const onNextStep = () => {
    setSlideDirection('left');
    if (step === 'information') onStepChange('plans');
    if (step === 'plans') onStepChange('members');
  };

  const onPreviousStep = () => {
    setSlideDirection('right');
    if (step === 'plans') onStepChange('information');
    if (step === 'members') onStepChange('plans');
  };

  const resetForm = () => form.resetFields();

  const onSelectPlan = (id: string) => form.setFieldValue('plan_id', id);

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

  const onFormSubmit = async (values: VirtualLabPayload) => {
    try {
      setLoading(true);
      const result = await createVirtualLab(values);

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
      throw new Error('Virtual lab creation failed');
    } catch (error) {
      notify.error(
        'Virtual Lab creation failed. Please check your details and try again.',
        undefined,
        'topRight',
        undefined
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFormSubmit}
      // className="flex h-full flex-grow flex-col py-2 px-4"
      className="relative flex h-full flex-grow flex-col px-4 py-2"
      requiredMark={false}
      validateTrigger={['onChange']}
      initialValues={{
        name: '',
        description: '',
        entity: null,
        include_members: [],
      }}
      onValuesChange={onValuesChange}
    >
      <Form.Item hidden name="plan_id">
        <input name="plan_id" type="text" hidden />
      </Form.Item>
      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
        <motion.div
          key={step}
          custom={slideDirection}
          variants={fadeVariants}
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
          <div className="flex h-full flex-grow flex-col">
            {step === 'information' && <Overview allowAskCode={allowAskCode} />}
            {step === 'members' && (
              <MemberList
                ListCompo={Members}
                cls={{ listContainer: 'max-h-[calc(100vh-520px)] mb-5 secondary-scrollbar' }}
              />
            )}
            {step === 'plans' && (
              <Plans selectedPlan={overviewFields?.plan_id} onSelectPlan={onSelectPlan} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
        <div className="py-4">
          <Footer
            {...{
              step,
              onCancel,
              onNextStep,
              onPreviousStep,
              disableNextPlans,
              disableNextMembers,
              loading,
              disableCreate: !isFormValid,
            }}
          />
        </div>
      </div>
    </Form>
  );
}

export default function Content() {
  const { push: navigate } = useRouter();
  const [currentStep, setCurrentStep] = useAtom(flowSteps);
  const onStepChange = (t: Step) => setCurrentStep(t);
  const onCancel = () => navigate('/app/virtual-lab');

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;

  return <CreationSteps step={currentStep} onCancel={onCancel} onStepChange={onStepChange} />;
}
