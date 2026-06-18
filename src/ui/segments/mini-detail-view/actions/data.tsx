import { LoadingOutlined } from '@ant-design/icons';
import { RiCheckFill, RiFileCopyLine } from '@remixicon/react';
import { useMutation } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { motion } from 'motion/react';
import Link from 'next/link';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DownloadIcon } from '@/components/icons/buttons';
import { config } from '@/config';
import { type TViewVariant, ViewVariant } from '@/constants';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import { cn } from '@/utils/css-class';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function DataActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
  theme,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
  theme?: TViewVariant;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const [, copy, , copying] = useCopyToClipboard();
  const onCopyClipboard = () => copy(record.id);

  const { isPending: pendingDownload, mutateAsync: downloadAsync } = useMutation({
    mutationFn: () => downloadArchive(record.type, [record.id], { virtualLabId, projectId }),
  });
  const [, setDownloadPanelCircuit] = useAtom(downloadPanelCircuitAtom);
  const onDownload = () => {
    if (
      includes(
        [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.SingleNeuronCircuit],
        dataType
      )
    ) {
      setDownloadPanelCircuit(record as ICircuit);
    } else {
      downloadAsync();
    }
  };

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            rounded
            title="Copy ID"
            className={cn(
              'hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
              { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
            )}
            onClick={onCopyClipboard}
          >
            {copying ? (
              <motion.div
                key="checkmark"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  duration: 0.2,
                }}
              >
                <RiCheckFill
                  className={cn('text-accent-light size-6', {
                    'group:hover:text-primary-8!': theme === ViewVariant.Light,
                  })}
                />
              </motion.div>
            ) : (
              <div key="copy">
                <RiFileCopyLine
                  className={cn({
                    'group:hover:text-primary-8!': theme === ViewVariant.Light,
                  })}
                />
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={3}
          align="center"
          className={cn('text-primary-8 bg-white', {
            'bg-white text-primary-9': theme === ViewVariant.Light,
          })}
          arrowClassName="bg-white"
        >
          <span>Copy ID</span>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            rounded
            title="download"
            className={cn(
              'group hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]',
              { 'hover:bg-white! hover:text-primary-8!': theme === ViewVariant.Light }
            )}
            onClick={onDownload}
          >
            {pendingDownload ? (
              <LoadingOutlined spin className="text-primary-3" />
            ) : (
              <DownloadIcon
                className={cn({
                  'group:hover:text-primary-8!': theme === ViewVariant.Light,
                })}
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={3}
          align="center"
          className={cn('text-primary-8 bg-white')}
          arrowClassName="bg-white"
        >
          <span>Download</span>
        </TooltipContent>
      </Tooltip>

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
            pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${resolveConcreteEntityPathParam(dataType)}/${record.id}`,
          }}
        >
          View details
        </Link>
      </Button>
    </div>
  );
}
