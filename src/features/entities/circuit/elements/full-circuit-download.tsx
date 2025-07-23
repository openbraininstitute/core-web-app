import { useCallback, useState, useRef, useEffect } from 'react';
import { Button, Progress } from 'antd';
import classNames from 'classnames';
import JSZip from 'jszip';
import pMap from 'p-map';

import { trackDownloadProgress } from '@/utils/download-progress';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { DownloadIcon } from '@/components/icons';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { log } from '@/utils/logger';

import type { DirectoryItem } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import { formatBytes } from '@/utils/format';
import { CloseCircleFilled } from '@ant-design/icons';

type Props = {
  context: WorkspaceContext;
  directory: Record<string, DirectoryItem>;
  entityId: string;
  assetId: string;
};

type FileDisplayState = {
  progress: number;
  status: 'downloading' | 'completed' | 'hiding';
  startTime: number;
  completedTime?: number;
  fileSize: number;
};

const MIN_DISPLAY_DURATION = 1000; // 1 second minimum display time
const SMALL_FILE_THRESHOLD = 1024 * 512; // 512KB threshold for small files
const SMALL_FILE_EXTRA_DURATION = 1000; // Extra 1 second for small files

export function EntireCircuitExport({ directory, entityId, assetId, context }: Props) {
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    completed: Array<string>;
    failed: Array<{ fileName: string; error: string }>;
    isDownloading: boolean;
    isZipping: boolean;
    zipProgress: { current: number; total: number; currentFile: string };
    isDone: boolean;
  }>({
    current: 0,
    total: 0,
    completed: [],
    failed: [
      { fileName: 'external_S1nonbarrel_neurons__S1nonbarrel_neurons__chemical.h5', error: 'test' },
      { fileName: 'external_S1nonbarrel_neurons/nodes.h5', error: 'test2' },
    ],
    isDownloading: false,
    isZipping: false,
    zipProgress: { current: 0, total: 0, currentFile: '' },
    isDone: false,
  });

  const [fileDisplayStates, setFileDisplayStates] = useState<Record<string, FileDisplayState>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const abortController = new AbortController();

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const startFileDisplay = useCallback((fileName: string, fileSize: number) => {
    const now = Date.now();
    setFileDisplayStates((prev) => ({
      ...prev,
      [fileName]: {
        progress: 0,
        status: 'downloading',
        startTime: now,
        fileSize,
      },
    }));
  }, []);

  const updateFileProgress = useCallback((fileName: string, progress: number) => {
    setFileDisplayStates((prev) => {
      const current = prev[fileName];
      if (!current) return prev;

      return {
        ...prev,
        [fileName]: {
          ...current,
          progress,
        },
      };
    });
  }, []);

  const markFileCompleted = useCallback((fileName: string) => {
    const now = Date.now();

    setFileDisplayStates((prev) => {
      const current = prev[fileName];
      if (!current) return prev;

      const timeSinceStart = now - current.startTime;
      const isSmallFile = current.fileSize < SMALL_FILE_THRESHOLD;
      const baseDuration = MIN_DISPLAY_DURATION;
      const extraDuration = isSmallFile ? SMALL_FILE_EXTRA_DURATION : 0;
      const totalRequiredDuration = baseDuration + extraDuration;

      const remainingDisplayTime = Math.max(0, totalRequiredDuration - timeSinceStart);

      const updatedState = {
        ...current,
        status: 'completed' as const,
        completedTime: now,
      };

      // Schedule hiding after the calculated display time
      const timeoutId = setTimeout(() => {
        setFileDisplayStates((prevStates) => {
          const currentState = prevStates[fileName];
          if (!currentState) return prevStates;

          return {
            ...prevStates,
            [fileName]: {
              ...currentState,
              status: 'hiding',
            },
          };
        });

        // Remove completely after fade out
        const removeTimeoutId = setTimeout(() => {
          setFileDisplayStates((prevStates) => {
            const { [fileName]: removed, ...rest } = prevStates;
            return rest;
          });
          delete timeoutsRef.current[fileName];
          delete timeoutsRef.current[`remove_${fileName}`];
        }, 300);

        timeoutsRef.current[`remove_${fileName}`] = removeTimeoutId;
      }, remainingDisplayTime);

      timeoutsRef.current[fileName] = timeoutId;

      return {
        ...prev,
        [fileName]: updatedState,
      };
    });
  }, []);

  const createZipWithStructure = async (
    downloadedFiles: Map<string, Blob>,
    onProgress: (current: number, total: number, currentFile: string) => void
  ) => {
    const zip = new JSZip();

    let processedFiles = 0;
    const totalFiles = downloadedFiles.size;

    for (const [fileName, blob] of downloadedFiles) {
      const arrayBuffer = await blob.arrayBuffer();
      zip.file(fileName, arrayBuffer);

      processedFiles++;
      if (onProgress) {
        onProgress(processedFiles, totalFiles, fileName);
      }
    }

    // Generate ZIP file with compression
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Balanced compression level
      },
      streamFiles: true, // Better memory usage for large files
    });
  };

  const downloadDirectory = useCallback(async () => {
    const fileNames = Object.keys(directory);
    const totalFiles = fileNames.length;

    setDownloadProgress({
      current: 0,
      total: totalFiles,
      completed: [],
      failed: [],
      isDownloading: true,
      isZipping: false,
      zipProgress: { current: 0, total: 0, currentFile: '' },
      isDone: false,
    });

    // Clear any existing file display states
    setFileDisplayStates({});

    const downloadedFiles = new Map<string, Blob>();
    const completedFiles = [];
    const failedFiles = [];

    const downloadWithConcurrency = async (fileNames: Array<string>, maxConcurrency = 3) => {
      const downloadFile = async (fileName: string) => {
        const fileSize = directory[fileName]?.size || 0;

        try {
          // Start showing the file when download begins
          startFileDisplay(fileName, fileSize);

          const result = await trackDownloadProgress(
            () =>
              downloadAsset({
                entityType: EntityTypeEnum.Circuit,
                entityId,
                id: assetId,
                assetPath: fileName,
                asRawResponse: true,
                ctx: context,
              }),
            (progress) => {
              updateFileProgress(fileName, progress);

              if (progress >= 100) {
                markFileCompleted(fileName);
              }
            }
          );

          const extension = fileName.split('/').pop()?.split('.').pop();
          const blob = new Blob(result, { type: extension });
          downloadedFiles.set(fileName, blob);
          completedFiles.push(fileName);

          setDownloadProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            completed: [...prev.completed, fileName],
          }));

          return { fileName, success: true, blob };
        } catch (error) {
          log('error', `Failed to download ${fileName}:`, error);
          failedFiles.push({ fileName, error: (error as { message: string }).message });

          // Remove failed file from display
          setFileDisplayStates((prev) => {
            const { [fileName]: removed, ...rest } = prev;
            return rest;
          });

          setDownloadProgress((prev) => ({
            ...prev,
            current: prev.current + 1,
            failed: [...prev.failed, { fileName, error: (error as { message: string }).message }],
          }));

          return { fileName, success: false, error: (error as { message: string }).message };
        }
      };

      const results = await pMap(fileNames, downloadFile, {
        concurrency: maxConcurrency,
        stopOnError: false,
        signal: abortController.signal,
      });

      return results;
    };

    try {
      await downloadWithConcurrency(fileNames);

      setDownloadProgress((prev) => ({
        ...prev,
        isDownloading: false,
        isZipping: true,
        zipProgress: { current: 0, total: downloadedFiles.size, currentFile: '' },
      }));

      const zipBlob = await createZipWithStructure(
        downloadedFiles,
        (current: number, total: number, currentFile: string) => {
          setDownloadProgress((prev) => ({
            ...prev,
            zipProgress: { current, total, currentFile },
          }));
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `s3-directory-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadProgress((prev) => ({
        ...prev,
        isZipping: false,
        isDone: true,
        currentFile: '',
        zipProgress: { current: 0, total: 0, currentFile: '' },
      }));
    } catch (error) {
      log('error', 'Download process failed:', error);
      setDownloadProgress((prev) => ({
        ...prev,
        isDownloading: false,
        isZipping: false,
        isDone: true,
        zipProgress: { current: 0, total: 0, currentFile: '' },
      }));
    }
  }, [
    directory,
    entityId,
    assetId,
    context,
    startFileDisplay,
    updateFileProgress,
    markFileCompleted,
  ]);

  const totalSize = formatBytes(
    Object.values(directory ?? {}).reduce((sum, file) => sum + file.size, 0) ?? 0
  );
  const progressPercentage = downloadProgress.total
    ? (downloadProgress.current / downloadProgress.total) * 100
    : 0;

  const visibleFiles = Object.values(fileDisplayStates).filter(
    (state) => state.status !== 'hiding'
  );
  const containerHeight = Math.min(visibleFiles.length * 40 + 8, 240);

  return (
    <div className="bg-primary-8 mx-8 flex flex-col justify-between rounded-lg p-8 shadow-xl">
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
          <div>h5</div>
          <Button
            htmlType="button"
            className="border-primary-6 flex items-center justify-center rounded-none border border-solid p-2"
            aria-label="Download the full circuit"
            onClick={downloadDirectory}
            icon={<DownloadIcon className="text-white" />}
          />
        </div>
      </div>
      {(downloadProgress.isDownloading || downloadProgress.isZipping) && (
        <div id="download-progress-bar" className="mt-4 w-full">
          {downloadProgress.isDownloading && (
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="bg-primary-4 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
          <div className="mt-1 text-xs text-white/90">
            {downloadProgress.isZipping
              ? `${downloadProgress.zipProgress.current} of ${downloadProgress.zipProgress.total} files added to ZIP`
              : `${downloadProgress.current} of ${downloadProgress.total} files processed`}
          </div>
        </div>
      )}
      <div
        id="download-progress-list"
        className={classNames(
          'flex w-full flex-col gap-1 overflow-hidden transition-all duration-300 ease-out',
          downloadProgress.isDownloading ? 'mt-4' : 'mt-0'
        )}
        style={{
          height: downloadProgress.isDownloading ? `${Math.max(containerHeight, 40)}px` : '0px',
        }}
      >
        {Object.entries(fileDisplayStates)
          .sort(([, stateA], [, stateB]) => {
            // priority order: downloading > completed > hiding
            const statusPriority = {
              downloading: 0,
              completed: 1,
              hiding: 2,
            };

            const priorityA = statusPriority[stateA.status];
            const priorityB = statusPriority[stateB.status];

            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }

            if (stateA.status === 'downloading' && stateB.status === 'downloading') {
              return stateB.startTime - stateA.startTime;
            }

            return stateA.startTime - stateB.startTime;
          })
          .map(([fileName, state]) => (
            <div
              key={fileName}
              className={classNames(
                'flex transform items-center justify-between gap-1 px-2 py-1 transition-all duration-300 ease-out',
                {
                  'translate-y-0 scale-100 opacity-100':
                    state.status === 'downloading' || state.status === 'completed',
                  'translate-y-2 scale-95 opacity-0': state.status === 'hiding',
                }
              )}
              style={{
                height: '32px',
              }}
            >
              <div className="flex-1 truncate text-sm font-light text-balance text-white">
                {fileName}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-xs text-gray-300">{formatBytes(state.fileSize)}</span>
                <Progress
                  type="circle"
                  percent={Math.round(state.progress)}
                  size={18}
                  strokeColor={state.status === 'completed' ? '#52c41a' : '#1890ff'}
                  showInfo={false}
                />
              </div>
            </div>
          ))}
      </div>
      {downloadProgress.failed.length > 0 && (
        <div
          id="download-failed-list"
          className={classNames('border-neutral-2 mt-4 rounded-none border-[.5px] p-4')}
        >
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-red-400">
            <CloseCircleFilled className="h-4 w-4" />
            Failed Downloads ({downloadProgress.failed.length})
          </h3>
          <ol className="max-h-32 list-inside list-decimal overflow-y-auto">
            {downloadProgress.failed.map((item, index) => (
              <li key={index} className="ml-5 py-1 text-sm font-medium text-white">
                {item.fileName}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
