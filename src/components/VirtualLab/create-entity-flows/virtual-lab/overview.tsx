/* eslint-disable no-nested-ternary */

import { useEffect, useRef, useState } from 'react';
import { Form, Popover } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

import AdministratorEmail from '@/components/VirtualLab/create-entity-flows/virtual-lab/verification-code';
import { Input, TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { checkVirtualLabExists } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { classNames } from '@/util/utils';

type Props = {
  allowAskCode: boolean;
};

export default function Overview({ allowAskCode }: Props) {
  const [hydrated, setHydrated] = useState(false);

  const nameRef = useRef<string | null>(null);
  const [validName, setValidName] = useState<{
    loading: boolean;
    status: 'valid' | 'non-valid' | null;
  }>({
    loading: false,
    status: null,
  });
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  return (
    <div
      data-testid="lab-overview-form"
      className="mx-auto h-full w-full max-w-5xl grow bg-white p-12"
    >
      <Form.Item
        validateDebounce={800}
        label={<span className="text-primary-8 font-semibold">Virtual Lab&#39;s Name</span>}
        name="name"
        className="w-full flex-1"
        validateTrigger={['onBlur']}
        rules={[
          { required: true, message: 'Please enter lab name' },
          {
            max: 80,
            message: 'Virtual lab name cannot exceed 80 characters!',
          },
          {
            validator: async (_: any, name: string) => {
              if (name === nameRef.current) return;
              if (!name?.trim()) return;
              nameRef.current = name;
              try {
                setValidName({ loading: true, status: null });
                const exists = await checkVirtualLabExists({ name });
                if (exists) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject(
                    new Error(
                      'Another virtual lab with same name already exists, Please use a different name.'
                    )
                  );
                }
                setValidName({ loading: false, status: 'valid' });
                return Promise.resolve();
              } catch (error) {
                setValidName({ loading: false, status: 'non-valid' });
              }
            },
          },
        ]}
      >
        <Input
          placeholder="Enter your virtual lab's name here..."
          suffix={
            validName.loading ? (
              <LoadingOutlined className="text-base text-blue-600" />
            ) : validName.status === 'valid' ? (
              <CheckCircleFilled className="text-base text-teal-600" />
            ) : validName.status === 'non-valid' ? (
              <CloseCircleFilled className="text-base text-pink-600" />
            ) : (
              <span />
            )
          }
        />
      </Form.Item>
      <Form.Item
        label={<span className="text-primary-8 font-semibold">Description</span>}
        name="description"
      >
        <TextArea
          rows={4}
          placeholder="Enter your description here"
          className="border-primary-8 rounded-none border!"
        />
      </Form.Item>
      <Form.Item
        label={
          <div className="flex items-center gap-2">
            <span className="text-primary-8 font-semibold">Affiliated entity</span>
            <Popover
              destroyTooltipOnHide
              placement="top"
              trigger="hover"
              classNames={{
                root: classNames(
                  '[&_.ant-popover-inner]:p-0! [&_.ant-popover-inner]:bg-primary-8! max-w-[260px]',
                  '[&_.ant-popover-arrow:before]:bg-primary-8'
                ),
              }}
              content={
                <div className="bg-primary-8 flex flex-col items-center justify-center gap-4 px-5 py-3 text-white">
                  Organization, University, Company
                </div>
              }
            >
              <InfoCircleOutlined className="text-gray-400" />
            </Popover>
          </div>
        }
        className="w-full flex-1"
        name="entity"
        rules={[{ required: true, message: 'Please enter affiliated entity' }]}
      >
        <Input placeholder="Enter your entity here..." />
      </Form.Item>
      <AdministratorEmail allowAskCode={allowAskCode} />
    </div>
  );
}
