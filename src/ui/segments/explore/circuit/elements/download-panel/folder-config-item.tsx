import { Button, Tooltip } from 'antd';
import { get } from 'es-toolkit/compat';

import {
  createAssetFolderDownloadTicket,
  getAssetFolderDownloadUrl,
} from '@/api/entity-download/asset-folder';
import { EntityTypeDict } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';
import { DownloadIcon } from '@/components/icons';
import { useAppNotification } from '@/components/notification';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { classNames } from '@/util/utils';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';

import type { ReactNode } from 'react';
import type { FolderEntry } from '@/ui/segments/explore/circuit/elements/download-panel/helpers';

export type FolderDownloadConfig = {
  entityId: string;
  assetConfigId: string;
  context: { virtualLabId: string; projectId: string };
};

type FolderRowProps = {
  entry: FolderEntry;
  archiveBaseName: string;
  mimeType: string;
  downloadConfig: FolderDownloadConfig;
};

function FolderRow({ entry, archiveBaseName, mimeType, downloadConfig }: FolderRowProps) {
  const notify = useAppNotification();
  const disabled = entry.fileCount === 0;

  const onClick = async () => {
    const { entityId, assetConfigId, context } = downloadConfig;
    const filename = `${archiveBaseName}.tar.gz`;
    const { data, error } = await tryCatch(
      createAssetFolderDownloadTicket({
        entityType: EntityTypeDict.Circuit,
        entityId,
        assetId: assetConfigId,
        prefix: entry.prefix,
        filename,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
      })
    );
    if (data) {
      window.open(getAssetFolderDownloadUrl(data.ticketId), '_blank', 'noopener,noreferrer');
    }
    if (error) {
      log('error', 'Error downloading folder archive:', error);
      notify.error({
        message: 'Download Error',
        description: get(error, 'message', 'An error occurred while preparing the folder archive.'),
        placement: 'topRight',
      });
    }
  };

  return (
    <div className="flex w-full flex-row items-center justify-between gap-y-10">
      <div className="w-2/3 hyphens-auto">
        <div className="line-clamp-2 text-lg font-bold text-white">
          {entry.label}.{mimeType}
        </div>
        <div className="text-primary-2 text-sm font-light">{entry.prefix}</div>
      </div>
      <div
        className={classNames(
          'flex flex-row items-center gap-x-3 font-light',
          disabled ? 'text-gray-400' : 'text-primary-2'
        )}
      >
        <Tooltip title="Uncompressed total. The downloaded .tar.gz archive will be smaller.">
          <div className="cursor-help">
            {entry.totalSize ? `~${formatBytes(entry.totalSize)}` : renderEmptyOrValue(null)}
          </div>
        </Tooltip>
        <div>{renderEmptyOrValue(mimeType)}</div>
        <Button
          onClick={onClick}
          type="text"
          htmlType="button"
          disabled={disabled}
          className={classNames(
            'flex items-center justify-center rounded-none border border-solid',
            disabled
              ? 'pointer-events-none cursor-not-allowed border-gray-300 bg-transparent text-gray-400!'
              : 'border-primary-6 text-white! hover:text-white! [&_.ant-btn-icon]:text-white!'
          )}
          aria-label={`Download ${entry.label}`}
          title={`Download ${entry.label}`}
          icon={<DownloadIcon className={disabled ? 'text-current!' : 'text-white!'} />}
        />
      </div>
    </div>
  );
}

type FolderConfigGroupProps = {
  name: string;
  description: ReactNode;
  mimeType: string;
  entries: FolderEntry[];
  archiveBaseName: (entry: FolderEntry) => string;
  emptyMessage?: string;
  downloadConfig: FolderDownloadConfig;
};

export function FolderConfigGroup({
  name,
  description,
  mimeType,
  entries,
  archiveBaseName,
  emptyMessage,
  downloadConfig,
}: FolderConfigGroupProps) {
  const totalFiles = entries.reduce((acc, e) => acc + e.fileCount, 0);
  return (
    <div className="w-full">
      <div className="mb-6 flex flex-row justify-between gap-x-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-row items-center text-xl font-bold tracking-wider text-white uppercase before:mr-2 before:block before:h-3 before:w-3 before:rounded-full before:bg-white before:content-['']">
            {name}
          </div>
          {description}
        </div>
        <div className="text-primary-1 flex flex-row flex-nowrap gap-x-3 text-base font-bold">
          <div className="whitespace-nowrap">
            {totalFiles} File{totalFiles === 1 ? '' : 's'}
          </div>
          <div>{mimeType}</div>
        </div>
      </div>
      <div className="border-primary-7 flex flex-col gap-y-6 border-l border-solid pl-8">
        {entries.length === 0 ? (
          <div className="text-primary-4 w-full p-8 text-base font-light">
            {emptyMessage ?? 'No files available for this type.'}
          </div>
        ) : (
          entries.map((entry) => (
            <FolderRow
              key={entry.prefix}
              entry={entry}
              archiveBaseName={archiveBaseName(entry)}
              mimeType={mimeType}
              downloadConfig={downloadConfig}
            />
          ))
        )}
      </div>
    </div>
  );
}
