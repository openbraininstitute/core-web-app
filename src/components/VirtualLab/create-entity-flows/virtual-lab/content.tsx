'use client';

import { ConfigProvider, Form } from 'antd';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

import Overview from '@/components/VirtualLab/create-entity-flows/virtual-lab/overview';
import useNotification from '@/hooks/notifications';
import { CreateVirtualLabFooter } from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';

import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { tryCatch } from '@/api/utils';

export default function CreateVirtualLabForm() {
  const { data } = useSession();
  const notify = useNotification();
  const { push: navigate } = useRouter();
  const [form] = Form.useForm<VirtualLabPayload>();
  const [isFormValid, setIsFormValid] = useState(false);
  const [pending, startTransition] = useTransition();
  const fields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);

  const allowAskCode = Boolean(isFormValid && fields.email_status !== 'verified');
  const allowSubmit = Boolean(fields?.email_status === 'verified');
  const useName = data?.user.name ?? data?.user.username;

  const resetForm = () => form.resetFields();
  const onCancel = () => navigate('/app/virtual-lab');
  const onValuesChange = (changedValues: VirtualLabPayload, values: VirtualLabPayload) => {
    if ('reference_email' in changedValues && values?.email_status !== 'none') {
      form.setFieldValue('email_status', 'none');
    }
    form
      .validateFields()
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        setIsFormValid(!(error.errorFields.length > 0));
      });
  };

  const onFormSubmit = async (values: VirtualLabPayload) => {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(createVirtualLab(values));
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
        navigate(`/app/virtual-lab/lab/${result.data.virtual_lab.id}/overview`);
      }
    });
  };

  return (
    <ConfigProvider theme={{ hashed: false }}>
      <motion.div
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
        <Form
          name="virtual-lab-creation-flow-step"
          form={form}
          layout="vertical"
          onFinish={onFormSubmit}
          className="relative flex h-full flex-grow flex-col px-4 py-2"
          requiredMark={false}
          validateTrigger={['onChange']}
          initialValues={{
            name: `${useName}'s virtual lab`,
            description: '',
            entity: null,
            include_members: [],
          }}
          onValuesChange={onValuesChange}
          disabled={pending}
        >
          <Overview allowAskCode={allowAskCode} />
          <CreateVirtualLabFooter
            {...{
              onCancel,
              loading: pending,
              disabled: !isFormValid || pending || !allowSubmit,
            }}
          />
        </Form>
      </motion.div>
    </ConfigProvider>
  );
}
