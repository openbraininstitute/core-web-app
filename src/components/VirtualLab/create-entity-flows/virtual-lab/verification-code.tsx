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

const schema = VirtualLabPayloadSchema.partial({
  entity: true,
  email_status: true,
});

type Props = {
  allowAskCode: boolean;
};

export default function AdministratorEmail({ allowAskCode }: Props) {
  const [sendCode, setSendCode] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [codeButtonText, setCodeButtonText] = useState<'Send code' | 'Resend'>('Send code');
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);
  const form = Form.useFormInstance<VirtualLabPayload>();
  const fields = Form.useWatch([], form);

  const disableSendCode =
    (schema.safeParse(fields).error?.issues?.length || 0) > 0 ||
    fields?.email_status === 'locked' ||
    fields?.email_status === 'verified';

  const openVerificationCode = () => setSendCode(true);

  const onAskNewCode = async () => {
    const values = form.getFieldsValue();
    setCodeLoading(true);

    const result = await getEmailVerificationCode({
      email: values.reference_email,
      name: values.name,
    });

    if (result) {
      if (result.status === 'code_sent') {
        openVerificationCode();
        setCodeButtonText('Resend');
      }

      form.setFieldValue('email_status', result.status);
      setVerificationMsg(result.message);
    } else {
      setVerificationMsg(
        'Something went wrong while sending the verification code. Please try again in a moment.'
      );
    }
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

    if (result) {
      form.setFieldValue('email_status', result.status);
      setVerificationMsg(result.message);
    } else {
      setVerificationMsg("We couldn't verify the code right now. Please try again in a moment.");
    }
    setVerificationLoading(false);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <Form.Item hidden name="email_status">
          <input name="email_status" value="none" type="text" hidden />
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
              'hover:border-primary-6! hover:bg-white! hover:text-primary-6!',
              'disabled:border-gray-200 disabled:text-gray-400',
              fields?.email_status === 'verified' && 'hidden'
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
        banner
        closable
        type={['registered'].includes(fields?.email_status) ? 'warning' : 'error'}
        className={classNames(
          'mb-2 flex w-4/5 flex-nowrap rounded-none',
          ['error', 'locked', 'expired', 'registered', 'not_match'].includes(fields?.email_status)
            ? 'block'
            : 'hidden'
        )}
        message={verificationMsg}
      />
      {sendCode && (
        <div
          data-testid="verification-code-form"
          className="h-full w-4/5 animate-fade-in border border-gray-300 px-8 pt-3 text-primary-8"
        >
          <h2 className="text-lg font-bold">
            Enter your code here
            {verificationLoading && <LoadingOutlined className="ml-2" />}
            {fields?.email_status === 'verified' && (
              <CheckCircleFilled className="ml-2 text-teal-600" />
            )}
          </h2>
          <p className="text-justify text-base font-light">
            We have just sent you an email to the address provided containing the code to validate
            your administrator’s role
          </p>
          <div className="my-4">
            <VerificationCode
              disabled={fields?.email_status === 'verified'}
              onComplete={onCodeComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
