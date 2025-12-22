'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { useState } from 'react';
import type { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { Select } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import countries from '../../../../../public/static/country';
import { Label, XInput } from './elements';
import { useFieldsChangeHandler, useSubmitCallback } from './hooks';
import type { ProfileFormData } from './types';
import { validate, validateEMail } from './validator';

type ProfileProps = {
  data: UserProfileResponse | undefined;
};

export function Profile({ data }: ProfileProps) {
  const initialValues = useInitialValues(data);
  const { error: errorNotify, success: successNotify } = useAppNotification();
  const [, setValid] = useState(validate(initialValues));
  const handleFieldsChange = useFieldsChangeHandler(setValid);
  const [form] = Form.useForm<UserProfileResponse>();
  const { mutateAsync, isPending } = useSubmitCallback(errorNotify, successNotify);

  return (
    <div
      data-testid="profile-form-container"
      className="animate-fade-in flex items-center justify-center p-4"
    >
      <div className="w-full max-w-3xl">
        <Form
          data-testid="profile-form"
          form={form}
          layout="vertical"
          className="profile-form"
          initialValues={initialValues}
          disabled={isPending}
          onFinish={mutateAsync}
          onInvalid={() => setValid(false)}
          scrollToFirstError
          onFieldsChange={handleFieldsChange}
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            <Form.Item name="first_name" className="space-y-1" label={<Label title="First name" />}>
              <XInput id="first_name" name="first_name" type="text" />
            </Form.Item>
            <Form.Item name="last_name" className="space-y-1" label={<Label title="Last name" />}>
              <XInput id="last_name" name="last_name" type="text" />
            </Form.Item>
            <Form.Item
              name="street"
              className="space-y-1 md:col-span-2"
              label={<Label title="Address" />}
            >
              <XInput id="street" name="street" type="text" />
            </Form.Item>
            <Form.Item
              name="postal_code"
              className="space-y-1"
              label={<Label title="Postal code" />}
            >
              <XInput id="postal_code" name="postal_code" type="text" />
            </Form.Item>

            <Form.Item name="locality" className="space-y-1" label={<Label title="City" />}>
              <XInput id="locality" name="locality" type="text" />
            </Form.Item>
            <Form.Item name="region" className="space-y-1" label={<Label title="State/Canton" />}>
              <XInput id="region" name="region" type="text" />
            </Form.Item>
            <Form.Item name="country" className="space-y-1" label={<Label title="Country" />}>
              <Select
                showSearch
                id="country"
                placeholder="Select a country"
                className={classNames(
                  'border-primary-4! min-w-36 border-0 border-b ring-0 focus:border-b-2! [&.ant-select-focused]:border-b-2',
                  'shadow-none ring-0 [&.ant-select-focused_.ant-select-selector]:ring-0!',
                  '[&_.ant-select-selector]:border-0! [&_.ant-select-selector]:bg-transparent! focus:[&_.ant-select-selector]:ring-0!',
                  'hover:border-primary-4 bg-transparent! hover:bg-transparent! [&_.ant-select-selection-item]:text-white!',
                  '[&_.ant-select-selection-item]:font-bold! [&_.ant-select-selection-search-input]:text-white!',
                  '[&_.ant-select-selection-placeholder]:text-white!'
                )}
                popupClassName="rounded-none shadow-md"
                onSearch={(va) => {
                  const countriesObject = countries
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter((o) => o.name.toLowerCase().includes(va.toLowerCase()));
                  return countriesObject.map((o) => ({
                    label: o.name,
                    value: o.name,
                  }));
                }}
                options={countries
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((o) => ({
                    label: o.name,
                    value: o.name,
                  }))}
              />
            </Form.Item>

            <Form.Item
              name="email"
              className="space-y-1 md:col-span-2"
              label={<Label title="Email" />}
              rules={[{ required: true, validator: validateEMail }]}
            >
              <XInput id="email" name="email" type="email" className="disabled:text-white!" />
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
                <span className="font-bold text-white select-none">{data?.preferred_username}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              rounded
              key="update-profile-btn"
              type="submit"
              variant="default"
              size="lg"
              className={cn(
                'border-primary-4! w-max border shadow-2xl',
                'hover:bg-primary-8/40',
                'hover:shadow-[1px_2px_4px_0px_#00000099]',
                'shadow-[8px_12px_24px_0px_#00000099]',
                'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
              )}
              disabled={isPending}
            >
              <div className="flex items-center gap-2 px-6">
                Update
                {isPending && <LoadingOutlined spin />}
              </div>
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Profile;

function useInitialValues(data: UserProfileResponse | undefined): ProfileFormData {
  const initialValues: ProfileFormData = {
    email: data?.email ?? '',
    first_name: data?.first_name ?? '',
    last_name: data?.last_name ?? '',
    street: data?.address.street ?? '',
    postal_code: data?.address.postal_code ?? '',
    locality: data?.address.locality ?? '',
    region: data?.address.region ?? '',
    country: data?.address.country ?? '',
  };
  return initialValues;
}
