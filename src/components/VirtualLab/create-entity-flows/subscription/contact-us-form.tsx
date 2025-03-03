import { Dispatch, SetStateAction, useTransition } from 'react';
import { Form } from 'antd';
import { useRouter } from 'next/navigation';

import { ContactUsFooter } from '@/components/VirtualLab/create-entity-flows/subscription/footer';
import { TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';

import { type SubscriptionFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
  onCancel: () => void;
  onStepChange: (step: SubscriptionFlowSteps) => void;
  onSlideDirectionChange: Dispatch<SetStateAction<'left' | 'right'>>;
};

export default function ContactUs({ onCancel, onStepChange, onSlideDirectionChange }: Props) {
  const { push: navigate } = useRouter();
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();

  const onPrevious = () => {
    onSlideDirectionChange('left');
    onStepChange('plans');
  };

  const onFormSubmit = () => {
    // TODO: confirm form
    startTransition(() => {
      navigate('/app/virtual-lab/subscription');
    });
  };

  return (
    <Form
      name="contact-us-flow-step"
      form={form}
      layout="vertical"
      onFinish={onFormSubmit}
      className="relative flex h-full flex-grow flex-col px-4 py-2"
      requiredMark={false}
      validateTrigger={['onChange']}
      initialValues={{
        message: '',
      }}
      disabled={pending}
    >
      <div className="mx-auto h-full w-full max-w-5xl flex-grow bg-white p-12">
        <Form.Item
          label={<span className="font-semibold text-primary-8">Message</span>}
          name="message"
        >
          <TextArea
            rows={10}
            placeholder="please provide us with your requirements and specifications"
            className="!border"
          />
        </Form.Item>
      </div>
      <ContactUsFooter loading={pending} onCancel={onCancel} onPreviousStep={onPrevious} />
    </Form>
  );
}
