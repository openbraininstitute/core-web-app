import { DownloadIconWhiteWithCorners } from '@/components/icons/DownloadIcon';
import { EyeIconWhiteWithinBox } from '@/components/icons/EyeIcon';
import { Notebook } from '@/util/virtual-lab/types';
import {
  DeleteOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Popover } from 'antd/lib';

const renderActionColumns = ({
  setDisplay,
  setCurrentNotebook,
  _: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  notebook,
  loadingZip,
  handleDownloadClick,
  onDelete,
  enableRunNotebook,
  runNotebook,
}: {
  setDisplay: (value: string) => void;
  setCurrentNotebook: (notebook: Notebook) => void;
  _: string;
  notebook: Notebook;
  loadingZip: boolean;
  handleDownloadClick: (notebook: Notebook) => void;
  onDelete: (id: string) => void;
  enableRunNotebook: boolean;
  runNotebook: (notebook: Notebook) => void;
}) => {
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
                  setDisplay('readme');
                  setCurrentNotebook(notebook);
                }}
                className="text-primary-9 inline-flex items-center gap-[10px]"
              >
                <EyeIconWhiteWithinBox className="text-xs" aria-label="Readme" />
                Readme
              </button>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="text-primary-9 inline-flex items-center gap-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadClick(notebook);
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
                  className="inline-flex items-center gap-[10px]"
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
            {enableRunNotebook && (
              <div className="flex gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    runNotebook(notebook);
                  }}
                >
                  <PlayCircleOutlined aria-label="Run" />
                  Run
                </button>
              </div>
            )}
          </div>
        }
        color="#FFF"
        trigger="click"
        placement="left"
        arrow={false}
      >
        <PlusOutlined className="rounded-full border border-[#002766] !bg-transparent p-2 text-lg" />
      </Popover>
    </div>
  );
};

export default renderActionColumns;
