'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { kebabCase } from 'es-toolkit/compat';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { BrokenImageIcon } from '@/components/icons/image-states';
import { config } from '@/config';
import { startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
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
import type { VirtualLabResponse } from '@/api/virtual-lab-svc/queries/types';
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
}: {
  entity: IEntity;
  group: TQuickAccessGroup;
  groupTitle: string | undefined | null;
  thumbnail: string | undefined | null;
  title: string | undefined;
  description: string | undefined;
  context: WorkspaceContext;
  virtualLab: VirtualLabResponse;
}) {
  const { push: navigate } = useRouter();
  const [loading, setLoading] = useState(false);

  async function getLink({ group, entity }: { entity: IEntity; group: string }) {
    if (group === QuickAccessGroupDict.Data || group === QuickAccessGroupDict.Workflows) {
      navigate(
        `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/${group}/view/${kebabCase(entity.type)}/${entity.id}`
      );
    }
    if (group === QuickAccessGroupDict.Notebooks) {
      setLoading(true);
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
      setLoading(false);
      window.open(notebook.url, '_blank');
    }
  }

  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
        'hover:shadow-bnb hover:border-gray-200 hover:border'
      )}
    >
      <div className="relative h-41.75 w-auto">
        {thumbnail ? (
          <Image fill alt={title ?? 'preview'} src={thumbnail} objectFit="contain" />
        ) : (
          <Skeleton active={false} className="flex items-center justify-center w-full h-full">
            <BrokenImageIcon className="w-20 h-20 text-gray-300" />
          </Skeleton>
        )}
      </div>
      <CardContent className="mt-15">
        <h4 className="text-neutral-400 pl-4">{groupTitle}</h4>
        <Button
          rounded
          variant="ghost"
          onClick={() => getLink({ group, entity })}
          className="font-black text-primary-8 text-lg 2xl:text-xl mb-1.5 hover:bg-background"
          title={title}
        >
          {group === QuickAccessGroupDict.Notebooks && loading && (
            <LoadingOutlined className="text-label!" />
          )}
          {title ?? 'No title provided'}
        </Button>
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
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
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
}: {
  entity: IEntity;
  group: string;
  thumbnail: string | undefined | null;
  title: string | undefined;
  context: WorkspaceContext;
  virtualLab: VirtualLabResponse | null;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const { push: navigate } = useRouter();
  async function getLink({ group, entity }: { entity: IEntity; group: string }) {
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
  }

  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1 p-2 gap-3',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] w-full',
        'hover:shadow-bnb hover:border-gray-200 hover:border'
      )}
    >
      <Button
        variant="ghost"
        size="responsive"
        onClick={() => getLink({ group, entity })}
        className={cn(
          'font-black rounded-md py-2! h-auto! text-primary-8 min-w-0 ',
          'max-w-full w-fit hover:bg-background text-left justify-start'
        )}
        title={title}
      >
        <span className="line-clamp-2 whitespace-normal">{title ?? 'No title provided'}</span>
      </Button>
      <CardContent className="relative h-41.75 w-auto px-0 mt-auto">
        {thumbnail ? (
          <Image fill alt={title ?? 'preview'} src={thumbnail} objectFit="contain" />
        ) : (
          <Skeleton
            active={false}
            className="flex items-center justify-center w-full h-full bg-background"
            title="No image available"
          >
            <BrokenImageIcon className="size-10 text-gray-200" />
          </Skeleton>
        )}
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
