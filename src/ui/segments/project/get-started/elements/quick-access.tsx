'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { useMutation } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { ImageIcon } from '@/components/icons/image-states';
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
import {
  QuickAccessGroupDict,
  type TQuickAccessGroup,
} from '@/ui/segments/project/get-started/query';
import { cn } from '@/utils/css-class';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  IVirtualLabExpandedResponse,
  TVirtualLabResponse,
} from '@/api/virtual-lab-svc/queries/types';
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
  virtualLab: IVirtualLabExpandedResponse;
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
          virtualLab.compute_cell ?? 'aws',
          0
        );
        window.open(notebook.url, '_blank');
      }
    },
  });

  return (
    <Card
      className={cn(
        'w-full min-h-80 bg-white border-none pt-0 relative overflow-hidden',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:bg-gray-100/70 hover:border group',
        'cursor-pointer select-none'
      )}
      onClick={() => redirect()}
      title={title}
    >
      <div className="absolute top-0 left-0 z-0 h-50 w-full p-3">
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
  group,
  context: { virtualLabId, projectId },
}: {
  groupTitle: string;
  description: string;
  group?: TQuickAccessGroup;
  context: WorkspaceContext;
}) {
  if (group === QuickAccessGroupDict.Workflows) {
    return (
      <Card
        className={cn(
          'w-full min-h-[320px] bg-white border-none p-3',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] select-none'
        )}
      >
        <CardTitle className="mb-3">
          <h4 className="text-neutral-500 uppercase text-xs tracking-[0.6px]">Workflow</h4>
          <p className="text-primary-8 text-xl font-semibold leading-tight">
            Workflow examples coming soon
          </p>
        </CardTitle>
        <div className="relative h-[200px] w-full overflow-hidden rounded-md shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]">
          <Image
            fill
            alt="Workflow examples coming soon"
            src="/images/home/workflow_coming-soon-image.webp"
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        </div>
        <div className="mt-3">
          <Button
            asChild
            rounded
            variant="outline"
            className="w-full bg-background shadow-none hover:bg-white hover:shadow-md"
          >
            <Link
              href={`/app/virtual-lab/${virtualLabId}/${projectId}/workflows/simulate/new/small-microcircuit-simulation`}
              className="text-primary-8 hover:text-primary-9 text-base!"
            >
              New small circuit simulation
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'w-full h-[340px] bg-white border-none',
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
}) {
  const { push: navigate } = useRouter();
  const { mutate: redirect, isPending } = useMutation({
    mutationFn: async () => {
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
        'w-full h-[340px] bg-white border-none pt-0 relative overflow-hidden',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:bg-gray-100/70 hover:border group',
        'cursor-pointer select-none'
      )}
      onClick={() => redirect()}
      title={title}
    >
      <div className="absolute top-0 left-0 z-0 h-[170px] w-full p-3">
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
                className="pointer-events-none absolute -inset-y-1/2 left-0 z-10 w-2/5 rotate-40"
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
              title="No image available"
            >
              <ImageIcon className="size-10 text-gray-200" />
            </Skeleton>
          )}
        </div>
      </div>
      {artifactTitle && (
        <CardTitle className="relative z-10 self-end p-2 pt-1 -translate-x-3 translate-y-3">
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
      <CardContent className="relative z-10 pb-2.5 flex flex-col mt-[130px]">
        <div
          className={cn(
            'font-black rounded-full text-primary-8 text-sm 2xl:text-base mb-0.5',
            'px-4 py-0.5 max-w-max group-hover:text-primary-7 flex items-center justify-center gap-1'
          )}
          title={title}
        >
          {group === QuickAccessGroupDict.Notebooks && isPending && (
            <LoadingOutlined className="text-label!" />
          )}
          <span className="line-clamp-2 whitespace-normal break-all text-xl">
            {title ?? 'No title provided'}
          </span>
        </div>
        <p className="text-neutral-4 text-sm line-clamp-1 pl-4" title={description}>
          {description ?? 'No description provided'}
        </p>
      </CardContent>
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
