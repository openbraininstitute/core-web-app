'use client';

import { LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, InputNumber, Modal, message, Spin, Upload } from 'antd';
import { isNil } from 'es-toolkit';
import Image from 'next/image';
import NextLink from 'next/link';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { createAsset, downloadAsset } from '@/api/entitycore/queries/assets';
import { getNotebooks } from '@/api/entitycore/queries/notebook';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';
import { inviteToProject } from '@/api/virtual-lab-svc/queries/invite';
import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import {
  getMissingStudentEmails,
  getVirtualLab,
  updateVirtualLab,
} from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { getStripe } from '@/components/VirtualLab/Billing/utils';
import { startEmptyNotebook } from '@/services/notebooks';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { assignProjectBudget } from '@/services/virtual-lab/projects';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button as UiButton } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import { keyBuilder as externalKeyBuilder } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { isObject } from '@/util/type-guards';
import { cn } from '@/utils/css-class';

import { useWorkspace } from '../hooks/use-workspace';
import { CONVERSION_RATE } from '../segments/virtual-lab-settings/elements/helpers';
import { buildStripeFormOptions } from '../segments/virtual-lab-settings/elements/stripe-payment';

import type { UploadFile, UploadProps } from 'antd';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { ProjectCreationResponse, TVirtualLab } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

export async function createNotebook({
  payload,
  context,
}: {
  payload: INotebook;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<INotebook>('/analysis-notebook-template', {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}

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
  const [studentEmails, setStudentEmails] = useState<string[]>([]);
  const breakpoint = useDefaultBreakpoint();

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });

  const onFinnish = useCallback(() => {
    setShowCourseModal(false);
  }, []);

  const handleUploadData = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: ExtendedEntitiesTypeDict.Notebook,
      sessionId: crypto.randomUUID(),
    });
  };

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null || virtualLabData.data == null) {
      setLoading(false);
      throw new Error(`Could not fetch virtual lab data`);
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
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (!virtualLabData?.data)
    return (
      <div className="h-full flex justify-center items-center text-4xl">
        <LoadingOutlined />
      </div>
    );

  const course = virtualLabData.data.virtual_lab.course;

  return (
    <div>
      <div className="mb-5 ml-5 flex items-center justify-between">
        <div className="flex">
          <NextLink
            href="public"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2',
              active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Public
          </NextLink>

          <NextLink
            href="private"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2',
              active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Project
          </NextLink>
        </div>
        <div className="flex gap-3">
          {active === 'private' && course && course.template_project_id === projectId && (
            <UiButton
              type="button"
              className="flex h-[40px] min-w-[150px] items-center justify-center rounded-md px-4 py-2 text-white bg-primary-9"
              onClick={() => setShowCourseModal(true)}
            >
              {course.is_initialized ? 'Add students to course' : 'Initialize course'}
            </UiButton>
          )}

          {active === 'private' && (
            <UiButton
              rounded
              variant="success"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              type="button"
              onClick={handleUploadData}
              className={cn(
                'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
                'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
                'transition-all duration-300 ease-out',
                'hover:scale-[1.02] active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-70'
              )}
            >
              <div className="flex items-center justify-between gap-5">
                <span>Upload notebook</span>
                <PlusOutlined className="ml-auto text-sm" />
              </div>
            </UiButton>
          )}

          <button
            disabled={loading}
            type="button"
            className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726] transition-colors hover:bg-orange-50"
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
      <Modal open={showCourseModal} footer={false} closable={false}>
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
                    studentEmails={studentEmails}
                    setStudentEmails={setStudentEmails}
                  />
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <CourseSetup
              onFinnish={onFinnish}
              studentEmails={studentEmails}
              virtualLab={virtualLabData.data.virtual_lab}
            />
          )}
        </div>
      </Modal>

      <ContributionModal />
    </div>
  );
}

const CsvUploadValidator = ({
  maxStudents,
  vlabId,
  onCancel,
  onSuccess,
  studentEmails,
  setStudentEmails,
}: {
  maxStudents: number | null;
  vlabId: string;
  onCancel: () => void;
  onSuccess: () => void;
  studentEmails: string[];
  setStudentEmails: (emails: string[]) => void;
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);

  const validateCsvContent = async (text: string) => {
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

    const missingEmails = await getMissingStudentEmails({
      virtualLabId: vlabId,
      emails: [...emailSet],
    });

    setStudentEmails([...missingEmails.emails]);
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
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const isValid = await validateCsvContent(text);
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

  const minCredits = Math.max(studentEmails.length, 5);

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
      {studentEmails.length === 0 && fileList.length > 0 && 'No students without a project found'}
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
          {credits < minCredits && (
            <div className="text-red-500">{`Minimum of ${minCredits} required`}`</div>
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

async function _syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectId,
}: {
  notebook: INotebook;
  virtualLabId: string;
  projectId: string;
  targetProjectId: string;
}) {
  const createdNotebook = await createNotebook({
    payload: notebook,
    context: { virtualLabId, projectId: targetProjectId },
  });

  const sourceAssets = await Promise.all(
    notebook.assets.map(async (asset) => {
      const arrayBuffer = (await downloadAsset({
        ctx: {
          virtualLabId,
          projectId,
        },
        entityType: EntityTypeDict.Notebook,
        entityId: notebook.id,
        id: asset.id,
        asRawResponse: false,
      })) as ArrayBuffer;

      return {
        ctx: { virtualLabId, projectId: targetProjectId },
        entityType: EntityTypeDict.Notebook,
        entityId: createdNotebook.id,
        fileName: asset.path.split('/').pop() ?? asset.id,
        payload: arrayBuffer,
        mimeType: asset.content_type,
        label: asset.label,
      };
    })
  );

  // Upload assets to new notebook

  await Promise.all(
    sourceAssets.map((asset) => {
      return createAsset(asset);
    })
  );
}

async function syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectIds,
}: {
  notebook: INotebook;
  virtualLabId: string;
  projectId: string;
  targetProjectIds: string[];
}) {
  const promises = targetProjectIds.map((id) => {
    return _syncNotebook({ notebook, virtualLabId, projectId, targetProjectId: id });
  });

  return await Promise.all(promises);
}

function CourseSetup({
  onFinnish,
  studentEmails,
  virtualLab,
}: {
  onFinnish: () => void;
  studentEmails: string[];
  virtualLab: TVirtualLab;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();

  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;

    hasTriggered.current = true;

    const setupCourse = async () => {
      try {
        const balanceRes = await getVirtualLabAccountBalance({
          virtualLabId,
          includeProjects: false,
        });
        const balance = balanceRes?.data?.balance;
        const budgetPerStudent = Math.floor(parseInt(balance, 10) / studentEmails.length);

        if (isNil(balance)) throw new Error('Could not fetch account balance for the virtual lab');
        if (budgetPerStudent < 1) {
          throw new Error('Not enough credits to initialize course');
        }

        const projectCreationResults = await Promise.allSettled(
          studentEmails.map((email) =>
            createProject(virtualLabId, {
              name: `${virtualLab.name} ${email}`,
              description: `Project for ${email}`,
              include_members: [],
            })
          )
        );

        const failedProjectCreations = projectCreationResults.filter(
          (r) => r.status === 'rejected'
        );

        if (failedProjectCreations.length > 0) {
          notification.warning({
            message: `Warning: ${failedProjectCreations.length} out of ${studentEmails.length} student projects failed to create`,
            key: 'project-creation-warning',
            placement: 'topRight',
          });
        }

        const successfulProjects = projectCreationResults
          .map((result, index) => ({ result, email: studentEmails[index] }))
          .filter((item) => item.result.status === 'fulfilled' && !!item.result.value.data);

        const inviteResults = await Promise.allSettled(
          successfulProjects.map((project) => {
            return inviteToProject({
              virtualLabId,
              //@ts-expect-error
              projectId: (project.result as PromiseFulfilledResult<ProjectCreationResponse>).value
                .data.project.id,
              email: project.email,
              role: 'member',
            });
          })
        );

        const failedInvites = inviteResults.filter((r) => r.status === 'rejected');
        if (failedInvites.length > 0) {
          notification.warning({
            message: `Warning: ${failedInvites.length} out of ${successfulProjects.length} student invitations failed to send`,
            key: 'invite-warning',
            placement: 'topRight',
          });
        }

        const budgetAssignmentResults = await Promise.allSettled(
          successfulProjects.map((project) =>
            assignProjectBudget({
              virtualLabId,
              //@ts-expect-error
              projectId: (project.result as PromiseFulfilledResult<ProjectCreationResponse>).value
                .data.project.id,
              amount: budgetPerStudent,
            })
          )
        );

        const failedBudgetAssignments = budgetAssignmentResults.filter(
          (r) => r.status === 'rejected'
        );
        if (failedBudgetAssignments.length > 0) {
          notification.warning({
            message: `Warning: Credits couldn't be transferred to ${failedBudgetAssignments.length} out of ${successfulProjects.length} student projects`,
            key: 'budget-assignment-warning',
            placement: 'topRight',
          });
        }

        const projectIds = successfulProjects.map(
          (project) =>
            // @ts-expect-error
            (project.result as PromiseFulfilledResult<ProjectCreationResponse>).value.data.project
              .id
        );

        const firstNotebookRes = await getNotebooks({
          context: { virtualLabId, projectId },
          filters: { page: 1, page_size: 1000 },
        });

        let allNotebooks = [...firstNotebookRes.data];
        const { total_items, page_size } = firstNotebookRes.pagination;
        const totalPages = Math.ceil(total_items / page_size);

        if (totalPages > 1) {
          const remainingRequests = Array.from({ length: totalPages - 1 }, (_, i) =>
            getNotebooks({
              context: { virtualLabId, projectId },
              filters: { page: i + 2, page_size: 1000 },
            })
          );
          const remainingRes = await Promise.all(remainingRequests);
          allNotebooks = [...allNotebooks, ...remainingRes.flatMap((r) => r.data)];
        }

        const privateNotebooks = allNotebooks.filter((n) => n.authorized_public === false);

        const syncNotebookResults = await Promise.allSettled(
          privateNotebooks.map((n) => {
            return syncNotebook({
              notebook: n,
              virtualLabId,
              projectId,
              targetProjectIds: projectIds,
            });
          })
        );

        const failedSyncNotebook = syncNotebookResults.filter((r) => r.status === 'rejected');

        if (failedSyncNotebook.length > 0) {
          notification.warning({
            message: `Warning:  ${failedSyncNotebook.length} out of ${syncNotebookResults.length} notebooks couldn't be synchronizec`,
            key: 'notebook-sync-warning',
            placement: 'topRight',
          });
        }

        await updateVirtualLab({
          virtualLabId,
          updatePayload: {
            course: virtualLab.course && { ...virtualLab.course, is_initialized: true },
          },
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to initialize course';
        notification.error({
          message: errorMessage,
          key: 'course-setup-error',
          placement: 'topRight',
        });
      } finally {
        onFinnish();
      }
    };

    setupCourse();
  }, [virtualLabId, projectId, notification, studentEmails, onFinnish, virtualLab]);

  return 'Settup up course...';
}
