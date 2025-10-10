import { CheckCircleOutlined } from '@ant-design/icons';
import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Progress } from 'antd';
import { match } from 'ts-pattern';
import delay from 'es-toolkit/compat/delay';
import saveAs from 'file-saver';

import { trackDownloadProgress } from '@/utils/track-download-progress';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAssetElement } from '@/api/entitycore/utils';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DownloadIcon } from '@/components/icons';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export default function EntireCircuitExport({ circuit }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [downloadProgress, updateDownloadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.compressed_sonata_circuit,
  });
  const extension = configAsset?.content_type.split('/').pop();

  const downloadDirectory = useCallback(async () => {
    const result = await trackDownloadProgress(
      () =>
        downloadAsset({
          entityType: EntityTypeDict.Circuit,
          entityId: circuit.id,
          id: configAsset?.id!,
          asRawResponse: true,
          ctx: { virtualLabId, projectId },
        }),
      (progress) => {
        log('info', 'download-progress', progress);
        updateDownloadProgress(progress);
        if (progress >= 100) {
          setStatus('done');
          delay(() => setStatus('idle'), 3000);
        }
      }
    );

    const blob = new Blob(result, { type: configAsset?.content_type });
    saveAs(blob, `${circuit.name}.${extension}`);
    updateDownloadProgress(0);
  }, [circuit.id, configAsset?.id, virtualLabId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onClick = () => {
    if (configAsset?.path) {
      setStatus('downloading');
      downloadDirectory();
    }
  };
  const totalSize =
    configAsset?.size && configAsset?.size > 1 ? formatBytes(configAsset?.size) : '';

  const action = match({ status })
    .with({ status: 'idle' }, () => (
      <Button
        onClick={onClick}
        type="text"
        htmlType="button"
        className="border-primary-6 flex items-center justify-center rounded-none border border-solid"
        aria-label={`download ${circuit.name}`}
        title={`download ${circuit.name}`}
        icon={<DownloadIcon className="text-white!" />}
      />
    ))
    .with({ status: 'downloading' }, () => (
      <div className="flex flex-col items-center justify-center gap-0.5">
        <Progress
          type="circle"
          percent={Math.round(downloadProgress)}
          size={32}
          strokeColor="#1890ff"
          showInfo
          className="[&_.ant-progress-text]:text-white!"
          style={{ marginLeft: 8 }}
        />
        <span className="text-[8px]">downloading</span>
      </div>
    ))
    .with({ status: 'done' }, () => (
      <CheckCircleOutlined className="px-1 text-3xl text-green-400" />
    ))
    .otherwise(() => null);
  return (
    <div className="bg-primary-8 mx-8 flex flex-col justify-between rounded-md p-8 shadow-xs">
      <div id="download-header" className="flex w-full items-start justify-between gap-3">
        <div className="w-3/4 hyphens-auto">
          <div className="text-xl font-bold tracking-wide text-white uppercase">
            Download full circuit
          </div>
          <p className="text-primary-2 text-sm leading-normal font-light hyphens-auto">
            The complete circuit compressed in SONATA format,
            <a
              href="https://sonata-extension.readthedocs.io/en/latest/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {' '}
              see more here
            </a>
          </p>
        </div>
        <div className="text-primary-1 flex flex-row gap-x-3 font-semibold">
          <div>{totalSize}</div>
          <div>{extension}</div>
          {action}
        </div>
      </div>
    </div>
  );
}
