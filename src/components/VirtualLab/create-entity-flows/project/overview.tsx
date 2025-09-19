/* eslint-disable no-nested-ternary */

import { useRef, useState } from 'react';
import { Form } from 'antd';
import { useParams } from 'next/navigation';
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';

import { Input, TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { checkProjectExists } from '@/api/virtual-lab-svc/queries/project';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';

interface IProjectPayload extends ProjectPayload {
  virtual_lab_id: string;
}

export default function Overview() {
  const { virtualLabId } = useParams<{ virtualLabId: string }>();
  const form = Form.useFormInstance<IProjectPayload>();
  const fields = Form.useWatch([], form);
  const nameRef = useRef<string | null>(null);
  const id = virtualLabId ?? fields?.virtual_lab_id;

  const [validName, setValidName] = useState<{
    loading: boolean;
    status: 'valid' | 'non-valid' | null;
  }>({
    loading: false,
    status: null,
  });

  return (
    <div
      data-testid="project-overview"
      className="mx-auto h-full w-full max-w-5xl grow bg-white p-12"
    >
      <Form.Item
        validateDebounce={800}
        label={<span className="text-primary-8 font-semibold">Project&#39;s Name</span>}
        name="name"
        className="w-full flex-1"
        rules={[
          { required: true, message: 'Please enter project name' },
          {
            max: 60,
            message: 'Project name cannot exceed 60 characters!',
          },
          {
            validator: async (_: any, name: string) => {
              if (name === nameRef.current) return;
              if (!name?.trim()) {
                setValidName({ loading: false, status: 'non-valid' });
                return Promise.reject();
              }
              nameRef.current = name;
              try {
                setValidName({ loading: true, status: null });
                const exists = await checkProjectExists({ vlabId: id, name });
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
    </div>
  );
}
