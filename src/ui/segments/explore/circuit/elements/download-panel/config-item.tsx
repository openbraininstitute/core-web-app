import { Button } from 'antd';
import { get, kebabCase } from 'es-toolkit/compat';
import { saveAs } from 'file-saver';

import { EntityTypeDict } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';
import { DownloadIcon } from '@/components/icons';
import { useAppNotification } from '@/components/notification';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { classNames } from '@/util/utils';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';

import type { ReactNode } from 'react';
import type { DirectoryItem } from '@/api/entitycore/types/shared/global';
import type { TCircuitContentConfigurationKeys } from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';
import type { Nullable } from '@/utils/type';

export type TConfigChild = {
  asset: Nullable<DirectoryItem & { path: string }>;
  title: string;
  mimeType: string;
  subItems?: Array<{ title: string; type: string }> | null;
  description?: string | null;
};

type TConfigChildProps = TConfigChild & {
  showType: string | null;
  showPrefix: string | null;
  onDownload: ({ path }: { path: string }) => void;
};

function ConfigChild({
  asset,
  showType,
  showPrefix,
  title,
  mimeType,
  subItems,
  description,
  onDownload,
}: TConfigChildProps) {
  const onClick = async () => {
    if (asset.path) {
      onDownload({ path: asset.path });
    }
  };

  const shouldBeDisabled = !asset.path || !asset.size;
  const action = (
    <Button
      onClick={onClick}
      type="text"
      htmlType="button"
      disabled={shouldBeDisabled}
      className={classNames(
        'flex items-center justify-center rounded-none border border-solid',
        'hover:text-primary-6!',
        shouldBeDisabled
          ? 'pointer-events-none cursor-not-allowed border-gray-300 bg-transparent text-gray-400!'
          : 'border-primary-6 text-white'
      )}
      aria-label={`Download ${title}`}
      title={`Download ${title}`}
      icon={<DownloadIcon className="text-current!" />}
    />
  );

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full flex-row items-center justify-between gap-y-10">
        <div className="w-2/3 hyphens-auto">
          <div className="line-clamp-2 text-lg font-bold text-white">{title}</div>
        </div>
        <div
          className={classNames(
            'flex flex-row items-center gap-x-3 font-light',
            shouldBeDisabled ? 'text-gray-400' : 'text-primary-2'
          )}
        >
          <div>{renderEmptyOrValue(asset.size ? formatBytes(asset.size) : null)}</div>
          <div>{renderEmptyOrValue(mimeType)}</div>
          {action}
        </div>
      </div>
      <p className="text-primary-2 max-w-2/3 text-base leading-normal font-light hyphens-auto">
        {subItems &&
          subItems.length > 0 &&
          subItems?.map((a) => (
            <span className="line-clamp-3" key={kebabCase(a.title)}>
              {showPrefix} {a.title} {showType && a.type ? `(${a.type} ${showType})` : ''}
            </span>
          ))}
        {!subItems && <span className="line-clamp-3">{description}</span>}
      </p>
    </div>
  );
}

export type ConfigItemProps = {
  key: TCircuitContentConfigurationKeys;
  name: string;
  description: ReactNode;
  count: number;
  mimeType: string;
  showType: string | null;
  showPrefix: string | null;
  emptyMessage?: string | null;
  items: Array<TConfigChild>;
  className?: string;
  // Presigned URLs point at S3 (cross-origin), so the browser ignores the
  // `download` attribute and renders inline-friendly types (json, txt) in a
  // new tab instead of saving them. When true, fetch the URL into a Blob and
  // hand it to file-saver — Blob URLs are same-origin so `download` is
  // honored. Leave false for large binaries (h5, etc.) to avoid buffering
  // the whole file in memory.
  forceDownload?: boolean;
  downloadConfig: {
    entityId: string | undefined;
    assetConfigId: string | undefined;
    context: {
      virtualLabId: string;
      projectId: string;
    };
  };
};

export function NetworkConfigItem({
  name,
  description,
  count,
  showType,
  showPrefix,
  emptyMessage,
  mimeType,
  items,
  className,
  forceDownload = false,
  downloadConfig,
}: ConfigItemProps) {
  const notify = useAppNotification();
  const onDownload = async ({ path }: { path: string }) => {
    const { entityId, assetConfigId, context } = downloadConfig;
    const { data, error } = await tryCatch(
      getEntityCorePresignedUrl({
        configAssetId: assetConfigId!,
        entityId: entityId!,
        entityType: EntityTypeDict.Circuit,
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        assetPath: path,
      })
    );
    if (data) {
      if (forceDownload) {
        const filename = path.split('/').filter(Boolean).pop() || path;
        const { data: blob, error: fetchError } = await tryCatch(
          fetch(data.url).then((r) => r.blob())
        );
        if (blob) saveAs(blob, filename);
        if (fetchError) {
          log('error', 'Error downloading file:', fetchError);
          notify.error({
            message: 'Download Error',
            description: get(
              fetchError,
              'message',
              'An error occurred while downloading the file.'
            ),
            placement: 'topRight',
          });
        }
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    }
    if (error) {
      log('error', 'Error downloading entire circuit:', error);
      notify.error({
        message: 'Download Error',
        description: get(error, 'message', 'An error occurred while downloading the circuit.'),
        placement: 'topRight',
      });
    }
  };

  return (
    <div className={classNames('w-full', className)}>
      <div className="mb-6 flex flex-row justify-between gap-x-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-row items-center text-xl font-bold tracking-wider text-white uppercase before:mr-2 before:block before:h-3 before:w-3 before:rounded-full before:bg-white before:content-['']">
            {name}
          </div>
          {description}
        </div>
        <div className="text-primary-1 flex flex-row flex-nowrap gap-x-3 text-base font-bold">
          <div className="whitespace-nowrap">
            {count} File{count > 1 ? 's' : ''}
          </div>
          <div>{mimeType}</div>
        </div>
      </div>
      <div className="border-primary-7 flex flex-col gap-y-6 border-l border-solid pl-8">
        {items?.length !== 0 ? (
          items?.map((item, idx) => {
            return (
              <ConfigChild
                key={`${kebabCase(item.title)}/${item.asset.size}/${idx}`} // eslint-disable-line react/no-array-index-key
                {...item} // eslint-disable-line  react/jsx-props-no-spreading
                showType={showType}
                showPrefix={showPrefix}
                onDownload={onDownload}
              />
            );
          })
        ) : (
          <div className="text-primary-4 w-full p-8 text-base font-light">
            {emptyMessage ?? 'No files available for this type.'}
          </div>
        )}
      </div>
    </div>
  );
}
