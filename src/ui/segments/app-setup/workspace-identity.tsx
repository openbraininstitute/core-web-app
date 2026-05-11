'use client';

import {
  CheckCircleFilled,
  CloseCircleFilled,
  EditOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Form, Popover } from 'antd';
import { type ComponentProps, type ReactNode, useRef, useState } from 'react';
import z from 'zod';

import { getCountries } from '@/api/virtual-lab-svc/queries/config';
import { checkUserProfileEmailAvailability } from '@/api/virtual-lab-svc/queries/user';
import { Select } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Input } from '@/ui/molecules/input';
import { CustomFormError, createZodFieldValidator } from '@/ui/segments/contribute/shared/helpers';
import {
  personNameRegex,
  personNameRegexMessage,
} from '@/ui/segments/profile/sections/profile-form/validator';
import { keyBuilder } from '@/ui/use-query-keys/user';
import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { TResolvedWorkspace } from '@/ui/segments/app-setup/helpers';

export const WorkspaceIdentitySchema = z.object({
  name: z.string({ message: 'Virtual lab name is required' }).min(1),
  first_name: z
    .string({ message: 'Please enter your first name' })
    .min(1, { message: 'First name is required' })
    .regex(personNameRegex, {
      message: personNameRegexMessage,
    })
    .describe('first name of the user'),
  last_name: z
    .string({ message: 'Please enter your last name' })
    .min(1, { message: 'Last name is required' })
    .regex(personNameRegex, {
      message: personNameRegexMessage,
    })
    .describe('last name of the user'),
  email: z
    .email({ message: 'Please enter your email address' })
    .describe('email address of the user'),
  country: z
    .string({ message: 'Please enter your country' })
    .min(2, { message: 'Country is required' })
    .max(2, { message: 'Country is required' })
    .describe('country of the user'),
  entity: z
    .string({ message: 'Please enter your affiliation' })
    .nonempty({ message: 'Affiliation is required' })
    .describe('entity or organization associated with the virtual lab'),
});

export type TWorkspaceIdentitySchema = z.infer<typeof WorkspaceIdentitySchema>;
const WorkspaceIdentityFormSchema = WorkspaceIdentitySchema.pick({
  first_name: true,
  last_name: true,
  email: true,
  country: true,
  entity: true,
});
function CustomInput({
  value = '',
  disabled = false,
  onEdit,
  extra,
  editable = true,
  ...rest
}: ComponentProps<'input'> & {
  extra?: ReactNode;
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        disabled={disabled}
        className={cn(
          'border-neutral-1 h-auto rounded-full bg-white py-2.5! pr-10 pl-4 shadow-sm md:text-base lg:py-3 lg:text-lg',
          'placeholder:text-sm placeholder:font-light disabled:font-black disabled:opacity-70',
          'focus-visible:text-primary-8! font-black! focus-visible:font-bold! text-primary-8!',
          rest.className
        )}
        {...rest}
      />
      <span className="absolute top-1/2 right-5 -translate-y-1/2 transform">
        {extra ??
          (editable && (
            <EditOutlined
              className="text-neutral-3! hover:text-primary-7! cursor-pointer"
              onClick={onEdit}
            />
          ))}
      </span>
    </div>
  );
}

type EditableFieldState = {
  firstName: boolean;
  lastName: boolean;
  affiliation: boolean;
};

function WorkspaceIdentityFields({
  countries,
  editableField,
  emailErrors,
  form,
  handleEdit,
  isCountriesLoading,
  isCurrentEmailAvailable,
  isEmailTouched,
  isEmailValidating,
  validateEmailAvailability,
  virtualLabName,
}: {
  countries: Array<{ label: string; value: string }>;
  editableField: EditableFieldState;
  emailErrors: string[];
  form: ReturnType<typeof Form.useForm<TWorkspaceIdentitySchema>>[0];
  handleEdit: (fieldName: keyof EditableFieldState) => void;
  isCountriesLoading: boolean;
  isCurrentEmailAvailable: boolean;
  isEmailTouched: boolean;
  isEmailValidating: boolean;
  validateEmailAvailability: (values: TWorkspaceIdentitySchema) => Promise<void>;
  virtualLabName?: string;
}) {
  return (
    <CardContent>
      <Form.Item hidden name="name">
        <input name="name" value={virtualLabName} type="text" hidden readOnly />
      </Form.Item>
      <Form.Item
        name="first_name"
        className="flex-1"
        label={
          <span className="block text-sm text-[#8C8C8C]">
            First name <sup className="text-red-500">*</sup>
          </span>
        }
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(WorkspaceIdentityFormSchema, 'first_name', form),
          },
        ]}
      >
        <CustomInput
          placeholder="Enter your first name"
          disabled={!editableField.firstName}
          onEdit={() => handleEdit('firstName')}
        />
      </Form.Item>
      <Form.Item
        name="last_name"
        className="flex-1"
        label={
          <span className="block text-sm text-[#8C8C8C]">
            Last name <sup className="text-red-500">*</sup>
          </span>
        }
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(WorkspaceIdentityFormSchema, 'last_name', form),
          },
        ]}
      >
        <CustomInput
          placeholder="Enter your last name"
          disabled={!editableField.lastName}
          onEdit={() => handleEdit('lastName')}
        />
      </Form.Item>
      <Form.Item
        name="email"
        className="flex-1"
        validateTrigger={['onChange']}
        validateDebounce={500}
        validateStatus={
          isEmailValidating ? 'validating' : emailErrors.length > 0 ? 'error' : undefined
        }
        label={
          <span className="block text-sm text-[#8C8C8C]">
            Email <sup className="text-red-500">*</sup>
          </span>
        }
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              WorkspaceIdentityFormSchema,
              'email',
              form,
              validateEmailAvailability
            ),
          },
        ]}
      >
        <CustomInput
          placeholder="Enter your email"
          disabled={false}
          editable={false}
          type="email"
          extra={
            isEmailValidating ? (
              <LoadingOutlined />
            ) : emailErrors.length > 0 ? (
              <CloseCircleFilled className="text-destructive" />
            ) : isEmailTouched && isCurrentEmailAvailable ? (
              <CheckCircleFilled className="text-teal-600" />
            ) : null
          }
        />
      </Form.Item>
      <Form.Item
        name="country"
        className="flex-1"
        label={
          <span className="block text-sm text-[#8C8C8C]">
            Country <sup className="text-red-500">*</sup>
          </span>
        }
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(WorkspaceIdentityFormSchema, 'country', form),
          },
        ]}
      >
        <Select
          showSearch
          id="country"
          placeholder={isCountriesLoading ? 'Loading countries...' : 'Select a country'}
          loading={isCountriesLoading}
          filterOption={(input, option) =>
            (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={countries}
          className={classNames(
            'border-neutral-1! h-auto rounded-full bg-white px-1 py-1 text-lg',
            'shadow-sm [&_.ant-select-selector]:border-0! [&_.ant-select-selector]:bg-transparent! [&_.ant-select-selector]:shadow-none!',
            '[&_.ant-select-selection-search-input]:text-primary-8!',
            '[&_.ant-select-selection-item]:text-primary-8! [&_.ant-select-selection-item]:font-black!',
            '[&_.ant-select-selection-placeholder]:text-sm! [&_.ant-select-selection-placeholder]:font-light!'
          )}
        />
      </Form.Item>
      <Form.Item
        label={
          <div className="flex items-center gap-2">
            <span className="block text-sm text-[#8C8C8C]">Affiliation</span>
            <Popover
              placement="top"
              trigger="hover"
              classNames={{
                root: cn(
                  '[&_.ant-popover-inner]:p-0! [&_.ant-popover-inner]:bg-primary-8! max-w-[260px]',
                  '[&_.ant-popover-arrow:before]:bg-primary-8!'
                ),
              }}
              content={
                <div className="bg-primary-8 flex flex-col items-center justify-center gap-4 rounded-lg px-5 py-3 text-white">
                  Organization, University, Company
                </div>
              }
            >
              <InfoCircleOutlined className="text-[#8C8C8C]!" />
            </Popover>
          </div>
        }
        className="w-full flex-1"
        name="entity"
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(WorkspaceIdentityFormSchema, 'entity', form),
          },
        ]}
      >
        <CustomInput
          placeholder="Enter your affiliation here..."
          disabled={false}
          editable={false}
        />
      </Form.Item>
    </CardContent>
  );
}

export function WorkspaceIdentity({
  data,
  move,
}: {
  data: TResolvedWorkspace;
  move: (v: TWorkspaceIdentitySchema & { name: string }) => void;
}) {
  const breakpoint = useDefaultBreakpoint();
  const [form] = Form.useForm<TWorkspaceIdentitySchema>();
  const formValues = Form.useWatch([], form);
  const emailAvailabilityCacheRef = useRef(new Map<string, boolean>());
  const [isEmailAvailabilityChecking, setIsEmailAvailabilityChecking] = useState(false);

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

  const [editableField, setEditableField] = useState<EditableFieldState>({
    firstName: false,
    lastName: false,
    affiliation: false,
  });

  const handleEdit = (fieldName: keyof typeof editableField) => {
    setEditableField((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
  };

  const fullName =
    [data?.profile?.first_name, data?.profile?.last_name].filter(Boolean).join(' ') ||
    data?.profile?.preferred_username ||
    '';

  const virtualLabName = fullName ? `${fullName}'s Virtual lab` : undefined;
  const initialValues: TWorkspaceIdentitySchema = {
    first_name: data?.profile?.first_name ?? '',
    last_name: data?.profile?.last_name ?? '',
    entity: '',
    name: virtualLabName ?? '',
    email: data?.profile?.email ?? '',
    country: data?.profile?.address.country ?? '',
  };

  const isValid = WorkspaceIdentityFormSchema.safeParse(formValues ?? initialValues).success;
  const emailErrors = form.getFieldError('email');
  const emailValue = Form.useWatch('email', form);
  const isEmailTouched = form.isFieldTouched('email');
  const normalizedEmailValue = emailValue?.trim().toLowerCase() ?? '';
  const isCurrentEmailAvailable =
    normalizedEmailValue.length > 0 &&
    emailAvailabilityCacheRef.current.get(normalizedEmailValue) === true;
  const isEmailValidating = isEmailAvailabilityChecking;

  const onFormSubmit = async (vs: TWorkspaceIdentitySchema) =>
    move({
      ...vs,
      name: `${
        [vs.first_name, vs.last_name].filter(Boolean).join(' ') ||
        data?.profile?.preferred_username ||
        ''
      }'s virtual lab`,
    });

  const validateEmailAvailability = async (values: TWorkspaceIdentitySchema) => {
    const email = values.email.trim().toLowerCase();
    if (!email) return;

    if (!WorkspaceIdentityFormSchema.shape.email.safeParse(email).success) {
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

  return (
    <HydrateWrapper>
      <div className="relative z-10 mx-auto flex h-screen w-screen flex-col items-center justify-center md:mt-0">
        <div className="text-neutral-2 flex items-center justify-center gap-2">
          <span className="text-primary-9 font-bold">Account</span>
          <RightOutlined className="text-sm" />
          <span className="text-[#8C8C8C]">Virtual Lab</span>
        </div>
        <div className="flex items-center justify-center">
          <div className="scale-100 transform opacity-100 transition-all duration-500 ease-in-out">
            <Form
              name="virtual-lab-creation-flow-step"
              form={form}
              layout="vertical"
              onFinish={onFormSubmit}
              className={cn(
                'relative flex h-full grow flex-col px-4 py-2 [&_.ant-form-item-explain-error]:pl-2',
                '[&_.ant-form-item-explain-error]:text-sm! [&_.ant-form-item-explain-error]:select-none',
                '[&_.ant-form-item-label]:pb-0!'
              )}
              requiredMark={false}
              initialValues={initialValues}
              validateTrigger={['onBlur', 'onChange']}
            >
              <Card className="mr-4 ml-4 flex w-full max-w-lg min-w-lg flex-col bg-transparent shadow-none backdrop-blur-sm">
                <WorkspaceIdentityFields
                  countries={countries}
                  editableField={editableField}
                  emailErrors={emailErrors}
                  form={form}
                  handleEdit={handleEdit}
                  isCountriesLoading={isCountriesLoading}
                  isCurrentEmailAvailable={isCurrentEmailAvailable}
                  isEmailTouched={isEmailTouched}
                  isEmailValidating={isEmailValidating}
                  validateEmailAvailability={validateEmailAvailability}
                  virtualLabName={virtualLabName}
                />
              </Card>
              <div className="mt-6 text-center">
                <Button
                  rounded
                  size={breakpoint === 'xl' ? 'lg' : 'md'}
                  type="submit"
                  variant="success"
                  className="disabled:bg-neutral-1 disabled:text-neutral-4! hover:disabled:border-neutral-4! h-auto px-8! py-3! font-bold disabled:hover:border"
                  disabled={!isValid || isEmailValidating}
                >
                  {isEmailValidating && <LoadingOutlined />}
                  Create virtual lab
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </HydrateWrapper>
  );
}
