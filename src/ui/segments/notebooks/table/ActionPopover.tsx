'use client';

import { Modal } from 'antd';
import { useState } from 'react';
import { LoadingOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Popover } from 'antd/lib';

import { DownloadIconWhiteWithCorners } from '@/components/icons/DownloadIcon';
import { EyeIconWhiteWithinBox } from '@/components/icons/EyeIcon';
import { INotebook } from '@/api/entitycore/types/entities/notebook';

import { downloadArchive } from '@/services/entity-download';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { NotebookStartResponse, startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';

interface ActionPopoverProps {
  notebook: INotebook;
}

export default function ActionPopover({ notebook }: ActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const notification = useAppNotification();
  const { virtualLabId, projectId } = useWorkspace();
  const [loading, setLoading] = useState(false);

  async function handleRunNotebook() {
    if (loading) return;
    const asset = notebook.assets.find((n) => n.label === 'jupyter_notebook');
    if (!asset) return;

    setLoading(true);

    try {
      const retval: NotebookStartResponse = await startNotebook(
        notebook.id,
        asset.path,
        virtualLabId,
        projectId
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
    <>
      <Modal open={open} footer={false} onCancel={() => setOpen(false)} width="40%">
        <div>
          <h1 className="text-primary-8 text-3xl font-bold">Readme</h1>
          <div className="mt-5 text-lg text-black">{notebook.description}</div>
        </div>
      </Modal>
      <div id="popover">
        <Popover
          content={
            <div className="text-primary-9 flex min-w-[120px] flex-col gap-2">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                  }}
                  className="hover:text-primary-4 inline-flex items-center gap-[10px]"
                >
                  <EyeIconWhiteWithinBox className="text-primary-9 text-xs" aria-label="Readme" />
                  Readme
                </button>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  className="hover:text-primary-4 inline-flex items-center gap-[10px]"
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

              <div className="flex gap-4">
                <button
                  disabled={loading}
                  type="button"
                  className="hover:text-primary-4 inline-flex items-center gap-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunNotebook();
                  }}
                >
                  {!loading && <PlayCircleOutlined aria-label="Run" />}
                  {loading && <LoadingOutlined />}
                  Run
                </button>
              </div>
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
          <PlusOutlined className="bg-primary-8 rounded-full p-2 text-lg font-bold text-white shadow-md" />
        </Popover>
      </div>
    </>
  );
}
