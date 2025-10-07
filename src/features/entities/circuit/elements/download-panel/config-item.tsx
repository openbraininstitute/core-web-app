import { CheckCircleOutlined } from '@ant-design/icons';
import { ReactNode, useState } from 'react';
import { Button, Progress } from 'antd';
import { match } from 'ts-pattern';

import kebabCase from 'es-toolkit/compat/kebabCase';
import delay from 'es-toolkit/compat/delay';
import saveAs from 'file-saver';

import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { trackDownloadProgress } from '@/utils/track-download-progress';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DownloadIcon } from '@/components/icons';
import { formatBytes } from '@/utils/format';
import { classNames } from '@/util/utils';

import type { TCircuitContentConfigurationKeys } from '@/features/entities/circuit/elements/download-panel/content-configuration';
import type { DirectoryItem } from '@/api/entitycore/types/shared/global';
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
  onDownload: ({ path, onProgress }: { path: string; onProgress: (p: number) => void }) => void;
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
  const [downloadProgress, updateDownloadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

  const onClick = async () => {
    if (asset.path) {
      setStatus('downloading');
      await onDownload({
        path: asset.path,
        onProgress: (p: number) => {
          updateDownloadProgress(p);
          if (p >= 100) {
            setStatus('done');
            delay(() => setStatus('idle'), 3000);
          }
        },
      });
      updateDownloadProgress(0);
    }
  };

  const shouldBeDisabled = !asset.path || !asset.size;
  const action = match({ status })
    .with({ status: 'idle' }, () => (
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
        aria-label={`download ${title}`}
        title={`download ${title}`}
        icon={<DownloadIcon className="text-current!" />}
      />
    ))
    .with({ status: 'downloading' }, () => (
      <Progress
        type="circle"
        percent={Math.round(downloadProgress)}
        size={32}
        strokeColor="#1890ff"
        showInfo
        className="[&_.ant-progress-text]:text-white!"
        style={{ marginLeft: 8 }}
      />
    ))
    .with({ status: 'done' }, () => (
      <CheckCircleOutlined className="px-1 text-3xl text-green-400" />
    ))
    .otherwise(() => null);

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
  downloadConfig,
}: ConfigItemProps) {
  const onDownload = async ({
    path,
    onProgress,
  }: {
    path: string;
    onProgress?: (p: number) => void;
  }) => {
    const { entityId, assetConfigId, context } = downloadConfig;
    if (typeof entityId === 'string' && typeof assetConfigId === 'string') {
      const pathSplit = path.split('/');
      let filename = '';
      if (pathSplit.length === 1) {
        [filename] = pathSplit;
      } else if (pathSplit.length > 1) {
        const [population, nodeTile] = pathSplit;
        filename = `${population}_${nodeTile}`;
      }
      const extension = pathSplit.pop()?.split('.').pop();
      const result = await trackDownloadProgress(
        () =>
          downloadAsset({
            entityId,
            entityType: EntityTypeDict.Circuit,
            id: assetConfigId,
            ctx: context,
            asRawResponse: true,
            assetPath: path,
          }),
        onProgress
      );
      const blob = new Blob(result, { type: extension });
      saveAs(blob, `${filename}`);
    }
  };

  return (
    <div className={classNames('w-full', className)}>
      <div className="mb-6 flex flex-row justify-between">
        <div className="flex flex-col">
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
