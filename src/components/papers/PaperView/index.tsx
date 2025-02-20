'use client';

import dynamic from 'next/dynamic';
import { SerializedEditorState } from 'lexical/LexicalEditorState';
import { Button, Popconfirm } from 'antd';
import { useEffect, useTransition } from 'react';
import { parseAsString, useQueryStates } from 'nuqs';
import { useSetAtom } from 'jotai';
import { ErrorBoundary } from '@sentry/nextjs';

import { DELETE_PAPER_FAILED } from '../utils/messages';
import EditorFallbackErrorComponent from './FallbackError';
import PaperDetails from './PaperDetails';
import { DeleteOutline, EditDocument } from '@/components/icons/EditorIcons';
import { PaperResource } from '@/types/nexus';
import { virtualLabProjectPapersCountAtomFamily } from '@/state/virtual-lab/projects';
import deletePaperFromProject from '@/services/paper-ai/deletePaperFromProject';
import useNotification from '@/hooks/notifications';

const Editor = dynamic(() => import('@/components/papers/PaperEditor'), { ssr: false });

export default function PaperView({
  config,
  paper,
}: {
  config: SerializedEditorState;
  paper: PaperResource;
}) {
  const [{ from: fromRoute, mode }, updateQueryParams] = useQueryStates({
    mode: parseAsString.withDefault('').withOptions({ clearOnDefault: true }),
    from: parseAsString.withDefault('').withOptions({ clearOnDefault: true }),
  });
  const { error: errorNotify } = useNotification();
  const [isDeleting, startTransition] = useTransition();
  const refreshPapersCount = useSetAtom(
    virtualLabProjectPapersCountAtomFamily({
      virtualLabId: paper.virtualLabId,
      projectId: paper.projectId,
    })
  );

  const onDeletePaper = async () => {
    startTransition(async () => {
      try {
        await deletePaperFromProject({ paper });
        refreshPapersCount();
      } catch (error) {
        errorNotify(DELETE_PAPER_FAILED, undefined, 'topRight');
      }
    });
  };

  useEffect(() => {
    async function updateAndCleanRoute() {
      if (fromRoute && fromRoute === 'create') {
        refreshPapersCount();
        await updateQueryParams({ from: '' });
      }
    }

    updateAndCleanRoute();
  }, [fromRoute, refreshPapersCount, updateQueryParams]);

  const onEditPaper = () => updateQueryParams({ mode: 'edit' });
  const onCompleteEdit = () => updateQueryParams({ mode: '' });

  return (
    <div
      id="editor-view-container"
      className="secondary-scrollbar mt-4 flex h-full min-h-[calc(100vh-200px)] flex-col gap-y-2 overflow-y-auto bg-primary-9"
    >
      <div className="flex h-full flex-col bg-primary-9">
        <div className="w-full bg-white px-8 py-4">
          <div className="mt-4 flex items-center justify-end bg-white">
            <div className="flex items-center justify-center gap-4">
              {mode !== 'edit' && (
                <Button
                  htmlType="button"
                  type="text"
                  size="large"
                  className="flex items-center justify-center gap-2 rounded-none"
                  onClick={onEditPaper}
                >
                  Edit
                  <EditDocument className="h-7 w-7 group-hover:scale-105 group-hover:transform group-hover:text-gray-300" />
                </Button>
              )}
              <Popconfirm
                title="Delete paper"
                description="Are you sure to delete this paper?"
                onConfirm={onDeletePaper}
                okText="I confirm"
                cancelText="Cancel"
                placement="bottomRight"
                okButtonProps={{
                  type: 'primary',
                  size: 'middle',
                  loading: isDeleting,
                  className: 'bg-primary-8 rounded-none px-5',
                }}
                cancelButtonProps={{ className: 'rounded-none', type: 'text', size: 'middle' }}
              >
                <Button
                  htmlType="button"
                  type="text"
                  size="large"
                  className="flex items-center justify-center gap-2 rounded-none"
                  loading={isDeleting}
                >
                  Delete paper
                  <DeleteOutline className="h-7 w-7 group-hover:scale-105 group-hover:transform group-hover:text-gray-300" />
                </Button>
              </Popconfirm>
            </div>
          </div>
          <PaperDetails
            {...{
              paper,
              onCompleteEdit,
            }}
          />
        </div>
        <ErrorBoundary fallback={EditorFallbackErrorComponent}>
          <div className="w-full flex-grow bg-white px-8 py-4">
            <Editor {...{ config, paper }} />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
