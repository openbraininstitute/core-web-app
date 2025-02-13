/* eslint-disable react/jsx-props-no-spreading */
import { Avatar, Button, Form, Select } from 'antd';
import { useEffect, useRef } from 'react';
import get from 'lodash/get';
import nth from 'lodash/nth';

import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import {
  MemberRoleMap,
  TMember,
  SIZE_MAP,
} from '@/components/VirtualLab/create-entity/common/types';
import { Input } from '@/components/VirtualLab/create-entity/common/inputs';
import { DeleteOutline } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';
import { COLOR_DICTIONARY } from '@/util/color';

export function MAvatar({
  index,
  role,
  initials,
  name,
  email,
  size = 'small',
  layout = 'horizontal',
  status,
  cls,
}: TMember & {
  size?: 'small' | 'medium' | 'large';
  layout?: 'vertical' | 'horizontal';
  cls?: {
    container?: string;
    text?: string;
    role?: string;
    avatar?: string;
  };
}) {
  const color = nth(COLOR_DICTIONARY, index)?.color ?? '#fff';
  const bgColor = nth(COLOR_DICTIONARY, index)?.background ?? '#000';
  const scale = get(SIZE_MAP, size, undefined);

  return (
    <div className="flex items-center justify-between">
      <div
        className={classNames(
          'flex w-full items-center',
          layout === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-2',
          cls?.container
        )}
      >
        <Avatar
          className={classNames(
            'flex items-center justify-center text-center',
            '[&_.ant-avatar-string]:text-xl [&_.ant-avatar-string]:font-bold',
            role === 'admin' && '!rounded-none',
            scale,
            cls?.avatar
          )}
          size="large"
          shape={role === 'admin' ? 'square' : 'circle'}
          style={{ backgroundColor: bgColor, color }}
        >
          {initials}
        </Avatar>
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3
              className={classNames(
                'text-xl font-bold  text-primary-8',
                status !== 'pending' && 'first-letter:uppercase',
                cls?.text
              )}
            >
              {name}
              {layout === 'horizontal' && status === 'pending' && (
                <ClockCircleOutlined className="ml-2 text-white" />
              )}
              {layout === 'horizontal' && status === 'accept' && (
                <CheckCircleFilled className="ml-2 text-white" />
              )}
            </h3>
            <small
              className={classNames(
                'text-base font-light text-gray-400',
                layout === 'vertical' && 'hidden'
              )}
            >
              {email}
            </small>
          </div>
          <p
            className={classNames(
              'capitalize text-gray-500',
              layout === 'vertical' && 'hidden',
              cls?.role
            )}
          >
            {MemberRoleMap[role]}
          </p>
        </div>
      </div>
    </div>
  );
}

export function List({ members }: { members: Array<Omit<TMember, 'index'>> }) {
  return (
    <div className="space-y-6">
      {members.map(({ id, role, initials, name, email }, index) => (
        <MAvatar key={id} {...{ index, id, role, initials, name, email }} />
      ))}
    </div>
  );
}

type Props = {
  ListCompo?: () => JSX.Element;
  cls?: {
    container?: string;
    listContainer?: string;
  };
};

export default function Content({ ListCompo, cls }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const form = Form.useFormInstance<{ include_members: Array<any> }>();
  const memberField = Form.useWatch(['include_members'], form);
  const prevItemsLength = useRef(memberField?.length || 0);

  useEffect(() => {
    // Scroll to bottom only when new items are added
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
                    className="mr-5 w-full flex-[1_60%] [&_.ant-form-item-label]:p-0 [&_.ant-form-item-row]:flex-row [&_.ant-form-item-row]:flex-nowrap [&_.ant-form-item-row]:items-center"
                    label={
                      <span className="whitespace-nowrap pr-4 font-semibold text-primary-8">
                        Invite:
                      </span>
                    }
                    name={[name, 'email']}
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter a valid email' },
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
