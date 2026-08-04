'use client';

import { CheckCircleFilled, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useCallback, useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { downloadArchive } from '@/services/entity-download';
import sessionAtom from '@/state/session';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';

const DownloadStateDict = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
} as const;

type TDownloadState = (typeof DownloadStateDict)[keyof typeof DownloadStateDict];

export function EntityDownloadButton<T extends EntityCoreIdentifiable>({
  children,
  selectedRows,
  dataType,
  clearSelectedRows,
  workspace,
}: RenderButtonProps<T> & { children?: ReactNode; workspace?: WorkspaceContext }) {
  const session = useAtomValue(sessionAtom);
  const [downloadState, setDownloadState] = useState<TDownloadState>(DownloadStateDict.idle);
  const notify = useAppNotification();
  const entityCount = selectedRows.length;
  const isSingular = entityCount === 1;

  const download = useCallback(async () => {
    setDownloadState(DownloadStateDict.loading);

    const entity = getEntityByExtendedType({ type: dataType });
    if (!entity) {
      setDownloadState(DownloadStateDict.error);
      notify.error({
        message: 'Download failed',
        description: `Cannot find entity configuration for type: ${dataType}`,
      });
      return;
    }

    const entity_type = entity?.type;

    // a multi-selection has no single name to carry, so the archive keeps the type-only name
    const [onlyRow] = selectedRows.length === 1 ? selectedRows : [];
    const rowName = (onlyRow as { name?: unknown } | undefined)?.name;
    const archiveName = typeof rowName === 'string' ? rowName : undefined;

    try {
      await downloadArchive(
        entity_type,
        selectedRows.map((row) => row.id),
        workspace,
        archiveName
      );
      setDownloadState(DownloadStateDict.success);
      setTimeout(() => {
        setDownloadState(DownloadStateDict.idle);
        clearSelectedRows?.();
      }, 2000);
    } catch {
      setDownloadState(DownloadStateDict.error);
      setTimeout(() => setDownloadState(DownloadStateDict.idle), 2000);
    }
  }, [selectedRows, dataType, clearSelectedRows, notify.error, workspace]);

  const getButtonLabel = (): string => {
    if (isSingular) {
      return `Download entity (${entityCount})`;
    }
    return `Download entities (${entityCount})`;
  };

  const renderButtonIcon = () => {
    return (
      <AnimatePresence mode="wait">
        {downloadState === DownloadStateDict.loading && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <LoadingOutlined spin className="text-lg" />
          </motion.span>
        )}
        {downloadState === DownloadStateDict.success && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <CheckCircleFilled className="text-lg text-emerald-400" />
          </motion.span>
        )}
        {downloadState === DownloadStateDict.idle && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <DownloadOutlined className="text-lg" />
          </motion.span>
        )}
        {downloadState === DownloadStateDict.error && (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="text-red-400"
          >
            !
          </motion.span>
        )}
      </AnimatePresence>
    );
  };

  if (!session) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Button
        rounded
        variant="default"
        disabled={downloadState === DownloadStateDict.loading}
        className={cn(
          'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
          'bg-linear-to-r from-primary-9 via-primary-8 to-primary-9 bg-size-[200%_100%]',
          'transition-all duration-300 ease-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
        onClick={download}
        data-testid="bulk-download-button"
      >
        <span className="flex items-center justify-center gap-2.5">
          {renderButtonIcon()}
          <span className="whitespace-nowrap">{children ?? getButtonLabel()}</span>
        </span>
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            'bg-linear-to-b from-white/8 to-transparent'
          )}
        />
      </Button>
    </motion.div>
  );
}
