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
import { env } from '@/env';

interface ActionPopoverProps {
  notebook: Notebook;
  loadingZip: boolean;
  onReadmeClick: (notebook: Notebook) => void;
  onDownloadClick: (notebook: Notebook) => void;
  onDeleteClick?: (id: string) => void;
  onRunOnEksClick?: (notebook: Notebook) => void;
}

export default function ActionPopover({
  notebook,
  loadingZip,
  onReadmeClick,
  onDownloadClick,
  onDeleteClick,
  onRunOnEksClick,
}: ActionPopoverProps) {
  return (
    <div id="popover">
      <Popover
        content={
          <div className="text-primary-9 flex min-w-[120px] flex-col gap-2">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReadmeClick(notebook);
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
                  onDownloadClick(notebook);
                }}
              >
                <DownloadIconWhiteWithCorners
                  className="text-primary-9 text-xs"
                  aria-label="Download"
                />
                Download
              </button>
              {loadingZip && <LoadingOutlined />}
            </div>

            {onDeleteClick && (
              <div className="text-error flex gap-4">
                <button
                  type="button"
                  className="hover:text-primary-4 inline-flex items-center gap-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(notebook.id);
                  }}
                >
                  <DeleteOutlined className="text-error text-xs" aria-label="Delete" />
                  Delete
                </button>
              </div>
            )}
            {/* {enableRunNotebook && onRunClick && (
              <div className="flex gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunClick(notebook);
                  }}
                >
                  <PlayCircleOutlined aria-label="Run" />
                  Run
                </button>
              </div>
            )} */}
            {onRunOnEksClick &&
              (env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'staging' ||
                env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'preview' ||
                env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'development') && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="hover:text-primary-4 inline-flex items-center gap-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunOnEksClick(notebook);
                    }}
                  >
                    <PlayCircleOutlined aria-label="Run" />
                    Run
                  </button>
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
        <PlusOutlined className="rounded-full !bg-white p-2 text-lg !text-white shadow-md" />
      </Popover>
    </div>
  );
}
