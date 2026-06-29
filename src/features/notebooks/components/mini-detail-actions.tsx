import { EyeOutlined, LoadingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { RiCheckFill, RiFileCopyLine } from '@remixicon/react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from 'antd';
import { motion } from 'motion/react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DownloadIcon } from '@/components/icons/buttons';
import { config } from '@/config';
import { type TViewVariant, ViewVariant } from '@/constants';
import { useRunNotebook } from '@/features/notebooks/hooks/use-run-notebook';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';

function MiniActionIcon({
  label,
  theme,
  onClick,
  children,
}: {
  label: string;
  theme: TViewVariant;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          rounded
          title={label}
          className={cn(
            'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
            { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
          )}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side="top"
        sideOffset={3}
        align="center"
        className="text-primary-8 bg-white"
        arrowClassName="bg-white"
      >
        <span>{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function NotebookActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
  theme = ViewVariant.Default,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  theme?: TViewVariant;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const [, copy, , copying] = useCopyToClipboard();
  const [readmeOpen, setReadmeOpen] = useState(false);

  const isTemplate = dataType === ExtendedEntitiesTypeDict.AnalysisNotebookTemplate;
  const typeParam = dataType ? resolveConcreteEntityPathParam(dataType) : '';
  const description =
    'description' in record ? (record.description as string | undefined) : undefined;
  const assets = 'assets' in record && record.assets ? (record.assets as IAsset[]) : [];

  const { run, runTargets, runningTarget, running, creditsModal } = useRunNotebook({
    id: record.id,
    assets,
  });

  const { isPending: pendingDownload, mutateAsync: downloadAsync } = useMutation({
    mutationFn: () => downloadArchive(record.type, [record.id], { virtualLabId, projectId }),
  });

  return (
    <div
      data-testid="notebook-mini-actions"
      className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4"
    >
      {creditsModal}
      <Modal
        centered
        open={readmeOpen}
        footer={false}
        onCancel={() => setReadmeOpen(false)}
        width="40%"
      >
        <div>
          <h1 className="text-primary-8 text-3xl font-bold">Readme</h1>
          <div className="mt-5 text-lg text-black">{description}</div>
        </div>
      </Modal>

      <MiniActionIcon label="Copy ID" theme={theme} onClick={() => copy(record.id)}>
        {copying ? (
          <motion.div
            key="checkmark"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.2 }}
          >
            <RiCheckFill className="text-accent-light size-6" />
          </motion.div>
        ) : (
          <RiFileCopyLine />
        )}
      </MiniActionIcon>

      <MiniActionIcon label="Download" theme={theme} onClick={() => downloadAsync()}>
        {pendingDownload ? <LoadingOutlined spin className="text-primary-3" /> : <DownloadIcon />}
      </MiniActionIcon>

      {isTemplate && (
        <MiniActionIcon label="Readme" theme={theme} onClick={() => setReadmeOpen(true)}>
          <EyeOutlined className="text-xl" />
        </MiniActionIcon>
      )}

      {isTemplate ? (
        runTargets.map((target) => (
          <MiniActionIcon
            key={target.key}
            label={target.label}
            theme={theme}
            onClick={() => run(target)}
          >
            {runningTarget === target.key ? (
              <LoadingOutlined spin className="text-primary-3" />
            ) : (
              <target.Icon className="size-6" />
            )}
          </MiniActionIcon>
        ))
      ) : (
        <MiniActionIcon label="Run" theme={theme} onClick={() => run()}>
          {running ? (
            <LoadingOutlined spin className="text-primary-3" />
          ) : (
            <PlayCircleOutlined className="text-xl" />
          )}
        </MiniActionIcon>
      )}

      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className={cn(
          'hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
          { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
        )}
      >
        <Link
          href={{
            pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/view/${typeParam}/${record.id}/overview`,
          }}
        >
          View details
        </Link>
      </Button>
    </div>
  );
}
