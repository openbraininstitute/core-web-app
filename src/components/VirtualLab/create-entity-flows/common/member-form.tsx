/* eslint-disable react/jsx-props-no-spreading */
import { Button, Form, Select } from 'antd';
import { useEffect, useRef } from 'react';
import filter from 'lodash/filter';

import { classNames } from '@/util/utils';
import { Role } from '@/types/virtual-lab/members';
import { DeleteOutline } from '@/components/icons/EditorIcons';
import { Input } from '@/components/VirtualLab/create-entity-flows/common/inputs';

type Props = {
  ListCompo?: () => JSX.Element;
  cls?: {
    container?: string;
    listContainer?: string;
  };
};

export default function Content({ ListCompo, cls }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const form = Form.useFormInstance<{ include_members: Array<{ email: string; role: Role }> }>();
  const memberField = Form.useWatch(['include_members'], form);
  const prevItemsLength = useRef(memberField?.length || 0);

  useEffect(() => {
    // scroll to bottom only when new items are added
    if (memberField?.length > prevItemsLength.current && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    prevItemsLength.current = memberField?.length;
  }, [memberField?.length]);

  return (
    <div className={classNames('flex w-full flex-col', cls?.container)}>
      {ListCompo && (
        <>
          <ListCompo />
          <div className="my-10 h-px bg-gray-100" />
        </>
      )}
      <Form.List
        name="include_members"
        initialValue={[
          {
            email: '',
            role: 'member',
          },
        ]}
      >
        {(fields, { add, remove }) => (
          <>
            <div
              ref={ref}
              className={classNames('max-h-[250px] overflow-auto px-3', cls?.listContainer)}
            >
              {fields.map(({ key, name, ...restField }) => (
                <div
                  key={key}
                  className="my-5 flex w-full animate-fade-in items-center justify-between gap-5"
                >
                  <Form.Item
                    {...restField}
                    labelAlign="left"
                    className={classNames(
                      'mr-5 w-full flex-[1_60%] [&_.ant-form-item-label]:p-0',
                      '[&_.ant-form-item-row]:flex-row [&_.ant-form-item-row]:flex-nowrap [&_.ant-form-item-row]:items-center'
                    )}
                    label={
                      <span className="whitespace-nowrap pr-4 font-semibold text-primary-8">
                        Invite:
                      </span>
                    }
                    name={[name, 'email']}
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter a valid email' },
                      {
                        validator: async (_, value: string) => {
                          if (value) {
                            const members = form.getFieldValue('include_members');
                            const list = filter(members, { email: value.toLowerCase().trim() });
                            if (list.length > 1) {
                              return Promise.reject(new Error('Email must be unique'));
                            }
                            return Promise.resolve();
                          }
                        },
                      },
                    ]}
                  >
                    <Input type="email" placeholder="Enter email address here" />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    labelAlign="left"
                    label={
                      <span className="whitespace-nowrap pr-4 font-semibold text-gray-400">
                        As a:
                      </span>
                    }
                    className="flex-[1_40%] [&_.ant-form-item-label]:p-0 [&_.ant-form-item-row]:flex-row [&_.ant-form-item-row]:flex-nowrap [&_.ant-form-item-row]:items-center"
                    initialValue="member"
                    name={[name, 'role']}
                  >
                    <Select
                      className={classNames(
                        'min-w-36 border border-gray-300',
                        'w-40 shadow-none ring-0 focus:border-2 focus:border-primary-8',
                        '[&_.ant-select-selector]:rounded-none [&_.ant-select-selector]:!border-0'
                      )}
                      options={[
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Administrator' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="text"
                      htmlType="button"
                      className="px-4"
                      icon={<DeleteOutline className="text-2xl text-pink-700" />}
                      onClick={() => remove(name)}
                    />
                  </Form.Item>
                </div>
              ))}
            </div>
            <Form.Item>
              <Button
                className="h-14 rounded-none border-gray-400 bg-white px-10 text-gray-500 hover:bg-primary-8 hover:!text-white"
                type="default"
                size="large"
                onClick={() => add()}
              >
                Add member{' '}
                <strong className="ml-2">{fields.length > 1 && `(${fields.length})`}</strong>
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </div>
  );
}
