'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { useMutation } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import { useSetAtom } from 'jotai';
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
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
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
        'w-full bg-white border-none flex-1 pt-0',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:bg-gray-100/70 hover:border group',
        'cursor-pointer select-none'
      )}
      onClick={() => redirect()}
      title={title}
    >
      {artifactTitle && (
        <div className="flex justify-end px-3 pt-3">
          <Badge
            variant="outline"
            rounded
            className={cn(
              'bg-white/90 backdrop-blur-sm py-1.5 px-5! text-primary-8 border-neutral-2 text-xs font-medium shadow-sm',
              'group-hover:bg-primary-7 group-hover:text-white'
            )}
          >
            {artifactTitle}
          </Badge>
        </div>
      )}
      <div className="relative aspect-video w-full">
        {thumbnail ? (
          <Image fill alt={title ?? 'preview'} src={thumbnail} className="object-contain" />
        ) : (
          <Skeleton
            active={false}
            className="flex items-center justify-center w-full h-full bg-background rounded-none"
          >
            <ImageIcon className="w-20 h-20 text-gray-300" />
          </Skeleton>
        )}
      </div>
      <CardContent className="mt-8">
        <h4 className="text-neutral-400 pl-4">{groupTitle}</h4>
        <div
          className={cn(
            'font-black rounded-full text-primary-8 text-lg 2xl:text-xl mb-1.5',
            'px-4 py-1.5 max-w-max group-hover:text-primary-7 flex items-center justify-center gap-1.5'
          )}
        >
          {group === QuickAccessGroupDict.Notebooks && isPending && (
            <LoadingOutlined className="text-label!" />
          )}
          {title ?? 'No title provided'}
        </div>
        <p className="text-neutral-4 line-clamp-2 pl-4" title={description}>
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
  const { mutate: redirect, isPending } = useMutation({
    mutationFn: async () => {
      if (group === QuickAccessGroupDict.Data && compact) {
        setDataPreview({
          kind: 'data',
          entityId: entity.id,
          extendedType,
          title: title ?? entity.name ?? 'Untitled',
          thumbnail,
        });
        return;
      }
      if (group === QuickAccessGroupDict.Notebooks && compact) {
        const asset = (entity as INotebook).assets.find(
          (n) => n.label === AssetLabel.jupyter_notebook
        );
        setDataPreview({
          kind: 'notebook',
          entityId: entity.id,
          extendedType,
          title: title ?? entity.name ?? 'Untitled',
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
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:bg-gray-100/70 hover:border group',
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
              'bg-white/90 backdrop-blur-sm py-1.5 px-5! text-primary-8 border-neutral-2 text-xs font-medium shadow-sm shrink-0 mt-1',
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
              'absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm py-1 px-3! text-primary-8 border-neutral-2 text-xs font-medium shadow-sm',
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
              'bg-white/90 backdrop-blur-sm shadow-sm',
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
  groupTitle: string;
  listLength: number;
  context: WorkspaceContext;
  group: TQuickAccessGroup;
}) {
  return (
    <Button
      rounded
      size="responsive"
      variant="outline"
      className="w-full bg-background shadow-none hover:font-bold hover:bg-white hover:shadow-md"
    >
      <Link
        className="text-primary-8 hover:text-primary-9"
        href={`${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/quick-access/${group}`}
      >
        View {groupTitle} examples ({listLength}){' '}
      </Link>
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
