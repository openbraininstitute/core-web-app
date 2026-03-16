'use client';

import { DeleteOutlined, LoadingOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Popconfirm } from 'antd';
import { Popover } from 'antd/lib';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { deleteNotebook } from '@/api/entitycore/queries/notebook';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { DownloadIconWhiteWithCorners } from '@/components/icons/DownloadIcon';
import { EyeIconWhiteWithinBox } from '@/components/icons/EyeIcon';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { downloadArchive } from '@/services/entity-download';
import { type NotebookStartResponse, startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { INotebook } from '@/api/entitycore/types/entities/notebook';

interface ActionPopoverProps {
  notebook: INotebook;
  index: number;
}

export default function ActionPopover({ notebook, index }: ActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const notification = useAppNotification();
  const { virtualLabId, projectId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const isPublic = pathname.endsWith('/public');

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteNotebook({ id: notebook.id, context: { virtualLabId, projectId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate(query) {
          const first = query.queryKey[0] as { context?: { extendedEntityType?: string } } | undefined;
          return first?.context?.extendedEntityType === ExtendedEntitiesTypeDict.Notebook;
        },
      });
      await queryClient.invalidateQueries({
        predicate(query) {
          return query.queryKey[0] === `data-entity-count-${ExtendedEntitiesTypeDict.Notebook}`;
        },
      });
      notification.success({
        message: 'Deleted successfully',
        description: 'The notebook has been successfully deleted.',
        placement: 'topRight',
      });
    },
    onError: (error: Error) => {
      const cause = error.cause as { message?: string } | undefined;
      let description = cause?.message ?? 'Unknown error';
      if (description.toLowerCase().includes('foreign keys integrity violation')) {
        description = 'This notebook is referenced by another record and cannot be deleted.';
      }
      notification.error({
        message: 'Deletion failed',
        description,
        placement: 'topRight',
        duration: 5,
      });
    },
  });

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });

  async function handleRunNotebook(cloud: string, podNum?: number) {
    if (loading) return;
    const asset = notebook.assets.find((n) => n.label === 'jupyter_notebook');
    if (!asset) return;

    setLoading(true);

    try {
      const retval: NotebookStartResponse = await startNotebook(
        notebook.id,
        asset.path,
        virtualLabId,
        projectId,
        cloud,
        podNum
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
    <>
      <Modal open={open} footer={false} onCancel={() => setOpen(false)} width="40%">
        <div>
          <h1 className="text-primary-8 text-3xl font-bold">Readme</h1>
          <div className="mt-5 text-lg text-black">{notebook.description}</div>
        </div>
      </Modal>
      <div id={`notebook-actions-${index}`}>
        <Popover
          content={
            <div className="text-primary-9 flex min-w-30 flex-col gap-2">
              <div className="flex gap-4">
                <button
                  data-id={`readme-btn-${index}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                  }}
                  className="hover:text-primary-4 inline-flex items-center gap-2.5"
                >
                  <EyeIconWhiteWithinBox className="text-primary-9 text-xs" aria-label="Readme" />
                  Readme
                </button>
              </div>
              <div className="flex gap-4">
                <button
                  data-id={`download-btn-${index}`}
                  type="button"
                  className="hover:text-primary-4 inline-flex items-center gap-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadArchive(ExtendedEntitiesTypeDict.Notebook, [notebook.id]);
                  }}
                >
                  <DownloadIconWhiteWithCorners
                    className="text-primary-9 text-xs"
                    aria-label="Download"
                  />
                  Download
                </button>
              </div>

              {!isPublic && (
              <div className="flex gap-4">
                <Popconfirm
                  autoAdjustOverflow
                  destroyOnHidden
                  placement="bottomRight"
                  title={<div className="font-bold text-lg text-primary-8">Delete the notebook</div>}
                  description={
                    <div>
                      <div className="font-bold text-sm text-primary-8">
                        Are you sure you want to delete this notebook?
                      </div>
                      <small className="font-light text-primary-6">This action cannot be undone.</small>
                    </div>
                  }
                  okText="Yes"
                  cancelText="No"
                  arrow={{ pointAtCenter: false }}
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    deleteMutation.mutateAsync();
                  }}
                  classNames={{
                    body: cn(
                      'max-w-70',
                      '[&_.ant-popconfirm-buttons_button]:px-4',
                      '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
                      '[&_.ant-popconfirm-buttons_button:first-child]',
                      '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
                    ),
                  }}
                >
                  <button
                    data-id={`delete-btn-${index}`}
                    disabled={deleteMutation.isPending}
                    type="button"
                    className="hover:text-primary-4 inline-flex items-center gap-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {deleteMutation.isPending ? (
                      <LoadingOutlined aria-label="Deleting" />
                    ) : (
                      <DeleteOutlined className="text-primary-9 text-sm" aria-label="Delete" />
                    )}
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </Popconfirm>
              </div>
              )}

              <div className="flex gap-4">
                <button
                  data-id={`run-btn-${index}`}
                  disabled={loading}
                  type="button"
                  className="hover:text-primary-4 inline-flex items-center gap-2.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (virtualLabData == null || virtualLabData.data == null) {
                      throw new Error(
                        `Could not fetch virtual lab data with useQuery ${virtualLabData}`
                      );
                    }
                    handleRunNotebook(virtualLabData.data?.virtual_lab.compute_cell, 0);
                  }}
                >
                  {!loading && <PlayCircleOutlined aria-label="Run" />}
                  {loading && <LoadingOutlined />}
                  Run
                </button>
              </div>

              {['local', 'preview', 'development'].includes(config.DEPLOYMENT_ENV) && (
                <div>
                  <div className="flex gap-4">
                    <button
                      disabled={loading}
                      type="button"
                      className="hover:text-primary-4 inline-flex items-center gap-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunNotebook('aws', 0);
                      }}
                    >
                      {!loading && <PlayCircleOutlined aria-label="Run" />}
                      {loading && <LoadingOutlined />}
                      Run in single pod 0 on AWS (dev only)
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button
                      disabled={loading}
                      type="button"
                      className="hover:text-primary-4 inline-flex items-center gap-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunNotebook('azure', 0);
                      }}
                    >
                      {!loading && <PlayCircleOutlined aria-label="Run" />}
                      {loading && <LoadingOutlined />}
                      Run in single pod 0 on Azure (dev only)
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
          style={{
            border: '1px solid #096DD9',
            backgroundColor: '#fff',
            color: '#002766',
          }}
          trigger="click"
          placement="bottomRight"
          arrow={false}
        >
          <PlusOutlined className="bg-primary-8! rounded-full p-2 text-lg font-bold text-white! shadow-md" />
        </Popover>
      </div>
    </>
  );
}
