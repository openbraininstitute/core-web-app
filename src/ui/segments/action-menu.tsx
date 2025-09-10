'use client';

import { useState } from 'react';
import { notFound, redirect } from 'next/navigation';

import NextLink from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import Action from '../molecules/side-menu-action';

import {
  bookmarkToProjectLibrary,
  getAllBookmarksByCategory,
} from '@/api/virtual-lab-svc/queries/bookmark';
import { useAppNotification } from '@/components/notification';
import { deleteBookmarksFromProjectLibrary } from '@/features/bookmark/actions';
import { downloadArchive } from '@/services/entity-download';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { basePath } from '@/config';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';

export default function ActionMenu({
  entity,
  ctx,
  type,
}: {
  entity: EntityTypeValue;
  ctx: { virtualLabId: string; projectId: string };
  type: EntityCoreExtendedType;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const notification = useAppNotification();

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const bookmarks = useQuery({
    queryKey: keyBuilder.bookmarks({
      virtualLabId: ctx.virtualLabId,
      projectId: ctx.projectId,
      category: entityType.extendedType,
    }),
    queryFn: async () => getAllBookmarksByCategory(ctx, { category: entityType.type }),
  });

  const existingBookmarks = bookmarks.data?.data?.[entityType.type]?.map((b) => b.entity_id);
  const isBookmarked = !!existingBookmarks && existingBookmarks.includes(entity.id);

  const mutation = useMutation({
    mutationFn: () =>
      bookmarkToProjectLibrary(ctx, {
        entity_id: entity.id,
        category: entityType.type,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.bookmarks({
          virtualLabId: ctx.virtualLabId,
          projectId: ctx.projectId,
          category: entityType.extendedType,
        }),
      });
      notification.success({ message: 'Entity successfully bookmarked' });
    },
    onError: () => {
      notification.error({ message: "Couldn't add entity to bookmarks" });
    },
  });

  const handleBookmark = () => {
    mutation.mutate();
  };

  const removeBookmarkMutation = useMutation({
    mutationFn: () =>
      deleteBookmarksFromProjectLibrary({
        virtualLabId: ctx.virtualLabId,
        projectId: ctx.projectId,
        bookmarks: [
          {
            entity_id: entity.id,
            category: entityType.type,
          },
        ],
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.bookmarks({
          virtualLabId: ctx.virtualLabId,
          projectId: ctx.projectId,
          category: entityType.extendedType,
        }),
      });
      notification.success({ message: 'Bookmark removed from library' });
    },
    onError: () => {
      notification.error({ message: "Couldn't remove bookmark" });
    },
  });

  const handleRemoveBookmark = () => {
    removeBookmarkMutation.mutate();
  };

  const loading = mutation.isPending || removeBookmarkMutation.isPending;

  const getBookmarkHandler = () => {
    if (loading) return undefined;
    if (!isBookmarked) return handleBookmark;
    return handleRemoveBookmark;
  };

  const isSimulatable =
    typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale);

  const clone = useMutation({
    mutationFn: async (entityConfig: ReturnType<typeof getEntityByExtendedType>) => {
      if (!entityConfig) return;
      if (entityConfig.api.query.create && entityConfig.extendedType === 'memodel') {
        const entityCopy = entity as IMEModel;

        const res = await entityConfig.api.query.create({
          body: {
            ...entity,
            brain_region_id: entityCopy.brain_region.id,
            species_id: entityCopy.species.id,
            morphology_id: entityCopy.morphology.id,
            emodel_id: entityCopy.emodel.id,
          },
          context: ctx,
        });
        return res;
      }
    },
    onSuccess: (data?: EntityTypeValue) => {
      if (!data) return;
      notification.success({ message: 'Model cloned successfully' });
      redirect(
        `${basePath}/app/v2/${ctx.virtualLabId}/${ctx.projectId}/data/view/${entityType.type.replaceAll('_', '-')}/${data.id}`
      );
    },
    onError: (e) => {
      if (e.message === 'NEXT_REDIRECT') return;

      notification.error({ message: "Couldn't clone the model" });
    },
  });

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 pr-20 pl-10 text-lg font-bold">
      <Action
        icon={
          !copied ? (
            <CopyOutlined
              onClick={() => {
                if (copied) return;
                setCopied(true);
                navigator.clipboard.writeText(entity.id);
                window.setTimeout(() => setCopied(false), 5000);
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">
              <title>check</title>
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" fill="#3e0" />
            </svg>
          )
        }
      >
        {copied ? 'Copied' : 'Copy ID'}
      </Action>
      {isSimulatable && (
        <Action
          icon={
            <NextLink
              href={`${basePath}/app/v2/${ctx.virtualLabId}/${ctx.projectId}/workflows/simulate/configure/${entityType.type.replaceAll('_', '-')}/${entity.id}`}
            >
              <ExperimentOutlined />
            </NextLink>
          }
        >
          Simulate
        </Action>
      )}

      {entityType.isClonable && (
        <Action icon={<CopyOutlined onClick={() => clone.mutateAsync(entityType)} />}>Clone</Action>
      )}

      {entityType.isBookmarkable && bookmarks.data && (
        <Action
          icon={
            <>
              {!loading && <BookOutlined onClick={getBookmarkHandler()} />}
              {loading && <LoadingOutlined />}
            </>
          }
        >
          <>{!isBookmarked ? 'Bookmark' : 'Remove from bookmarks'}</>
        </Action>
      )}

      <Action
        icon={<DownloadOutlined onClick={() => downloadArchive(entityType.type, [entity.id])} />}
      >
        Download
      </Action>
    </div>
  );
}
