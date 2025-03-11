'use client';

import React, { ForwardedRef, useEffect, useState, useTransition } from 'react';
import { Form, InputProps, InputRef, Input } from 'antd';
import omit from 'lodash/omit';

import countries from '../../../../../public/static/country';
import useNotification from '@/hooks/notifications';

import { Select } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { updateUserProfile } from '@/api/virtual-lab-svc/queries/user';
import { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

function XInput({ placeholder, className, ...props }: InputProps, ref: ForwardedRef<InputRef>) {
  return (
    <Input
      ref={ref}
      placeholder={placeholder}
      className={classNames(
        'rounded-none border-0 border-b !border-primary-4 !bg-transparent px-1 font-bold tracking-wide text-white focus:ring-0',
        'hover:!bg-transparent hover:!text-white focus:!bg-transparent focus:!text-white [&_.ant-input-outlined]:!bg-transparent',
        'focus:border-pr placeholder:text-white hover:border-white focus:border-b-2',
        'focus-within:!border-b-2 focus-within:!border-primary-4 focus-within:!ring-0',
        '[&.ant-XInput-status-error]:!border-0 [&.ant-XInput-status-error]:!border-b-2 [&.ant-XInput-status-error]:!border-red-300',
        '[&.ant-XInput-status-error]:focus:!ring-0 ',
        className
      )}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

function Label({ title }: { title: string }) {
  return <span className="text-sm font-light text-primary-4">{title}</span>;
}

type Props = {
  data: UserProfileResponse | undefined;
};

function Profile({ data }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const { error: errorNotify, success: successNotify } = useNotification();
  const [form] = Form.useForm<UserProfileResponse>();
  const [pending, startTransition] = useTransition();

  const onSubmit = (values: UserProfileResponse) => {
    startTransition(async () => {
      const { error } = await tryCatch(
        updateUserProfile(omit(values, ['email_verified', 'id', 'email']))
      );
      if (error) {
        errorNotify(
          'Unable to save your profile changes due to a server error.\nPlease verify your information and try submitting again.',
          undefined,
          'topRight',
          true,
          'profile-update-error'
        );
      } else {
        successNotify(
          'Your profile information has been successfully updated',
          undefined,
          'topRight',
          true,
          'profile-update-success'
        );
      }
    });
  };
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;
  return (
    <div className="flex animate-fade-in items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Form
          form={form}
          layout="vertical"
          className="profile-form"
          initialValues={data}
          disabled={pending}
          onFinish={onSubmit}
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            <Form.Item name="first_name" className="space-y-1" label={<Label title="First name" />}>
              <XInput id="first_name" name="first_name" type="text" />
            </Form.Item>
            <Form.Item name="last_name" className="space-y-1" label={<Label title="Last name" />}>
              <XInput id="last_name" name="last_name" type="text" />
            </Form.Item>
            <Form.Item
              name="address"
              className="space-y-1 md:col-span-2"
              label={<Label title="Address" />}
            >
              <XInput id="address" name="address" type="text" />
            </Form.Item>
            <Form.Item
              name="postal_code"
              className="space-y-1"
              label={<Label title="Postal code" />}
            >
              <XInput id="postal_code" name="postal_code" type="text" />
            </Form.Item>

            <Form.Item name="city" className="space-y-1" label={<Label title="City" />}>
              <XInput id="city" name="city" type="text" />
            </Form.Item>
            <Form.Item name="state" className="space-y-1" label={<Label title="State/Canton" />}>
              <XInput id="state" name="state" type="text" />
            </Form.Item>
            <Form.Item name="country" className="space-y-1" label={<Label title="Country" />}>
              <Select
                showSearch
                id="country"
                placeholder="Select a country"
                className={classNames(
                  'min-w-36 border-0 border-b !border-primary-4 ring-0 focus:!border-b-2 [&.ant-select-focused]:border-b-2',
                  'shadow-none ring-0 [&.ant-select-focused_.ant-select-selector]:!ring-0',
                  '[&_.ant-select-selector]:!border-0 [&_.ant-select-selector]:!bg-transparent [&_.ant-select-selector]:focus:!ring-0',
                  '!bg-transparent hover:border-primary-4 hover:!bg-transparent [&_.ant-select-selection-item]:!text-white',
                  '[&_.ant-select-selection-item]:!font-bold [&_.ant-select-selection-search-input]:!text-white',
                  '[&_.ant-select-selection-placeholder]:!text-white'
                )}
                popupClassName="rounded-none shadow-md"
                onSearch={(va) => {
                  const countriesObject = countries.filter((o) =>
                    o.name.toLowerCase().includes(va.toLowerCase())
                  );
                  return countriesObject.map((o) => ({ label: o.name, value: o.name }));
                }}
                options={countries.map((o) => ({
                  label: o.name,
                  value: o.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="email"
              className="space-y-1 md:col-span-2"
              label={<Label title="Email" />}
            >
              <XInput
                id="email"
                name="email"
                type="email"
                className="disabled:!text-white"
                readOnly
                disabled
              />
            </Form.Item>
            <div className="space-y-1 md:col-span-2">
              <Label title="Authentication service" />
              <div className="flex items-center gap-2 border-b border-white/30 py-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                  fill="white"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span className="select-none font-bold text-white">{data?.preferred_username}</span>
              </div>
            </div>
          </div>

          {/* <div className="mt-12 flex justify-end">
            <Button
              key="create-project-btn"
              className={classNames(
                'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
              )}
              type="default"
              size="large"
              htmlType="submit"
              disabled={pending}
              loading={pending}
            >
              Update information
            </Button>
          </div> */}
        </Form>
      </div>
    </div>
  );
}

export default Profile;
