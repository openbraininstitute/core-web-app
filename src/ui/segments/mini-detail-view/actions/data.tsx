import { CheckCircleFilled, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { includes, kebabCase } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DownloadIcon } from '@/components/icons/buttons';
import { config } from '@/config';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export function DataActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
}) {
  const queryParams = useSearchParams();
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
        [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.MEModelWithSynapses],
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
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
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
                <CheckCircleFilled className="text-accent-light" />
              </motion.div>
            ) : (
              <div key="copy">
                <CopyOutlined />
              </div>
            )}
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
          <span>Copy ID</span>
        </TooltipContent>
      </Tooltip>
      {/* <Tooltip>
        <TooltipTrigger>
          <Button
            rounded
            title="Save to bookmark"
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
            onClick={onBookmark}
          >
            {pendingSave ? <LoadingOutlined spin className="text-primary-3" /> : <BookmarkIcon />}
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
          <span>Save to bookmark</span>
        </TooltipContent>
      </Tooltip> */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            rounded
            title="download"
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
            onClick={onDownload}
          >
            {pendingDownload ? (
              <LoadingOutlined spin className="text-primary-3" />
            ) : (
              <DownloadIcon />
            )}
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
          <span>Download</span>
        </TooltipContent>
      </Tooltip>

      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={{
            pathname: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(dataType)}/${record.id}`,
            query: queryParams.toString(),
          }}
        >
          View details
        </Link>
      </Button>
    </div>
  );
}
