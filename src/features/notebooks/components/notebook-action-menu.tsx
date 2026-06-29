'use client';

import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
  EyeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { RiPlayFill } from '@remixicon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Popconfirm } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteAnalysisNotebookResult } from '@/api/entitycore/queries/analysis-notebook-result';
import { deleteAnalysisNotebookTemplate } from '@/api/entitycore/queries/analysis-notebook-template';
import { useAppNotification } from '@/components/notification';
import { type TViewVariant, ViewVariant } from '@/constants';
import { useRunNotebook } from '@/features/notebooks/hooks/use-run-notebook';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { Action, ActionKind } from '@/ui/molecules/side-menu-action';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type NotebookEntityLike = {
  id: string;
  type: TEntityTypeDict;
  description?: string | null;
  assets: IAsset[];
};

export function NotebookActionMenu({
  entity,
  ctx,
  isTemplate,
  isPrivate,
  parentLink,
  variant = ViewVariant.Light,
}: {
  entity: NotebookEntityLike;
  ctx: WorkspaceContext;
  isTemplate: boolean;
  isPrivate: boolean;
  parentLink: string;
  variant?: TViewVariant;
}) {
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const { replace: navigate } = useRouter();
  const [readmeOpen, setReadmeOpen] = useState(false);
  const { run, runTargets, runningTarget, running, openJupyterHub, opening, creditsModal } =
    useRunNotebook({ id: entity.id, assets: entity.assets });

  const [, copy, , copying] = useCopyToClipboard({
    onSuccess: () =>
      notification.success({
        message: 'ID Copied',
        description: 'The notebook ID has been copied to your clipboard.',
        duration: 3,
        placement: 'topRight',
      }),
    onError: () =>
      notification.error({
        message: 'Copy Failed',
        description: 'Could not copy to clipboard. Please copy the ID manually.',
        placement: 'topRight',
      }),
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      downloadArchive(entity.type, [entity.id], ctx);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      (isTemplate ? deleteAnalysisNotebookTemplate : deleteAnalysisNotebookResult)({
        id: entity.id,
        context: ctx,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate(query) {
          const first = query.queryKey[0] as
            | { context?: { extendedEntityType?: string } }
            | undefined;
          return first?.context?.extendedEntityType === entity.type;
        },
      });
      notification.success({
        message: 'Deleted successfully',
        description: `The ${isTemplate ? 'notebook' : 'result'} has been successfully deleted.`,
        placement: 'topRight',
      });
      navigate(parentLink);
    },
    onError: (error: Error) => {
      const cause = error.cause as { message?: string } | undefined;
      let description = cause?.message ?? 'Unknown error';
      if (description.toLowerCase().includes('foreign keys integrity violation')) {
        description = 'This item is referenced by another record and cannot be deleted.';
      }
      notification.error({
        message: 'Deletion failed',
        description,
        placement: 'topRight',
        duration: 5,
      });
    },
  });

  return (
    <div
      data-testid="notebook-action-menu"
      className={cn(
        'flex flex-col gap-2 px-3 text-base font-bold',
        variant === ViewVariant.Default ? 'text-white' : 'text-primary-9'
      )}
    >
      {creditsModal}
      <Modal
        centered
        open={readmeOpen}
        footer={false}
        onCancel={() => setReadmeOpen(false)}
        width="40%"
      >
        <div>
          <h1 className="text-primary-8 text-3xl font-bold">Readme</h1>
          <div className="mt-5 text-lg text-black">{entity.description}</div>
        </div>
      </Modal>

      <Action
        variant={variant}
        kind={ActionKind.Button}
        onClick={() => !copying && copy(entity.id)}
        icon={
          !copying ? (
            <CopyOutlined />
          ) : (
            <CheckOutlined
              className={cn({
                'text-teal-600': variant === ViewVariant.Light,
                'text-white!': variant === ViewVariant.Default,
              })}
            />
          )
        }
      >
        {copying ? 'Copied' : 'Copy ID'}
      </Action>

      <Action
        variant={variant}
        kind={ActionKind.Button}
        onClick={downloadMutation.mutateAsync}
        icon={downloadMutation.isPending ? <LoadingOutlined /> : <DownloadOutlined />}
      >
        Download
      </Action>

      {isTemplate ? (
        <Action
          variant={variant}
          kind={ActionKind.Button}
          onClick={() => setReadmeOpen(true)}
          icon={<EyeOutlined />}
        >
          ReadMe
        </Action>
      ) : null}

      {isTemplate ? (
        runTargets.map((target) => (
          <Action
            key={target.key}
            variant={variant}
            kind={ActionKind.Button}
            onClick={() => run(target)}
            icon={
              runningTarget === target.key ? (
                <LoadingOutlined />
              ) : (
                <target.Icon className="size-4" />
              )
            }
          >
            {runningTarget === target.key ? 'Starting...' : target.label}
          </Action>
        ))
      ) : (
        <>
          <Action
            variant={variant}
            kind={ActionKind.Button}
            onClick={() => run()}
            icon={running ? <LoadingOutlined /> : <RiPlayFill />}
          >
            {running ? 'Starting...' : 'Run notebook'}
          </Action>
          <Action
            variant={variant}
            kind={ActionKind.Button}
            onClick={openJupyterHub}
            icon={opening ? <LoadingOutlined /> : <ExportOutlined />}
          >
            {opening ? 'Opening...' : 'Open notebook'}
          </Action>
        </>
      )}

      {isPrivate ? (
        <Popconfirm
          autoAdjustOverflow
          destroyOnHidden
          placement="bottomRight"
          title={
            <div className="text-primary-8 text-lg font-bold">
              Delete the {isTemplate ? 'notebook' : 'result'}
            </div>
          }
          description={
            <div>
              <div className="text-primary-8 text-sm font-bold">
                Are you sure you want to delete this {isTemplate ? 'notebook' : 'result'}?
              </div>
              <small className="text-primary-6 font-light">This action cannot be undone.</small>
            </div>
          }
          okText="Yes"
          cancelText="No"
          arrow={{ pointAtCenter: false }}
          onConfirm={() => deleteMutation.mutateAsync()}
          classNames={{
            body: cn(
              'max-w-70',
              '[&_.ant-popconfirm-buttons_button]:px-4',
              '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
              '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
            ),
          }}
        >
          <span className="cursor-pointer">
            <Action
              destructive
              variant={variant}
              kind={ActionKind.Button}
              icon={deleteMutation.isPending ? <LoadingOutlined /> : <DeleteOutlined />}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Action>
          </span>
        </Popconfirm>
      ) : null}
    </div>
  );
}
