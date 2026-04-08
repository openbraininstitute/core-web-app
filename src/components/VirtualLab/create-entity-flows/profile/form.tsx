'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Form } from 'antd';
import { useSession } from 'next-auth/react';

import countries from '../../../../../public/static/country';
import { ProfileFormData } from './types';
import { label, Label, XInput } from './elements';
import { validate, validateEMail } from './validator';
import { useFieldsChangeHandler, useSubmitCallback } from './hooks';
import { Select } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { UserProfileResponse } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

type ProfileProps = {
  data: UserProfileResponse | undefined;
};

function GitHubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="white">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function EntraIdIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="16" height="16">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function getIdentityProviderDisplay(identityProvider?: string): {
  icon: React.ReactNode;
  name: string;
} {
  const provider = identityProvider?.toLowerCase() ?? '';

  if (provider.includes('github')) {
    return { icon: <GitHubIcon />, name: 'GitHub' };
  }
  if (provider.includes('google')) {
    return { icon: <GoogleIcon />, name: 'Google' };
  }
  if (provider.includes('microsoft') || provider.includes('entra') || provider.includes('azure')) {
    return { icon: <EntraIdIcon />, name: 'Microsoft Entra ID' };
  }

  return { icon: null, name: 'Unknown' };
}

export function Profile({ data }: ProfileProps) {
  const { data: session } = useSession();
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
          requiredMark={false}
          preserve={false}
          onFieldsChange={handleFieldsChange}
          rootClassName={cn(
            '[&_.ant-form-item-explain-error]:text-sm! ',
            '[&_.ant-form-item-explain-error]:pl-0.5! [&_.ant-form-item-explain-error]:select-none!'
          )}
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            <Form.Item
              rules={[{ required: true, message: 'Please provide a first name!' }]}
              name="first_name"
              className="space-y-1"
              label={label('First name', <sup className="text-base text-red-500">*</sup>)}
            >
              <XInput id="first_name" name="first_name" type="text" />
            </Form.Item>
            <Form.Item
              rules={[{ required: true, message: 'Please provide a last name!' }]}
              name="last_name"
              className="space-y-1"
              label={label('Last name', <sup className="text-base text-red-500">*</sup>)}
            >
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
                  return countriesObject.map((o) => ({ label: o.name, value: o.name }));
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
              <Label title="Social login" />
              <div className="flex items-center gap-2 border-b border-white/30 py-2">
                {getIdentityProviderDisplay(session?.user?.identityProvider).icon}
                <span className="font-bold text-white select-none">
                  {getIdentityProviderDisplay(session?.user?.identityProvider).name}
                  {data?.preferred_username && (
                    <span className="ml-2 font-normal text-white/70">
                      ({data.preferred_username})
                    </span>
                  )}
                </span>
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
