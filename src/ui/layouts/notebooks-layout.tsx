'use client';

import { LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, InputNumber, Modal, Spin, Upload } from 'antd';
import { isNil } from 'es-toolkit';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { createAsset, downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { getNotebooks } from '@/api/entitycore/queries/notebook';
import { type EntityCoreObjectTypes, EntityTypeDict, isNotebook } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';
import { inviteToProject } from '@/api/virtual-lab-svc/queries/invite';
import { createStandalonePayment, getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { createProject, listAllProjectIds } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getMissingStudentEmails, getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
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
import { keyBuilder as userKeyBuilder } from '../use-query-keys/user';

import type { UploadFile, UploadProps } from 'antd';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { Course, ProjectCreationResponse } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

type Student = {
  id: string;
  email: string;
};

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { virtualLabId, projectId } = useWorkspace();

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      router.replace('private');
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: ExtendedEntitiesTypeDict.Notebook,
        sessionId: crypto.randomUUID(),
      });
    }
  }, [searchParams, router]);
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const breakpoint = useDefaultBreakpoint();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { data: userGroups } = useQuery({
    queryKey: userKeyBuilder.groups(),
    queryFn: () => getUserGroups(),
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const isVlabAdmin = !!userGroups?.data?.groups.find(
    (group) => group.role === 'admin' && group.virtual_lab_id === virtualLabId
  );

  const { data: virtualLabData, refetch } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  const { data: balance } = useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: false }),
    staleTime: 0,
    gcTime: 0,
  });

  const vlabBalance = 100;

  const budgetPerStudent = vlabBalance && Math.floor(vlabBalance / students.length);

  const onFinnish = useCallback(() => {
    setShowCourseModal(false);
    setStep(0);
    refetch();
    setStudents([]);
    setFileList([]);
  }, [refetch]);

  const onCancel = useCallback(() => {
    setShowCourseModal(false);
    setStep(0);
    setStudents([]);
    setFileList([]);
  }, []);

  const handleUploadData = () => {
    if (active === 'public') {
      router.push('private?upload=true');
    } else {
      makeSelectContributionEntityClickEvent({
        display: true,
        entityType: ExtendedEntitiesTypeDict.Notebook,
        sessionId: crypto.randomUUID(),
      });
    }
  };

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null || virtualLabData == null) {
      setLoading(false);
      throw new Error(`Could not fetch virtual lab data`);
    }
    try {
      const retval = await startEmptyNotebook(virtualLabId, projectId, virtualLabData.compute_cell);
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

  const course = virtualLabData?.data?.virtual_lab.course;

  const onNotebookCreateSuccess = useCallback(
    async (notebook: EntityCoreObjectTypes) => {
      if (!isNotebook(notebook) || course?.template_project_id !== projectId) {
        return;
      }
      try {
        const projectIds = (await listAllProjectIds(virtualLabId)).filter((id) => id !== projectId);
        await syncNotebook({ notebook, virtualLabId, projectId, targetProjectIds: projectIds });
      } catch {
        notification.warning({
          message: `Couldn't sync notebook to student projects`,
          key: 'notebook-sync-warning',
          placement: 'topRight',
        });
      }
    },
    [projectId, virtualLabId, notification.warning, course]
  );

  if (!virtualLabData || isNil(vlabBalance) || isNil(budgetPerStudent))
    return (
      <div className="h-full flex justify-center items-center text-4xl">
        <LoadingOutlined />
      </div>
    );

  console.log('HERE HERE\n\n', vlabBalance, budgetPerStudent, isNil(budgetPerStudent));

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
          {active === 'private' &&
            course &&
            course.template_project_id === projectId &&
            isVlabAdmin && (
              <UiButton
                type="button"
                className="flex h-[40px] min-w-[150px] items-center justify-center rounded-md px-4 py-2 text-white bg-primary-9 rounded-full"
                onClick={() => setShowCourseModal(true)}
              >
                Add students to course
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
      {course && virtualLabData.data.virtual_lab && (
        <Modal open={showCourseModal} footer={false} closable={step === 0} onCancel={onCancel}>
          <div>
            {step === 0 && (
              <div>
                <div className="mb-4 text-xl text-primary-8">Add students to course</div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col">
                    <div>Upload CSV file with student information</div>
                    <CsvUploadValidator
                      vlabId={virtualLabId}
                      onCancel={onCancel}
                      onSuccess={() => setStep(1)}
                      students={students}
                      setStudents={setStudents}
                      fileList={fileList}
                      setFileList={setFileList}
                      vlabBalance={vlabBalance}
                    />
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <CourseSetup
                onFinnish={onFinnish}
                students={students}
                course={course}
                budgetPerStudent={budgetPerStudent}
              />
            )}
          </div>
        </Modal>
      )}

      <ContributionModal onCreateSuccess={onNotebookCreateSuccess} />
    </div>
  );
}

const CsvUploadValidator = ({
  vlabId,
  onCancel,
  onSuccess,
  students,
  setStudents,
  fileList,
  setFileList,
  vlabBalance,
}: {
  vlabId: string;
  onCancel: () => void;
  onSuccess: () => void;
  students: Student[];
  setStudents: (students: Student[]) => void;
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
  vlabBalance: number;
}) => {
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);
  const [warning, setWarning] = useState('');

  const validateCsvContent = async (text: string) => {
    const rows = text.trim().split('\n');
    if (rows.length < 1) {
      setError('CSV must contain data records.');
      return false;
    }

    const csvStudents: Student[] = [];
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

      if (csvStudents.find((s) => s.email === email)) {
        setError(`Row ${i + 1}: Duplicate email detected (${email}).`);
        return false;
      }

      csvStudents.push({
        id: columns[0].trim(),
        email,
      });
    }

    const missingEmails = await getMissingStudentEmails({
      virtualLabId: vlabId,
      emails: csvStudents.map((s) => s.email),
    });

    setStudents(csvStudents.filter((s) => missingEmails.includes(s.email)));

    const areEqual =
      csvStudents.length === missingEmails.length &&
      missingEmails.every((email) => csvStudents.find((s) => s.email === email));

    if (!areEqual)
      setWarning(
        'Duplicate emails were skipped. To add more, upload a CSV with new email addresses'
      );
    return true;
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file: File) => {
    setError('');
    setWarning('');
    const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (!isCsv) {
      return Upload.LIST_IGNORE;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const isValid = await validateCsvContent(text);
        if (isValid) {
          resolve(false);
        } else {
          reject(Upload.LIST_IGNORE);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
    if (info.fileList.length === 0) {
      setStudents([]);
    }
  };

  const minCredits = Math.max(students.length, 5);

  return (
    <div className="flex flex-col gap-3">
      <Upload
        accept=".csv"
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        maxCount={1}
      >
        <Button className="mt-2" icon={<UploadOutlined />}>
          Select CSV
        </Button>
      </Upload>

      {error && <div className="text-red-500">{error}</div>}
      {students.length === 0 && fileList.length > 0 && !error && (
        <div className="flex flex-col">
          <p>No new students found — all emails in this file have already been uploaded.</p>
          <p>Upload a CSV with new email addresses to add more students.</p>
        </div>
      )}
      {students.length > 0 && (
        <div className="flex flex-col gap-2">
          <div>The following students will be added to the course:</div>
          <ul>
            {students.map((s) => (
              <li key={s.email}>
                <div className="flex gap-2">
                  <span>{s.id}: </span>
                  <span>{s.email}</span>
                </div>
              </li>
            ))}
          </ul>

          {warning && (
            <div className="italic">
              Duplicate emails were skipped. To add more, upload a CSV with new email addresses.
            </div>
          )}
        </div>
      )}

      {students.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-lg">Purchase credits to continue.</div>

          <label htmlFor="quantity-input">Number of credits</label>
          <InputNumber
            id="quantity-input"
            min={Math.max(students.length, 5)}
            value={credits}
            onChange={(n) => {
              setCredits(n ?? 0);
            }}
          />
          {credits < minCredits && (
            <div className="text-red-500">{`Minimum of ${minCredits} credits required`}</div>
          )}

          {credits >= minCredits && (
            <div>
              {`Each student will be allocated
              ${Math.floor((credits + vlabBalance) / students.length)} credits`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

  const contributions = await getContributions({
    context: { virtualLabId, projectId },
    filters: { entity__id: notebook.id },
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

  // Upload contributions to new notebook

  await Promise.all(
    contributions.data.map((contributor) =>
      createContribution({
        context: { virtualLabId, projectId: targetProjectId },
        contributor: {
          agent_id: contributor.agent.id,
          entity_id: createdNotebook.id,
          role_id: contributor.role.id,
        },
      })
    )
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
  students,
  budgetPerStudent,
}: {
  onFinnish: () => void;
  students: Student[];
  course: Course;
  budgetPerStudent: number;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();

  const hasTriggered = useRef(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasTriggered.current) return;

    hasTriggered.current = true;

    const setupCourse = async () => {
      try {
        const projectCreationResults = await Promise.allSettled(
          students.map((s) =>
            createProject(virtualLabId, {
              name: `${s.id}`,
              contact_email: s.email,
              include_members: [],
            })
          )
        );

        // Update project list in side bar
        queryClient.invalidateQueries({
          queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
        });

        const failedProjectCreations = projectCreationResults.filter(
          (r) => r.status === 'rejected'
        );

        if (failedProjectCreations.length > 0) {
          notification.warning({
            message: `Warning: ${failedProjectCreations.length} out of ${students.length} student projects failed to create`,
            key: 'project-creation-warning',
            placement: 'topRight',
          });
        }

        const successfulProjects = projectCreationResults
          .map((result, index) => ({ result, email: students[index].email }))
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

        notification.success({
          message: 'Students added successfully',
          key: 'course-setup-success',
          placement: 'topRight',
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to add students to course';
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
  }, [virtualLabId, projectId, notification, students, onFinnish, queryClient, budgetPerStudent]);

  return 'Setting up course...';
}
