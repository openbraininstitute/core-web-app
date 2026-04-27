'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { useMutation } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import { useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ImageIcon } from '@/components/icons/image-states';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent, CardTitle } from '@/ui/molecules/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { Skeleton } from '@/ui/molecules/skeleton';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import {
  QuickAccessGroupDict,
  type TQuickAccessGroup,
} from '@/ui/segments/project/get-started/query';
import { cn } from '@/utils/css-class';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TVirtualLabResponse } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

const IMAGE_SHINE_ANIMATION = {
  x: ['-160%', '220%', '-160%'],
};

const IMAGE_SHINE_TRANSITION = {
  duration: 6,
  repeat: Infinity,
  ease: 'easeInOut' as const,
};

export function MainCardItem({
  thumbnail,
  title,
  groupTitle,
  description,
  context: { virtualLabId, projectId },
  virtualLab,
  group,
  entity,
  artifactTitle,
}: {
  entity: IEntity;
  group: TQuickAccessGroup;
  groupTitle: string | undefined | null;
  thumbnail: string | undefined | null;
  title: string | undefined;
  description: string | undefined;
  context: WorkspaceContext;
  virtualLab: TVirtualLabResponse;
  artifactTitle?: string | null;
}) {
  const { push: navigate } = useRouter();

  const { mutate: redirect, isPending } = useMutation({
    mutationFn: async () => {
      if (group === QuickAccessGroupDict.Data || group === QuickAccessGroupDict.Workflows) {
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${group}/view/${kebabCase(entity.type)}/${entity.id}`
        );
      }
      if (group === QuickAccessGroupDict.Notebooks) {
        const asset = (entity as INotebook).assets.find(
          (n) => n.label === AssetLabel.jupyter_notebook
        );
        if (!asset) return null;
        const notebook = await startNotebook(
          entity.id,
          asset.path,
          virtualLabId,
          projectId,
          virtualLab.data?.virtual_lab.compute_cell ?? 'aws',
          0
        );
        window.open(notebook.url, '_blank');
      }
    },
  });

  return (
    <Card
      className={cn(
        'w-full min-h-[320px] bg-white border-none pt-0 relative overflow-hidden',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:bg-gray-100/70 hover:border group',
        'cursor-pointer select-none'
      )}
      onClick={() => redirect()}
      title={title}
    >
      <div className="absolute top-0 left-0 z-0 h-[200px] w-full p-3">
        <div className="relative h-full w-full overflow-hidden rounded-md shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]">
          {thumbnail ? (
            <>
              <motion.div className="absolute inset-0">
                <Image
                  fill
                  alt={title ?? 'preview'}
                  src={thumbnail}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
              </motion.div>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -inset-y-1/2 left-0 z-10 w-2/5 rotate-4 blur-3xl"
                style={{
                  background:
                    'linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0))',
                }}
                animate={IMAGE_SHINE_ANIMATION}
                transition={IMAGE_SHINE_TRANSITION}
              />
            </>
          ) : (
            <Skeleton
              active={false}
              className="flex items-center justify-center w-full h-full bg-background rounded-md"
            >
              <ImageIcon className="w-20 h-20 text-gray-300" />
            </Skeleton>
          )}
        </div>
      </div>
      {artifactTitle && (
        <div className="relative z-10 flex justify-end px-3 pt-3 -translate-x-3 translate-y-3">
          <Badge
            variant="outline"
            rounded
            className={cn(
              'bg-white/90 backdrop-blur-sm py-1.5 px-5! text-primary-8 border-neutral-2 text-sm 2xl:text-base font-medium shadow-sm',
              'group-hover:bg-primary-7 group-hover:text-white'
            )}
          >
            {artifactTitle}
          </Badge>
        </div>
      )}
      <CardContent className="relative z-10 mt-[170px]">
        <h4 className="text-neutral-500 uppercase text-xs tracking-[0.6px] line-clamp-1">
          {groupTitle}
        </h4>
        <div
          className={cn(
            'font-bold rounded-full text-primary-8 text-xl leading-tight mb-1',
            'max-w-max group-hover:text-primary-7 flex items-center justify-center gap-1.5'
          )}
        >
          {group === QuickAccessGroupDict.Notebooks && isPending && (
            <LoadingOutlined className="text-label!" />
          )}
          {title ?? 'No title provided'}
        </div>
        <p className="text-neutral-4 text-sm line-clamp-2" title={description}>
          {description ?? 'No description provided'}
        </p>
      </CardContent>
    </Card>
  );
}

export function MainCardComingSoon({
  groupTitle,
  description,
}: {
  groupTitle: string;
  description: string;
}) {
  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] select-none pointer-events-none',
        'hover:shadow-bnb hover:border-gray-200 hover:border'
      )}
    >
      <CardTitle className="">
        <h4 className="text-label pl-4">{groupTitle}</h4>
        <p className="text-label pl-4 text-xl">{description}</p>
      </CardTitle>
    </Card>
  );
}

export function SingleCardItem({
  thumbnail,
  title,
  context: { virtualLabId, projectId },
  virtualLab,
  group,
  entity,
  extendedType,
  artifactTitle,
  description,
  compact = false,
  hideArtifact = false,
  isSelected = false,
}: {
  entity: IEntity;
  group: string;
  thumbnail: string | undefined | null;
  title: string | undefined;
  context: WorkspaceContext;
  virtualLab: TVirtualLabResponse | null;
  extendedType: TExtendedEntitiesTypeDict;
  artifactTitle?: string | null;
  description: string;
  compact?: boolean;
  hideArtifact?: boolean;
  isSelected?: boolean;
}) {
  const { push: navigate } = useRouter();
  const setDataPreview = useSetAtom(dataPreviewAtom);
  const setLeftPaneView = useSetAtom(leftPaneViewAtom);
  const notification = useAppNotification();
  const { mutate: redirect, isPending } = useMutation({
    mutationFn: async () => {
      if (group === QuickAccessGroupDict.Workflows && compact) {
        notification.info({
          message: 'Example workflows coming soon',
          key: 'workflows-coming-soon',
          placement: 'topRight',
        });
        return;
      }
      if (group === QuickAccessGroupDict.Data && compact) {
        setLeftPaneView(null);
        setDataPreview({
          kind: 'data',
          entityId: entity.id,
          extendedType,
          title: title ?? (entity as { name?: string }).name ?? 'Untitled',
          thumbnail,
        });
        return;
      }
      if (group === QuickAccessGroupDict.Notebooks && compact) {
        const asset = (entity as INotebook).assets.find(
          (n) => n.label === AssetLabel.jupyter_notebook
        );
        setLeftPaneView(null);
        setDataPreview({
          kind: 'notebook',
          entityId: entity.id,
          extendedType,
          title: title ?? (entity as { name?: string }).name ?? 'Untitled',
          thumbnail,
          assetPath: asset?.path,
          computeCell: virtualLab?.data?.virtual_lab.compute_cell ?? 'aws',
        });
        return;
      }
      if (group === QuickAccessGroupDict.Data || group === QuickAccessGroupDict.Workflows) {
        navigate(
          `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${group}/view/${kebabCase(extendedType)}/${entity.id}`
        );
      }
      if (group === QuickAccessGroupDict.Notebooks) {
        const asset = (entity as INotebook).assets.find(
          (n) => n.label === AssetLabel.jupyter_notebook
        );
        if (!asset) return null;
        const notebook = await startNotebook(
          entity.id,
          asset.path,
          virtualLabId,
          projectId,
          virtualLab?.data?.virtual_lab.compute_cell ?? 'aws',
          0
        );

        window.open(notebook.url, '_blank');
      }
    },
  });

  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1',
        !compact && 'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] hover:shadow-bnb',
        'hover:bg-gray-100/70 hover:border group',
        'cursor-pointer select-none',
        compact ? 'py-0 gap-0' : 'pt-0 gap-2.5'
      )}
      onClick={() => redirect()}
      title={title}
    >
      {artifactTitle && !hideArtifact && !compact && (
        <CardTitle className="self-end p-2 pt-1">
          <Badge
            variant="outline"
            rounded
            className={cn(
              'bg-white/90 backdrop-blur-sm py-1.5 px-5! text-primary-8 border-neutral-2 text-xl font-medium shadow-sm shrink-0 mt-1',
              'group-hover:bg-primary-7 group-hover:text-white'
            )}
          >
            {artifactTitle}
          </Badge>
        </CardTitle>
      )}
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-xl border-2 transition-colors bg-white',
          isSelected ? 'border-primary-7' : 'border-transparent'
        )}
      >
        {thumbnail ? (
          <Image
            fill
            unoptimized
            alt={title ?? 'preview'}
            src={thumbnail}
            className="object-contain"
          />
        ) : (
          <Skeleton
            active={false}
            className="flex items-center justify-center w-full h-full bg-background rounded-none"
            title="No image available"
          >
            <ImageIcon className="size-10 text-gray-200" />
          </Skeleton>
        )}
        {artifactTitle && !hideArtifact && compact && (
          <Badge
            variant="outline"
            rounded
            className={cn(
              'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm py-1 px-3! text-primary-8 border-neutral-2 text-xs font-medium',
              'group-hover:bg-primary-7 group-hover:text-white'
            )}
          >
            {artifactTitle}
          </Badge>
        )}
        {compact && (
          <div
            className={cn(
              'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded-full px-3 py-1',
              'bg-white/90 backdrop-blur-sm',
              'text-primary-8 text-xs font-bold',
              'group-hover:bg-primary-8 group-hover:text-white flex items-center gap-1.5'
            )}
            title={title}
          >
            {group === QuickAccessGroupDict.Notebooks && isPending && (
              <LoadingOutlined className="text-primary-8!" />
            )}
            <span className="line-clamp-1">{title ?? 'No title provided'}</span>
          </div>
        )}
      </div>
      {!compact && (
        <CardContent className="mt-8 flex flex-col">
          <div
            className={cn(
              'font-black rounded-full text-primary-8 mb-1.5',
              'max-w-max group-hover:text-primary-7 flex items-center justify-center gap-1.5',
              'px-4 py-1.5 text-lg 2xl:text-xl'
            )}
            title={title}
          >
            {group === QuickAccessGroupDict.Notebooks && isPending && (
              <LoadingOutlined className="text-label!" />
            )}
            <span className="whitespace-normal break-all line-clamp-5">
              {title ?? 'No title provided'}
            </span>
          </div>
          <p className="text-neutral-4 line-clamp-4 pl-4" title={description}>
            {description ?? 'No description provided'}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function ViewExamples({
  groupTitle,
  listLength,
  context,
  group,
}: {
  groupTitle: string | null | undefined;
  listLength: number;
  context: WorkspaceContext;
  group: TQuickAccessGroup;
}) {
  const safeGroupTitle = (groupTitle ?? group).trim();
  const normalizedGroupTitle = safeGroupTitle.toLowerCase();
  const { push: navigate } = useRouter();
  const isWorkflowGroup =
    group === QuickAccessGroupDict.Workflows || normalizedGroupTitle.includes('workflow');
  const href = isWorkflowGroup
    ? `${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/workflows`
    : `${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/quick-access/${group}`;
  const label = isWorkflowGroup
    ? 'View all Workflows'
    : `View ${safeGroupTitle} examples (${listLength})`;

  return (
    <Button
      rounded
      size="responsive"
      variant="outline"
      className="w-fit mx-auto px-4 py-4 bg-background shadow-none hover:font-bold hover:bg-white hover:shadow-md text-primary-8 hover:text-primary-9 text-base!"
      onClick={() => navigate(href)}
    >
      <span suppressHydrationWarning>{label}</span>
    </Button>
  );
}

export function GroupDropdown() {
  const { group } = useParams<{ group: TQuickAccessGroup }>();
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const onValueChange = (group: TQuickAccessGroup) => {
    navigate(`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/quick-access/${group}`);
  };

  return (
    <Select value={group} onValueChange={(v) => onValueChange(v as TQuickAccessGroup)}>
      <SelectTrigger
        size="sm"
        icoClassName="text-primary-8! opacity-100 size-4.5!"
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'w-70 max-w-max gap-5  rounded-full border-none text-lg text-primary-8 justify-start',
          "[&>span[data-slot='select-value']]:text-primary-8 [&>span[data-slot='select-value']]:font-medium"
        )}
      >
        <SelectValue
          className="text-primary-8"
          placeholder={<span className="text-base font-light!">Select</span>}
        />
      </SelectTrigger>
      <SelectContent
        className="rounded-lg border-gray-200 bg-white shadow-md"
        side="bottom"
        sideOffset={10}
      >
        {Object.entries(QuickAccessGroupDict).map(([k, v]) => {
          return (
            <SelectItem
              key={`group-${v}`}
              value={v}
              className={cn(
                'text-primary-9 text-lg font-bold',
                'data-highlighted:text-primary-7! cursor-pointer'
              )}
            >
              {k}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
