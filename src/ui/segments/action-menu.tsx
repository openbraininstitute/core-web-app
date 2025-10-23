'use client';

import { CopyOutlined, DownloadOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { useAtom } from 'jotai';

import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { downloadArchive } from '@/services/entity-download';
import Action from '@/ui/molecules/side-menu-action';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { ROOT_ROUTE } from '@/config';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export default function ActionMenu({
  entity,
  ctx,
  type,
}: {
  entity: EntityTypeValue;
  ctx: { virtualLabId: string; projectId: string };
  type: EntityCoreExtendedType;
}) {
  const [copied, setCopied] = useState(false);
  const [, setCircuit] = useAtom(downloadPanelCircuitAtom);

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  // const bookmarks = useQuery({
  //   queryKey: keyBuilder.bookmarks({
  //     virtualLabId: ctx.virtualLabId,
  //     projectId: ctx.projectId,
  //     category: entityType.extendedType,
  //   }),
  //   queryFn: async () => getAllBookmarksByCategory(ctx, { category: entityType.type }),
  // });

  // const existingBookmarks = bookmarks.data?.data?.[entityType.type]?.map((b) => b.entity_id);
  // const isBookmarked = !!existingBookmarks && existingBookmarks.includes(entity.id);

  // const mutation = useMutation({
  //   mutationFn: () =>
  //     bookmarkToProjectLibrary(ctx, {
  //       entity_id: entity.id,
  //       category: entityType.type,
  //     }),
  //   onSuccess: async () => {
  //     await queryClient.invalidateQueries({
  //       queryKey: keyBuilder.bookmarks({
  //         virtualLabId: ctx.virtualLabId,
  //         projectId: ctx.projectId,
  //         category: entityType.extendedType,
  //       }),
  //     });
  //     notification.success({ message: 'Entity successfully bookmarked' });
  //   },
  //   onError: () => {
  //     notification.error({ message: "Couldn't add entity to bookmarks" });
  //   },
  // });

  // const handleBookmark = () => {
  //   mutation.mutate();
  // };

  // const removeBookmarkMutation = useMutation({
  //   mutationFn: () =>
  //     deleteBookmarksFromProjectLibrary({
  //       virtualLabId: ctx.virtualLabId,
  //       projectId: ctx.projectId,
  //       bookmarks: [
  //         {
  //           entity_id: entity.id,
  //           category: entityType.type,
  //         },
  //       ],
  //     }),
  //   onSuccess: async () => {
  //     await queryClient.invalidateQueries({
  //       queryKey: keyBuilder.bookmarks({
  //         virtualLabId: ctx.virtualLabId,
  //         projectId: ctx.projectId,
  //         category: entityType.extendedType,
  //       }),
  //     });
  //     notification.success({ message: 'Bookmark removed from library' });
  //   },
  //   onError: () => {
  //     notification.error({ message: "Couldn't remove bookmark" });
  //   },
  // });

  // const handleRemoveBookmark = () => {
  //   removeBookmarkMutation.mutate();
  // };

  // const loading = mutation.isPending || removeBookmarkMutation.isPending;

  // const getBookmarkHandler = () => {
  //   if (loading) return undefined;
  //   if (!isBookmarked) return handleBookmark;
  //   return handleRemoveBookmark;
  // };

  const isSimulatable =
    typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale);

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 px-5 text-lg font-bold">
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
              href={{
                pathname: `${ROOT_ROUTE}/${ctx.virtualLabId}/${ctx.projectId}/workflows/simulate/configure/${entityType.type.replaceAll('_', '-')}/${entity.id}`,
                query: {
                  sessionId: crypto.randomUUID(),
                  [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
                },
              }}
            >
              <ExperimentOutlined />
            </NextLink>
          }
        >
          Simulate
        </Action>
      )}

      {/* {entityType.isBookmarkable && bookmarks.data && (
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
      )} */}

      {entityType.isDownloadable && (
        <Action
          icon={
            <DownloadOutlined
              onClick={() => {
                if (entity.type === 'circuit') setCircuit(entity as ICircuit);
                else {
                  downloadArchive(entityType.type, [entity.id], ctx);
                }
              }}
            />
          }
        >
          Download
        </Action>
      )}
    </div>
  );
}
