import { useState } from 'react';
import { Tabs, Form } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import CreateEntityModal from '@/components/VirtualLab/create-entity/common/modal';
import MemberList, { List } from '@/components/VirtualLab/create-entity/common/members';
import Overview from '@/components/VirtualLab/create-entity/virtual-lab/overview';
import Footer from '@/components/VirtualLab/create-entity/virtual-lab/footer';
import useNotification from '@/hooks/notifications';

import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { extractInitials } from '@/util/slugify';
import { classNames } from '@/util/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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

export default function CreationSteps({ isOpen, onClose }: Props) {
  const notify = useNotification();
  const { push: navigate } = useRouter();
  const [form] = Form.useForm<VirtualLabPayload>();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'information' | 'members'>('information');
  const overviewFields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);
  const [isFormValid, setIsFormValid] = useState(false);

  const disableNext = Boolean(!(isFormValid && overviewFields.email_status === 'verified'));
  const allowAskCode = Boolean(isFormValid && overviewFields.email_status !== 'verified');

  const onNextStep = () => setActiveTab('members');
  const onPreviousStep = () => setActiveTab('information');
  const resetForm = () => form.resetFields();

  const onModalClose = () => {
    setActiveTab('information');
    resetForm();
    onClose();
  };

  const onValuesChange = (changedValues: any, values: VirtualLabPayload) => {
    console.log('ᦨ #  index.tsx:70 #  onValuesChange #  changedValues:', changedValues);
    console.log('ᦨ #  index.tsx:70 #  onValuesChange #  values:', values);

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
      const {
        data: { virtual_lab: vlab },
      } = await createVirtualLab(values);
      notify.success(
        'Your Virtual Lab has been created successfully and is now ready to use.',
        undefined,
        'topRight',
        undefined
      );
      onClose();
      resetForm();
      const labUrl = generateLabUrl(vlab.id);
      navigate(`${labUrl}/overview`);
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
    <CreateEntityModal isOpen={isOpen} footer={null} onClose={onModalClose}>
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
            entity: null,
            include_members: [],
          }}
          onValuesChange={onValuesChange}
        >
          <Tabs
            activeKey={activeTab}
            indicator={{ size: 0 }}
            items={[
              {
                key: 'information',
                label: 'INFORMATION',
                children: <Overview allowAskCode={allowAskCode} />,
              },
              {
                disabled: true,
                className: 'cursor-default',
                key: 'separator',
                label: <CaretRightOutlined />,
              },
              {
                key: 'members',
                label: 'MEMBERS',
                children: <MemberList ListCompo={Members} />,
              },
            ]}
            className={classNames(
              '[&_.ant-tabs-nav]:!mb-10 [&_.ant-tabs-nav]:border-b [&_.ant-tabs-nav]:border-gray-200 [&_.ant-tabs-nav]:!p-0',
              '[&_.ant-tabs-tab-active]:font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-gray-500 [&_.ant-tabs-tab-btn]:!text-gray-400',
              '[&_.ant-tabs-tab]'
            )}
          />
          <Footer
            {...{
              activeTab,
              onClose: onModalClose,
              onNextStep,
              onPreviousStep,
              disableNext,
              loading,
              disableCreate: !isFormValid,
            }}
          />
        </Form>
      </div>
    </CreateEntityModal>
  );
}
