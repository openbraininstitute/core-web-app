'use client';

import {
  CheckCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Checkbox, Form } from 'antd';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { match, P } from 'ts-pattern';

import { getCountries } from '@/api/virtual-lab-svc/queries/config';
import { checkUserProfileEmailAvailability } from '@/api/virtual-lab-svc/queries/user';
import { useAppNotification } from '@/components/notification';
import { Button } from '@/ui/molecules/button';
import { CustomFormError, createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { cn } from '@/utils/css-class';

import { EntraIdIcon, GitHubIcon, GoogleIcon, Label, Select, XInput } from './elements';
import { useSubmitCallback } from './hooks';
import { ProfileFormSchema } from './validator';

import type {
  TUpdateUserProfileRequest,
  UserProfileResponse,
} from '@/api/virtual-lab-svc/queries/types';
import type { TProfileFormData } from './types';

type ProfileProps = {
  data: UserProfileResponse | undefined;
};

function getIdentityProviderDisplay(identityProvider?: string): {
  icon: React.ReactNode;
  name: string;
} {
  const provider = identityProvider?.toLowerCase() ?? '';

  return match(provider)
    .with(P.string.includes('github'), () => ({ icon: <GitHubIcon />, name: 'GitHub' }))
    .with(P.string.includes('google'), () => ({ icon: <GoogleIcon />, name: 'Google' }))
    .with(
      P.union(
        P.string.includes('microsoft'),
        P.string.includes('entra'),
        P.string.includes('azure')
      ),
      () => ({ icon: <EntraIdIcon />, name: 'Microsoft Entra ID' })
    )
    .otherwise(() => ({ icon: null, name: 'Unknown' }));
}

export function Profile({ data }: ProfileProps) {
  const { data: session } = useSession();
  const initialValues = useInitialValues(data);
  const { error: errorNotify, success: successNotify } = useAppNotification();
  const [form] = Form.useForm<TUpdateUserProfileRequest>();
  const emailAvailabilityCacheRef = useRef(new Map<string, boolean>());
  const [isEmailAvailabilityChecking, setIsEmailAvailabilityChecking] = useState(false);
  const formValues = Form.useWatch([], form);
  const isValid = ProfileFormSchema.safeParse(formValues ?? initialValues).success;
  const [hasEmailError, setEmailError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { mutateAsync, isPending } = useSubmitCallback(errorNotify, successNotify);

  const { data: countries = [], isLoading: isCountriesLoading } = useQuery({
    queryKey: keyBuilder.countries(),
    queryFn: getCountries,
    staleTime: Infinity,
    gcTime: Infinity,
    select: (data) =>
      data.map((country) => ({
        label: country.name,
        value: country.code,
      })),
  });

  const emailErrors = form.getFieldError('email');
  const emailValue = Form.useWatch('email', form);
  const isEmailTouched = form.isFieldTouched('email');
  const normalizedEmailValue = emailValue?.trim().toLowerCase() ?? '';
  const isCurrentEmailAvailable =
    normalizedEmailValue.length > 0 &&
    emailAvailabilityCacheRef.current.get(normalizedEmailValue) === true;
  const isEmailValidating = isEmailAvailabilityChecking;
  const hasEmailErrors = hasEmailError || emailErrors.length > 0;

  const validateEmailAvailability = async (values: TUpdateUserProfileRequest) => {
    const email = values.email.trim().toLowerCase();
    if (!email) return;

    // skip remote checks when schema-level email validation hasn't passed yet.
    if (!ProfileFormSchema.shape.email.safeParse(email).success) {
      return;
    }

    if (emailAvailabilityCacheRef.current.has(email)) {
      const available = emailAvailabilityCacheRef.current.get(email);
      if (!available) {
        throw new CustomFormError('Please make sure the email is correct or try another one.');
      }
      return;
    }

    form.setFields([{ name: 'email', errors: [] }]);
    setIsEmailAvailabilityChecking(true);
    try {
      const available = await checkUserProfileEmailAvailability(email);
      emailAvailabilityCacheRef.current.set(email, available);
      setIsEmailAvailabilityChecking(false);
      if (!available) {
        throw new CustomFormError('Please make sure the email is correct or try another one.');
      }
    } catch (error) {
      setIsEmailAvailabilityChecking(false);
      return Promise.reject(error);
    }
  };

  const baseEmailValidator = createZodFieldValidator(
    ProfileFormSchema,
    'email',
    form,
    validateEmailAvailability
  );

  const emailValidator = async (rule: unknown, value: unknown) => {
    try {
      await baseEmailValidator(rule, value);
      setEmailError(false);
    } catch (error) {
      setEmailError(true);
      return Promise.reject(error);
    }
  };

  const identityProvider = getIdentityProviderDisplay(session?.user?.identityProvider);
  const onSubmit = async (values: TUpdateUserProfileRequest) => {
    await mutateAsync(values);
    setIsEditing(false);
  };

  const formDisabled = !isEditing || isPending;
  const readOnly = !isEditing;

  return (
    <div
      id="profile-form-container"
      data-testid="profile-form-container"
      className="flex items-center justify-center"
    >
      <section className="w-full rounded-2xl bg-white p-7">
        <Form
          id="profile-form"
          data-testid="profile-form"
          form={form}
          layout="vertical"
          className="profile-form"
          initialValues={initialValues}
          disabled={formDisabled}
          onFinish={onSubmit}
          scrollToFirstError
          autoComplete="off"
          requiredMark={false}
          preserve={false}
          validateTrigger={isEditing ? ['onBlur', 'onChange'] : []}
          rootClassName={cn(
            '[&_.ant-form-item]:mb-0! [&_.ant-form-item-explain-error]:text-sm! w-f',
            '[&_.ant-form-item-explain-error]:pl-0.5! [&_.ant-form-item-explain-error]:select-none!'
          )}
        >
          <div className="grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-4 p-4 md:grid-cols-2">
            <Form.Item
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'first_name', form),
                },
              ]}
              className="w-full min-w-0 [&_.ant-form-item-label]:pb-0!"
              name="first_name"
              label={<Label title="First Name" className="text-primary-9" required />}
            >
              <XInput
                id="first_name"
                name="first_name"
                type="text"
                plain={readOnly}
                className="w-full"
              />
            </Form.Item>
            <Form.Item
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'last_name', form),
                },
              ]}
              name="last_name"
              className="w-full min-w-0 [&_.ant-form-item-label]:pb-0!"
              label={<Label title="Last Name" className="text-primary-9" required />}
            >
              <XInput
                id="last_name"
                name="last_name"
                type="text"
                plain={readOnly}
                className="w-full"
              />
            </Form.Item>
            <Form.Item
              name="email"
              className="w-full min-w-0 md:col-span-2 [&_.ant-form-item-label]:pb-0!"
              validateDebounce={isEditing ? 500 : 0}
              validateStatus={
                !isEditing
                  ? undefined
                  : isEmailValidating
                    ? 'validating'
                    : hasEmailErrors
                      ? 'error'
                      : undefined
              }
              label={<Label title="Email" className="text-primary-9" required />}
              rules={[
                {
                  required: true,
                  validator: emailValidator,
                },
              ]}
            >
              <XInput
                id="email"
                name="email"
                autoComplete="false"
                type="email"
                plain={readOnly}
                className={cn('w-full', !readOnly && 'disabled:text-white!')}
                suffix={
                  isEditing ? (
                    <span className="inline-flex w-4 items-center justify-center">
                      {isEmailValidating ? (
                        <LoadingOutlined />
                      ) : hasEmailErrors ? (
                        <CloseCircleFilled className="text-destructive" />
                      ) : isEmailTouched && isCurrentEmailAvailable ? (
                        <CheckCircleFilled className="text-teal-600" />
                      ) : null}
                    </span>
                  ) : null
                }
              />
            </Form.Item>

            <div className="md:col-span-2">
              <Label
                title="Social Login"
                className="text-primary-9 [&_.ant-form-item-label]:pb-0!"
              />
              <div
                className={cn(
                  'flex h-12 min-h-12 items-center gap-2 rounded-lg py-2 text-primary-9',
                  'transition-[padding,border-color,box-shadow] duration-200 ease-in-out border-2!',
                  readOnly ? 'border-transparent px-0 py-2' : 'border-gray-100! px-3 py-2'
                )}
              >
                {identityProvider.icon}
                <span className="font-bold select-none">
                  {identityProvider.name}
                  {data?.preferred_username && (
                    <span className="ml-2 font-normal text-neutral-4">
                      ({data.preferred_username})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="border mt-4 border-gray-100 rounded-lg p-4 w-full grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Form.Item
              name="street"
              className="md:col-span-2 [&_.ant-form-item-label]:pb-0!"
              label={<Label title="Address" className="text-primary-9" />}
            >
              <XInput id="street" name="street" type="text" plain={readOnly} />
            </Form.Item>
            <Form.Item
              name="postal_code"
              className="[&_.ant-form-item-label]:pb-0!"
              label={<Label title="Postal Code" className="text-primary-9" />}
            >
              <XInput id="postal_code" name="postal_code" type="text" plain={readOnly} />
            </Form.Item>
            <Form.Item
              name="locality"
              className="[&_.ant-form-item-label]:pb-0!"
              label={<Label title="City" className="text-primary-9" />}
            >
              <XInput id="locality" name="locality" type="text" plain={readOnly} />
            </Form.Item>
            <Form.Item
              name="region"
              className="[&_.ant-form-item-label]:pb-0!"
              label={<Label title="State/Canton" className="text-primary-9" />}
            >
              <XInput id="region" name="region" type="text" plain={readOnly} />
            </Form.Item>
            <Form.Item
              name="country"
              className="[&_.ant-form-item-label]:pb-0!"
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'country', form),
                },
              ]}
              label={<Label title="Country" className="text-primary-9" required />}
            >
              <Select
                showSearch
                id="country"
                size="large"
                placeholder={
                  readOnly ? (
                    isCountriesLoading ? (
                      <LoadingOutlined />
                    ) : (
                      <span className="text-primary-9">\u2014</span>
                    )
                  ) : isCountriesLoading ? (
                    <LoadingOutlined />
                  ) : (
                    <span className="text-primary-9">Select a country</span>
                  )
                }
                className={cn(
                  'min-h-12 rounded-lg min-w-36 shadow-none ring-0',
                  'transition-[border-color,box-shadow] duration-200 ease-in-out',
                  '[&_.ant-select-selector]:bg-transparent!',
                  'hover:bg-transparent! [&_.ant-select-selection-item]:text-primary-9!',
                  '[&_.ant-select-selection-item]:font-bold! [&_.ant-select-selection-search-input]:text-primary-9!',
                  '[&_.ant-select-selection-placeholder]:text-primary-9!',
                  {
                    [cn(
                      'border-0! border-transparent!',
                      '[&_.ant-select-selector]:border-0! [&_.ant-select-selector]:shadow-none!',
                      '[&_.ant-select-selector]:px-0! [&_.ant-select-selector]:py-0!',
                      '[&.ant-select-disabled]:text-primary-9!',
                      '[&_.ant-select-selection-item]:text-primary-9! [&.ant-select-disabled_.ant-select-selector]:text-primary-9!',
                      '[&.ant-select-outlined:not(.ant-select-customize-input)_.ant-select-selector]:border-0!',
                      '[&_.ant-select-arrow]:hidden'
                    )]: readOnly,
                  },
                  {
                    [cn(
                      'border-gray-100! focus:border-2! [&.ant-select-focused]:border-2',
                      '[&.ant-select-focused_.ant-select-selector]:ring-0!',
                      'focus:[&_.ant-select-selector]:border-2!',
                      'hover:border-gray-200!'
                    )]: !readOnly,
                  }
                )}
                classNames={{ popup: { root: 'rounded-none shadow-md' } }}
                loading={isCountriesLoading}
                filterOption={(input, option) =>
                  (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={countries}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="sync_billing_address"
            valuePropName="checked"
            className={cn(
              'md:col-span-2 [&_.ant-form-item-label]:pb-0!',
              readOnly && 'invisible pointer-events-none'
            )}
            aria-hidden={readOnly}
          >
            <Checkbox className={cn('text-primary-9')}>
              Use this address as my billing address
            </Checkbox>
          </Form.Item>
          <div className="relative mt-3 min-h-14">
            {isEditing ? (
              <div
                key="profile-form-actions-edit"
                className="absolute inset-y-0 right-0 flex flex-wrap items-center justify-end gap-3"
              >
                <Button
                  rounded
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="rounded-full px-8 py-2 text-base font-semibold transition-colors"
                  onClick={() => {
                    form.resetFields();
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <GhostRoundedIconButton
                  key="update-profile-btn"
                  type="submit"
                  label="Update"
                  disabled={isPending || !isValid}
                  icon={isPending && <LoadingOutlined spin />}
                  classNames={{
                    root: 'bg-primary-9 text-white hover:bg-primary-8 group',
                    label: 'text-white',
                    iconWrapper: 'bg-primary-9 text-white! group-hover:bg-primary-8!',
                  }}
                />
              </div>
            ) : (
              <div
                key="profile-form-actions-view"
                className="absolute inset-y-0 right-0 flex items-center justify-end"
              >
                <GhostRoundedIconButton
                  icon={<EditOutlined />}
                  label="Edit information"
                  classNames={{ label: 'text-lg font-semibold' }}
                  onClick={() => setIsEditing(true)}
                />
              </div>
            )}
          </div>
        </Form>
      </section>
    </div>
  );
}

export default Profile;

function useInitialValues(data: UserProfileResponse | undefined): TProfileFormData {
  const initialValues: TProfileFormData = {
    email: data?.email ?? '',
    first_name: data?.first_name ?? '',
    last_name: data?.last_name ?? '',
    street: data?.address.street ?? '',
    postal_code: data?.address.postal_code ?? '',
    locality: data?.address.locality ?? '',
    region: data?.address.region ?? '',
    country: data?.address.country ?? '',
    sync_billing_address: false,
  };
  return initialValues;
}
