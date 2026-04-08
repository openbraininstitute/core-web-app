import { CloseOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiFolderUploadFill } from '@remixicon/react';
import { useState } from 'react';

import { ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME } from '@/features/entity-import/core/shared/ui';
import {
  type IImportHeaderNotification,
  resolveCsvUploadNotificationPresentation,
} from '@/features/entity-import/ui/elements/helpers';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface IImportHeaderActionButtonsProps {
  shouldShowBulkFileUploadAction: boolean;
  isBulkFileUploadProcessing: boolean;
  bulkUploadNotifications: IImportHeaderNotification[];
  onOpenBulkUploadDialog: () => void;
  onDismissBulkUploadNotifications: () => void;
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
  bulkUploadNotifications,
  onOpenBulkUploadDialog,
  onDismissBulkUploadNotifications,
  onDownloadCurrentCsv,
  onClose,
}: IImportHeaderActionButtonsProps) {
  const [isBulkUploadTooltipInteractiveOpen, setIsBulkUploadTooltipInteractiveOpen] =
    useState(false);
  const shouldForceBulkUploadTooltipOpen = bulkUploadNotifications.length > 0;
  const isBulkUploadTooltipOpen =
    shouldForceBulkUploadTooltipOpen || isBulkUploadTooltipInteractiveOpen;

  return (
    <>
      {shouldShowBulkFileUploadAction ? (
        <Tooltip
          open={isBulkUploadTooltipOpen}
          onOpenChange={(nextOpen) => {
            if (shouldForceBulkUploadTooltipOpen) {
              setIsBulkUploadTooltipInteractiveOpen(false);
              return;
            }
            setIsBulkUploadTooltipInteractiveOpen(nextOpen);
          }}
        >
          <TooltipTrigger asChild>
            <span className="inline-flex">
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
            </span>
          </TooltipTrigger>
          {bulkUploadNotifications.length > 0 ? (
            <TooltipContent
              side="bottom"
              align="end"
              sideOffset={0}
              alignOffset={0}
              arrowPadding={0}
              className={cn(
                ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
                'w-96 max-w-[calc(100vw-2rem)] p-3 text-left text-neutral-900'
              )}
              arrowClassName="bg-white border-r border-b border-neutral-200 translate-y-[calc(-50%-1px)]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary-9">Folder upload issues</p>
                  <button
                    type="button"
                    aria-label="Close CSV upload status"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      'border border-neutral-200 bg-white text-neutral-500 transition',
                      'hover:border-neutral-300 hover:text-primary-9'
                    )}
                    onClick={onDismissBulkUploadNotifications}
                  >
                    <CloseOutlined className="text-xs" />
                  </button>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto secondary-scrollbar pr-1">
                  {bulkUploadNotifications.map((notification) => {
                    const presentation = resolveCsvUploadNotificationPresentation(
                      notification.tone
                    );
                    const { Icon } = presentation;
                    return (
                      <div
                        key={notification.id}
                        data-testid="csv-upload-notification"
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                              presentation.iconClassName
                            )}
                          >
                            <Icon className="text-xs" />
                          </div>
                          <p className="min-w-0 text-sm leading-5 text-neutral-700">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TooltipContent>
          ) : null}
        </Tooltip>
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
