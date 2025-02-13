import { useState } from 'react';
import { Form } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';

import { Input, TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { checkProjectExists } from '@/api/virtual-lab-svc/queries/project';

export default function Overview({ virtualLabId }: { virtualLabId: string }) {
  const [validName, setValidName] = useState<{
    loading: boolean;
    status: 'valid' | 'non-valid' | null;
  }>({
    loading: false,
    status: null,
  });

  return (
    <div className="space-y-6">
      <Form.Item
        validateDebounce={500}
        label={<span className="font-semibold text-primary-8">Project&#39;s Name</span>}
        name="name"
        className="w-full flex-1"
        rules={[
          { required: true, message: 'Please enter lab name' },
          {
            max: 80,
            message: 'Project name cannot exceed 80 characters!',
          },
          {
            validator: async (_: any, name: string) => {
              if (!name.trim()) return;
              try {
                const exists = await checkProjectExists({ vlabId: virtualLabId, name });
                if (exists) {
                  setValidName({ loading: false, status: 'non-valid' });
                  return Promise.reject(new Error(`This project name is already taken.`));
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
          placeholder="Enter your project's name here..."
          suffix={
            // eslint-disable-next-line no-nested-ternary
            validName.loading ? (
              <LoadingOutlined className="text-base text-blue-600" />
            ) : // eslint-disable-next-line no-nested-ternary
            validName.status === 'valid' ? (
              <CheckCircleFilled className="text-base text-teal-600" />
            ) : // eslint-disable-next-line no-nested-ternary
            validName.status === 'non-valid' ? (
              <CloseCircleFilled className="text-base text-pink-600" />
            ) : (
              <span />
            )
          }
        />
      </Form.Item>
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
    </div>
  );
}
