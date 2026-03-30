'use client';

import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, InputNumber, Modal, message, Spin, Upload } from 'antd';
import Image from 'next/image';
import NextLink from 'next/link';
import { type ReactNode, useState, useTransition } from 'react';

import { tryCatch } from '@/api/utils';
import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { getStripe } from '@/components/VirtualLab/Billing/utils';
import { startEmptyNotebook } from '@/services/notebooks';
import { Button as UiButton } from '@/ui/molecules/button';
import { keyBuilder as externalKeyBuilder } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { isObject } from '@/util/type-guards';
import { cn } from '@/utils/css-class';

import { useWorkspace } from '../hooks/use-workspace';
import { CONVERSION_RATE } from '../segments/virtual-lab-settings/elements/helpers';
import { buildStripeFormOptions } from '../segments/virtual-lab-settings/elements/stripe-payment';

import type { UploadFile, UploadProps } from 'antd';

type Props = {
  children: ReactNode;
  active: 'public' | 'private';
};

export function NotebooksLayout({ children, active }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [numberStudents, setNumberStudents] = useState<number | null>(10);
  const [step, setStep] = useState(0);

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });

  const course = {
    template_project_id: projectId,
    is_initialized: false,
  };

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null || virtualLabData.data == null) {
      throw new Error(`Could not fetch virtual lab data with useQuery ${virtualLabData}`);
    }
    try {
      const retval = await startEmptyNotebook(
        virtualLabId,
        projectId,
        virtualLabData.data.virtual_lab.compute_cell
      );
      notification.success({
        message: `Notebook starting`,
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      // Just show the hint message if we get some error
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook, unknown error: ${error}`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <div className="mb-5 ml-5 flex justify-between">
        <div className="flex">
          <NextLink
            href="public"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2 text-white',
              active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Public
          </NextLink>

          <NextLink
            href="private"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2 text-white',
              active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Project
          </NextLink>
        </div>
        <div className="flex gap-3">
          {active === 'private' &&
            course &&
            course.template_project_id === projectId &&
            !course.is_initialized && (
              <button
                type="button"
                className="flex h-[40px] min-w-[150px] items-center justify-center rounded-md px-4 py-2 text-white bg-primary-9"
                onClick={() => setShowCourseModal(true)}
              >
                Initialize Course
              </button>
            )}

          <button
            disabled={loading}
            type="button"
            className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726]"
            onClick={handleRunNotebook}
          >
            <div>Open JupyterHub</div>
            {!loading && (
              <Image src="/images/jupyter.svg" alt="Jupyter hub" width={20} height={20} />
            )}
            {loading && <LoadingOutlined className="text-[#F37726]" />}
          </button>
        </div>
      </div>

      <div
        id="notebooks-layout"
        className="bg-background border-neutral-2 ml-5 h-[calc(100vh-11rem)] rounded-2xl border p-5"
      >
        {children}
      </div>
      <Modal open={showCourseModal} onCancel={() => setShowCourseModal(false)} footer={false}>
        <div>
          {step === 0 && (
            <div>
              <div className="mb-4 text-xl text-primary-8">Initialize Course</div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <label htmlFor="quantity-input">Number of students</label>
                  <InputNumber
                    id="quantity-input"
                    min={1}
                    value={numberStudents}
                    onChange={(n) => {
                      setNumberStudents(n);
                    }}
                  />
                  {!numberStudents && <div className="text-red-500">Required</div>}
                </div>
                <div className="flex flex-col">
                  <div>Upload CSV with student information</div>
                  <CsvUploadValidator
                    maxStudents={numberStudents}
                    vlabId={virtualLabId}
                    onCancel={() => setShowCourseModal(false)}
                    onSuccess={() => setStep(1)}
                  />
                </div>
              </div>
            </div>
          )}
          {step === 1 && <div>Setting up course ...</div>}
        </div>
      </Modal>
    </div>
  );
}

const CsvUploadValidator = ({
  maxStudents,
  vlabId,
  onCancel,
  onSuccess,
}: {
  maxStudents: number | null;
  vlabId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [studentEmails, setStudentEmails] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);

  const validateCsvContent = (text: string): boolean => {
    const rows = text.trim().split('\n');
    if (rows.length < 1) {
      setError('CSV must contain data records.');
      return false;
    }

    const emailSet = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].trim();
      if (!row) continue;

      const columns = row.split(',');
      if (columns.length !== 2) {
        setError(`Row ${i + 1}: Invalid format. Expected 2 columns.`);
        return false;
      }

      const email = columns[1].trim();

      if (!emailRegex.test(email)) {
        setError(`Row ${i + 1}: Invalid email syntax (${email}).`);
        return false;
      }

      if (emailSet.has(email)) {
        setError(`Row ${i + 1}: Duplicate email detected (${email}).`);
        return false;
      }

      emailSet.add(email);
      if (maxStudents && emailSet.size > maxStudents) {
        setError(`File should contain at most ${maxStudents} students.`);
        return false;
      }
    }

    setStudentEmails([...emailSet]);
    return true;
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file: File) => {
    setError('');
    const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCsv) {
      message.error('Invalid file format. Only CSV files are permitted.');
      return Upload.LIST_IGNORE;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const isValid = validateCsvContent(text);
        if (isValid) {
          message.success('File validation successful.');
          resolve(false);
        } else {
          reject(Upload.LIST_IGNORE);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    if (!error) setFileList(info.fileList);
    if (info.fileList.length === 0) {
      setStudentEmails([]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Upload
        accept=".csv"
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        maxCount={1}
        disabled={!maxStudents}
      >
        <Button icon={<UploadOutlined />} disabled={!maxStudents}>
          Select CSV
        </Button>
      </Upload>

      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {studentEmails.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Student Email List:</h3>
          <ul>
            {studentEmails.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        </div>
      )}

      {studentEmails.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="quantity-input">Number of credits</label>
          <InputNumber
            id="quantity-input"
            min={Math.max(studentEmails.length, 5)}
            value={credits}
            onChange={(n) => {
              setCredits(n ?? 0);
            }}
          />
          {!credits && (
            <div className="text-red-500">{`Minimum of ${Math.max(studentEmails.length, 5)} required`}</div>
          )}

          <PaymentFlow
            credits={credits}
            vlabId={vlabId}
            onCancel={onCancel}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </div>
  );
};

function PaymentFlow({
  credits,
  vlabId,
  onCancel,
  onSuccess,
}: {
  credits: number;
  vlabId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [
    { data: setupIntent, isPending: loadingIntent },
    { data: stripeData, isPending: loadingStripeInstance },
  ] = useQueries({
    queries: [
      {
        queryKey: externalKeyBuilder.stripeSetupIntent({ virtualLabId: vlabId }),
        queryFn: getSetupIntent,
        staleTime: 0,
        gcTime: 0,
      },
      {
        queryKey: externalKeyBuilder.stripeInstance(),
        queryFn: getStripe,
      },
    ],
  });

  const loadingStripe = loadingIntent || loadingStripeInstance;

  if (loadingStripe) {
    return (
      <div className="flex h-full grow items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined className="text-white" />} />
      </div>
    );
  }
  if (!stripeData || !setupIntent?.data) {
    return null;
  }

  return (
    <Elements stripe={stripeData} options={buildStripeFormOptions(setupIntent.data?.client_secret)}>
      <PaymentForm credits={credits} vlabId={vlabId} onCancel={onCancel} onSuccess={onSuccess} />
    </Elements>
  );
}

function PaymentForm({
  credits,
  vlabId,
  onCancel,
  onSuccess,
}: {
  credits: number;
  vlabId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [stripeElementsReady, setElementsReady] = useState(false);
  const onReady = () => setElementsReady(true);
  const { success: successNotify, error: errorNotify } = useAppNotification();
  const [formLoading, startTransition] = useTransition();
  const elements = useElements();
  const stripe = useStripe();
  const formLoaded = stripe && elements;
  const disableForm = !formLoaded || formLoading || credits === 0;

  const queryClient = useQueryClient();

  const onSubmit = async () => {
    if (!stripe || !elements) {
      return null;
    }

    const addCredits = async () => {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      });
      if (error) {
        errorNotify({
          message:
            error.message ||
            "We couldn't process your payment. Please check your card details and try again.",
          placement: 'topRight',
          key: 'subscription-payment-error',
        });

        throw new Error(error.message);
      }
      if (setupIntent?.status === 'succeeded' && setupIntent.payment_method && credits > 0) {
        const amountInCents = parseFloat(Number(credits * CONVERSION_RATE * 100).toFixed(2));
        return await createStandalonePayment({
          amount: amountInCents,
          currency: 'chf',
          virtual_lab_id: vlabId,
          payment_method_id:
            typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id,
        });
      }
      errorNotify({
        message:
          "Your payment couldn't be completed. Please try again or use a different payment method.",
        placement: 'topRight',
        key: 'subscription-payment-error',
      });
      throw new Error('Payment setup was not completed successfully');
    };

    startTransition(async () => {
      const { data, error } = await tryCatch(addCredits(), () => {
        elements.getElement('payment')?.clear();
      });

      if (data) {
        successNotify({
          message: `Successfully purchased ${credits} credits for ${data.amount / 100} ${data.currency.toUpperCase()}`,
          placement: 'topRight',
          key: 'credits-purchase-success',
        });
        await queryClient.invalidateQueries({
          queryKey: keyBuilder.accounting({ virtualLabId: vlabId }),
        });
        onSuccess();
      }

      if (error) {
        let message =
          'There was a problem processing your payment. Please try again or contact support if the issue persists.';
        if (isObject(error.cause) && 'error_code' in error.cause) {
          if (error.cause.error_code === 'ENTITY_ALREADY_EXISTS') {
            message = 'This payment has already been processed';
          }
          if (error.cause.error_code === 'ENTITY_NOT_CREATED') {
            message =
              "We couldn't process your payment at this time. Please try again or contact our support team for help.";
          }
          if (error.cause.error_code === 'ENTITY_NOT_FOUND') {
            message =
              "We couldn't find your payment details. Please try again or contact support if the issue persists.";
          }
        }
        errorNotify({
          message,
          placement: 'topRight',
          key: 'subscription-payment-error',
        });
      }
    });
  };

  return (
    <div>
      <div className="bg-[#0a3a76] text-white text-lg p-4 rounded-md">
        Pay {`${credits * CONVERSION_RATE} CHF`}
      </div>

      <PaymentElement onReady={onReady} />

      {stripeElementsReady && (
        <div className="ml-auto flex items-center justify-end gap-4 mt-5">
          <UiButton
            rounded
            type="button"
            size="lg"
            className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
            onClick={onCancel}
          >
            Cancel
          </UiButton>
          <UiButton
            rounded
            type="button"
            variant="default"
            size="lg"
            className={cn(
              'border-primary-4! w-max border shadow-2xl',
              'hover:bg-primary-8/40',
              'hover:shadow-[1px_2px_4px_0px_#00000099]',
              'shadow-[8px_12px_24px_0px_#00000099]',
              'shadow-[-8px_-8px_42px_0px_#FFFFFF29]'
            )}
            disabled={disableForm}
            onClick={onSubmit}
          >
            <div className="flex w-24 items-center justify-center">
              Pay
              {formLoading && <LoadingOutlined spin className="ml-2 text-white" />}
            </div>
          </UiButton>
        </div>
      )}
    </div>
  );
}
