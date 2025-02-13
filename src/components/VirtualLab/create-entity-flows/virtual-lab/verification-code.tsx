import { useState } from 'react';
import { Form, Button, Alert } from 'antd';
import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';

import {
  getEmailVerificationCode,
  verifyOtpCode,
} from '@/api/virtual-lab-svc/queries/email-verification';
import { Input } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { classNames } from '@/util/utils';

import VerificationCode from '@/components/VirtualLab/create-entity-flows/common/otp-code';
import { VirtualLabPayloadSchema } from '@/api/virtual-lab-svc/validation';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';

const StatusMessageMap = {
  expired: 'The verification code has expired. Please request a new one.',
  locked:
    'You have been temporarily locked due to too many failed attempts. Please try again in a few minutes.',
  failed: 'Verification failed. Please double-check the code and try again.',
  already_verified:
    'This email has already been used for a Virtual Lab with this name. Please choose a different name.',
};

const schema = VirtualLabPayloadSchema.partial({
  entity: true,
  include_members: true,
  email_status: true,
});

type Props = {
  allowAskCode: boolean;
};

export default function AdministratorEmail({ allowAskCode }: Props) {
  const form = Form.useFormInstance<VirtualLabPayload>();
  const [sendCode, setSendCode] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [codeButtonText, setCodeButtonText] = useState<'Send code' | 'Resend'>('Send code');
  const overviewFields = Form.useWatch([], form);

  const disableSendCode =
    (schema.safeParse(overviewFields).error?.issues?.length || 0) > 0 ||
    overviewFields?.email_status === 'locked' ||
    overviewFields?.email_status === 'verified';

  const openVerificationCode = () => setSendCode(true);

  const onAskNewCode = async () => {
    const values = form.getFieldsValue();
    setCodeLoading(true);
    const result = await getEmailVerificationCode({
      email: values.reference_email,
      name: values.name,
    });

    if (result.status === 'code_sent') {
      openVerificationCode();
      setCodeButtonText('Resend');
    }

    form.setFieldValue('email_status', result.status);
    setCodeLoading(false);
  };

  const onCodeComplete = async (code: number) => {
    setVerificationLoading(true);
    const values = form.getFieldsValue();
    const result = await verifyOtpCode({
      code,
      email: values.reference_email,
      name: values.name,
    });

    form.setFieldValue('email_status', result.status);
    setVerificationLoading(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <Form.Item hidden name="email_status">
          <input name="email_status" value="none" type="text" />
        </Form.Item>
        <Form.Item
          label={<span className="font-semibold text-primary-8">Administrator&#39;s email</span>}
          name="reference_email"
          className="flex-1"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input type="email" placeholder="Enter the email here..." />
        </Form.Item>
        <Form.Item className={classNames(allowAskCode ? 'block' : 'hidden')}>
          <Button
            className={classNames(
              'h-10 rounded-none border bg-white px-6 text-base font-bold',
              'border-primary-8 text-primary-8 ',
              'hover:!border-primary-6 hover:!bg-white hover:!text-primary-6',
              'disabled:border-gray-200 disabled:text-gray-400'
            )}
            type="text"
            size="large"
            onClick={onAskNewCode}
            disabled={disableSendCode}
            loading={codeLoading}
          >
            {codeButtonText}
          </Button>
        </Form.Item>
      </div>
      <Alert
        closable
        type="error"
        className={classNames(
          'mb-2 flex w-4/5 flex-nowrap rounded-none',
          ['failed', 'locked', 'expired', 'already_verified'].includes(overviewFields?.email_status)
            ? 'block'
            : 'hidden'
        )}
        message={
          StatusMessageMap[
            overviewFields?.email_status as 'failed' | 'locked' | 'expired' | 'already_verified'
          ]
        }
      />
      <div
        className={classNames(
          'w-4/5 border border-gray-300 px-8 pt-3 text-primary-8 transition-all',
          sendCode ? 'h-full opacity-100' : 'h-0 opacity-0'
        )}
      >
        <h2 className="text-lg font-bold">
          Enter your code here
          {verificationLoading && <LoadingOutlined className="ml-2" />}
          {overviewFields?.email_status === 'verified' && (
            <CheckCircleFilled className="ml-2 text-teal-600" />
          )}
        </h2>
        <p className="text-justify text-base font-light">
          We have just sent you an email to the address provided containing the code to validate
          your administrator’s role
        </p>
        <div className="my-4">
          <VerificationCode onComplete={onCodeComplete} />
        </div>
      </div>
    </div>
  );
}
