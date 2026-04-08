import { CloseOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiFolderUploadFill } from '@remixicon/react';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

interface IImportHeaderActionButtonsProps {
  shouldShowBulkFileUploadAction: boolean;
  isBulkFileUploadProcessing: boolean;
  onOpenBulkUploadDialog: () => void;
  onDownloadCurrentCsv: () => void;
  onClose: () => void;
}

const HEADER_ICON_BUTTON_CLASSNAME = cn(
  'flex items-center justify-center gap-4 border border-neutral-200 bg-white md:w-10! lg:w-12! shadow-md',
  'hover:bg-primary-9 hover:text-white'
);

export function ImportHeaderActionButtons({
  shouldShowBulkFileUploadAction,
  isBulkFileUploadProcessing,
  onOpenBulkUploadDialog,
  onDownloadCurrentCsv,
  onClose,
}: IImportHeaderActionButtonsProps) {
  return (
    <>
      {shouldShowBulkFileUploadAction ? (
        <Button
          rounded
          title="Upload files folder"
          type="button"
          variant="icon"
          size="responsive"
          className={HEADER_ICON_BUTTON_CLASSNAME}
          disabled={isBulkFileUploadProcessing}
          onClick={onOpenBulkUploadDialog}
        >
          <span className="sr-only">Upload files folder</span>
          <RiFolderUploadFill />
        </Button>
      ) : null}
      <Button
        rounded
        title="Download CSV"
        className={HEADER_ICON_BUTTON_CLASSNAME}
        type="button"
        variant="icon"
        size="responsive"
        onClick={onDownloadCurrentCsv}
      >
        <span className="sr-only">Download CSV</span>
        <RiDownload2Line />
      </Button>
      <Button
        rounded
        title="Back to contribute page"
        type="button"
        variant="ghost"
        className={cn(
          'border-none bg-transparent text-neutral-400 shadow-none md:h-10 md:w-10 lg:h-12 lg:w-12'
        )}
        onClick={onClose}
        aria-label="Back to contribute page"
      >
        <span className="sr-only">Back to contribute page</span>
        <CloseOutlined className="text-base" />
      </Button>
    </>
  );
}
