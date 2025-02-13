import { useState } from 'react';
import { Form, Popover } from 'antd';
import { CheckCircleFilled, InfoCircleOutlined } from '@ant-design/icons';

import AdministratorEmail from '@/components/VirtualLab/create-entity/virtual-lab/verification-code';
import { Input, TextArea } from '@/components/VirtualLab/create-entity/common/inputs';
import { classNames } from '@/util/utils';
import { checkVirtualLabExists } from '@/api/virtual-lab-svc/queries/virtual-lab';

type Props = {
  allowAskCode: boolean;
};

export default function Overview({ allowAskCode }: Props) {
  const [validName, setValidName] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-8">
        <Form.Item
          validateDebounce={500}
          label={<span className="font-semibold text-primary-8">Virtual Lab&#39;s Name</span>}
          name="name"
          className="w-full flex-1"
          rules={[
            { required: true, message: 'Please enter lab name' },
            {
              max: 80,
              message: 'Virtual lab name cannot exceed 80 characters!',
            },
            {
              validator: async (_: any, name: string) => {
                if (!name.trim()) return;
                const exists = await checkVirtualLabExists({ name });
                if (exists) {
                  setValidName(false);
                  return Promise.reject(new Error(`This virtual lab name is already taken.`));
                }
                setValidName(true);
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="Enter your virtual lab's name here..."
            suffix={validName && <CheckCircleFilled className="text-base text-teal-600" />}
          />
        </Form.Item>
        <Form.Item
          label={
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary-8">Affiliated entity</span>
              <Popover
                placement="top"
                trigger="hover"
                overlayClassName={classNames(
                  '[&_.ant-popover-inner]:!p-0 [&_.ant-popover-inner]:!bg-primary-8 max-w-[260px]',
                  '[&_.ant-popover-arrow:before]:bg-primary-8'
                )}
                destroyTooltipOnHide
                content={
                  <div className="flex flex-col items-center justify-center gap-4 bg-primary-8 px-5 py-3 text-white">
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
      </div>
      <Form.Item
        label={<span className="font-semibold text-primary-8">Description</span>}
        name="description"
      >
        <TextArea
          rows={4}
          placeholder="Enter your description here"
          className="rounded-none !border border-primary-8"
        />
      </Form.Item>
      <AdministratorEmail allowAskCode={allowAskCode} />
    </div>
  );
}
