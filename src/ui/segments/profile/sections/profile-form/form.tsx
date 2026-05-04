'use client';

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Form } from 'antd';
import { useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { match, P } from 'ts-pattern';

import { getCountries } from '@/api/virtual-lab-svc/queries/config';
import { checkUserProfileEmailAvailability } from '@/api/virtual-lab-svc/queries/user';
import { useAppNotification } from '@/components/notification';
import { Button } from '@/ui/molecules/button';
import { CustomFormError, createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import { EntraIdIcon, GitHubIcon, GoogleIcon, Label, label, Select, XInput } from './elements';
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
      if (!available) {
        throw new CustomFormError('Please make sure the email is correct or try another one.');
      }
    } finally {
      setIsEmailAvailabilityChecking(false);
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
      throw error;
    }
  };

  return (
    <div
      id="profile-form-container"
      data-testid="profile-form-container"
      className="animate-fade-in flex items-center justify-center p-4"
    >
      <div className="w-full max-w-3xl">
        <Form
          id="profile-form"
          data-testid="profile-form"
          form={form}
          layout="vertical"
          className="profile-form"
          initialValues={initialValues}
          disabled={isPending}
          onFinish={mutateAsync}
          scrollToFirstError
          autoComplete="false"
          requiredMark={false}
          preserve={false}
          rootClassName={cn(
            '[&_.ant-form-item-explain-error]:text-sm! ',
            '[&_.ant-form-item-explain-error]:pl-0.5! [&_.ant-form-item-explain-error]:select-none!'
          )}
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            <Form.Item
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'first_name', form),
                },
              ]}
              name="first_name"
              className="space-y-1"
              label={label('First name', <sup className="text-base text-red-500">*</sup>)}
            >
              <XInput id="first_name" name="first_name" type="text" />
            </Form.Item>
            <Form.Item
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'last_name', form),
                },
              ]}
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
            <Form.Item
              name="country"
              className="space-y-1"
              rules={[
                {
                  required: true,
                  validator: createZodFieldValidator(ProfileFormSchema, 'country', form),
                },
              ]}
              label={label('Country', <sup className="text-base text-red-500">*</sup>)}
            >
              <Select
                showSearch
                id="country"
                placeholder={isCountriesLoading ? 'Loading countries...' : 'Select a country'}
                className={classNames(
                  'border-primary-4! min-w-36 border-0 border-b ring-0 focus:border-b-2! [&.ant-select-focused]:border-b-2',
                  'shadow-none ring-0 [&.ant-select-focused_.ant-select-selector]:ring-0!',
                  '[&_.ant-select-selector]:border-0! [&_.ant-select-selector]:bg-transparent! focus:[&_.ant-select-selector]:ring-0!',
                  'hover:border-primary-4 bg-transparent! hover:bg-transparent! [&_.ant-select-selection-item]:text-white!',
                  '[&_.ant-select-selection-item]:font-bold! [&_.ant-select-selection-search-input]:text-white!',
                  '[&_.ant-select-selection-placeholder]:text-white!'
                )}
                classNames={{ popup: { root: 'rounded-none shadow-md' } }}
                loading={isCountriesLoading}
                filterOption={(input, option) =>
                  (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={countries}
              />
            </Form.Item>

            <Form.Item
              name="email"
              className="space-y-1 md:col-span-2"
              validateTrigger={['onChange']}
              validateDebounce={500}
              validateStatus={
                isEmailValidating ? 'validating' : hasEmailErrors ? 'error' : undefined
              }
              label={label('Email', <sup className="text-base text-red-500">*</sup>)}
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
                className="disabled:text-white!"
                suffix={
                  <span className="inline-flex w-4 items-center justify-center">
                    {isEmailValidating ? (
                      <LoadingOutlined />
                    ) : hasEmailErrors ? (
                      <CloseCircleFilled className="text-destructive" />
                    ) : isEmailTouched && isCurrentEmailAvailable ? (
                      <CheckCircleFilled className="text-teal-600" />
                    ) : null}
                  </span>
                }
              />
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
              disabled={isPending || !isValid || isEmailValidating || hasEmailErrors}
            >
              <div className="flex items-center gap-2 px-6">
                {isPending && <LoadingOutlined />}
                Update
              </div>
            </Button>
          </div>
        </Form>
      </div>
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
  };
  return initialValues;
}
