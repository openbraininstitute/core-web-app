import { Button, Progress } from 'antd';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import React from 'react';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import IconDownload from '@/components/icons/DownloadIcon';
import { IconSpinner } from '@/components/icons/spinner';
import { useAppNotification } from '@/components/notification';
import useWorkspace from '@/ui/hooks/use-workspace';
import { classNames } from '@/util/utils';
import { logError } from '@/utils/logger';

import { fetchAsset } from '../assets';

import type { NotificationInstance } from 'antd/es/notification/interface';
import type { DirectoryItem, IAsset } from '@/api/entitycore/types/shared/global';

import styles from './assets-downloader.module.css';

export interface AssetsDownloaderProps {
  className?: string;
  entityId: string;
}

export default function AssetsDownloader({ entityId, className }: AssetsDownloaderProps) {
  const notif = useAppNotification();
  const ctx = useWorkspace();
  const [step, setStep] = React.useState(0);
  const [asset, setAsset] = React.useState<IAsset | null>(null);
  const [list, setList] = React.useState<Record<string, DirectoryItem> | undefined | null>(
    undefined
  );
  const listCount = list ? Object.keys(list).length : 0;
  const [progress, setProgress] = React.useState(0);
  const handleFindAsset = useFindAssetHandler(setStep, setAsset, ctx, entityId, notif);
  const handleList = useListHandler(asset, setStep, setList, ctx, entityId, notif);
  const handleDownloadList = async () => {
    if (!list || !asset) {
      setStep(0);
      return;
    }

    setProgress(0);
    setStep(5);
    const zip = new JSZip();
    for (const name of Object.keys(list)) {
      try {
        const resp = await downloadAsset({
          ctx,
          entityId,
          entityType: 'em_cell_mesh',
          id: asset.id,
          assetPath: name,
          asRawResponse: true,
        });
        zip.file(name, await resp.arrayBuffer());
      } catch (error) {
        logError(`Unable to download "${name}"!`, error);
        notif.error({
          message: 'error',
          description: `Unable to download "${name}"!`,
        });
      } finally {
        setProgress((prev) => prev + 1);
      }
    }
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 },
    });
    saveAs(blob, 'lods.zip');
    notif.success({
      message: 'Success',
      description: `Downloaded ${listCount} files!`,
    });
    setStep(0);
  };

  return (
    <div className={classNames(className, styles.assetsDownloader)}>
      {step === 0 && (
        <Button onClick={handleFindAsset}>
          <IconDownload />
          <div>Download assets</div>
        </Button>
      )}
      {step === 1 && (
        <div className={styles.spinner}>
          <IconSpinner />
          <div>Fetching asset description...</div>
        </div>
      )}
      {step === 2 && (
        <>
          <Button onClick={handleList}>
            <div>List asset folder</div>
          </Button>
          <Button onClick={() => setStep(0)}>
            <div>Cancel</div>
          </Button>
          <div>
            <details>
              <summary>Asset details</summary>
              <pre>{JSON.stringify(asset, null, 2)}</pre>
            </details>
          </div>
        </>
      )}
      {step === 3 && (
        <div className={styles.spinner}>
          <IconSpinner />
          <div>Listing asset folder...</div>
        </div>
      )}
      {step === 4 && list && (
        <>
          <Button onClick={handleDownloadList}>
            <IconDownload />
            <div>
              Download {listCount} files (<strong>{computeSizeInMegaBytes(list)} Mb</strong>)
            </div>
          </Button>
          <Button onClick={() => setStep(0)}>
            <div>Cancel</div>
          </Button>
          <details>
            <summary>Details of {listCount} files</summary>
            <pre>{JSON.stringify(list, null, 2)}</pre>
          </details>
        </>
      )}
      {step === 5 && list && (
        <>
          <div>Downloading</div>
          <Progress percent={Math.ceil((100 * progress) / listCount)} />
        </>
      )}
    </div>
  );
}

function useListHandler(
  asset: IAsset | null,
  setStep: React.Dispatch<React.SetStateAction<number>>,
  setList: React.Dispatch<React.SetStateAction<Record<string, DirectoryItem> | null | undefined>>,
  ctx: { virtualLabId: string; projectId: string },
  entityId: string,
  notif: NotificationInstance
) {
  return async () => {
    if (!asset) {
      setStep(0);
      return;
    }

    setStep(3);
    setList(undefined);
    try {
      const response = await listDirectoryOfAssets({
        ctx,
        entityId,
        entityType: 'em_cell_mesh',
        id: asset.id,
      });
      setList(response.files);
      setStep(4);
    } catch (error) {
      logError(`Unable to load assets for entity "${entityId}"!`, error);
      notif.error({
        message: 'Error',
        description: 'Failed to fetch asset',
      });
      setStep(0);
    }
  };
}

function useFindAssetHandler(
  setStep: React.Dispatch<React.SetStateAction<number>>,
  setAsset: React.Dispatch<React.SetStateAction<IAsset | null>>,
  ctx: { virtualLabId: string; projectId: string },
  entityId: string,
  notif: NotificationInstance
) {
  return async () => {
    setStep(1);
    setAsset(null);
    try {
      const item = await fetchAsset(ctx, entityId);
      if (!item) {
        setStep(0);
        return;
      }
      setAsset(item);
      setStep(2);
    } catch (error) {
      logError(`Unable to load assets for entity "${entityId}"!`, error);
      notif.error({
        message: 'Error',
        description: 'Failed to fetch asset',
      });
      setStep(0);
    }
  };
}

function computeSizeInMegaBytes(list: Record<string, DirectoryItem>): string {
  const bytes = Object.values(list).reduce((acc, item) => {
    if (item.size) {
      return acc + item.size;
    }
    return acc;
  }, 0);
  return (bytes * 1e-6).toFixed(1);
}
