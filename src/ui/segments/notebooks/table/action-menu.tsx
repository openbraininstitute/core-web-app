'use client';

import {
  DeleteOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Popover } from 'antd/lib';
import { DownloadIconWhiteWithCorners } from '@/components/icons/DownloadIcon';
import { EyeIconWhiteWithinBox } from '@/components/icons/EyeIcon';
import { Notebook } from '@/util/virtual-lab/types';

export interface ActionMenuProps {
  notebook: Notebook;
  loadingZip: boolean;
  onShowReadme: (notebook: Notebook) => void;
  onDownload: (notebook: Notebook) => void;
  onDelete?: (id: string) => void;
  onRun?: (notebook: Notebook) => void;
  enableRunNotebook?: boolean;
}

export type BuildColumnsArgs = Omit<ActionMenuProps, 'notebook'> & {
  loading: boolean;
};

export default function ActionMenu({
  notebook,
  loadingZip,
  onShowReadme,
  onDownload,
  onDelete,
  onRun,
  enableRunNotebook,
}: ActionMenuProps) {
  return (
    <Popover
      content={
        <div className="flex min-w-[120px] flex-col gap-2 text-white">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowReadme(notebook);
              }}
              className="inline-flex items-center gap-[10px]"
            >
              <EyeIconWhiteWithinBox className="text-xs" aria-label="Readme" />
              Readme
            </button>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              className="hover:text-primary-4 inline-flex items-center gap-[10px]"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(notebook);
              }}
            >
              <DownloadIconWhiteWithCorners className="text-xs" aria-label="Download" />
              Download
            </button>
            {loadingZip && <LoadingOutlined />}
          </div>

          {onDelete && (
            <div className="text-error flex gap-4">
              <button
                type="button"
                className="hover:text-primary-4 inline-flex items-center gap-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notebook.id);
                }}
              >
                <DeleteOutlined className="text-error text-xs" aria-label="Delete" />
                Delete
              </button>
            </div>
          )}
          {enableRunNotebook && onRun && (
            <div className="flex gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onRun(notebook);
                }}
              >
                <PlayCircleOutlined aria-label="Run" />
                Run
              </button>
            </div>
          )}
        </div>
      }
      overlayStyle={{ border: '1px solid #096DD9' }}
      color="#002766"
      trigger="click"
      placement="bottom"
      arrow={false}
    >
      <PlusOutlined className="border border-[#096DD9] p-2 text-lg" />
    </Popover>
  );
}
