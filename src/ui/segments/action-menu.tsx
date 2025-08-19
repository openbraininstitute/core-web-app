'use client';

import { useState } from 'react';
import {
  BookOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import Action from '../molecules/side-menu-action';

import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

import { bookmarkToProjectLibrary } from '@/api/virtual-lab-svc/queries/bookmark';
import { BookmarkCategory } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';

export default function ActionMenu<T extends EntityCoreIdentifiable>({
  entity,
  bookmarkCategory,
  ctx,
}: {
  entity: T;
  bookmarkCategory?: BookmarkCategory;
  ctx: { virtualLabId: string; projectId: string };
}) {
  const [copied, setCopied] = useState(false);
  const notification = useAppNotification();

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
      <Action icon={<ExperimentOutlined />}>Simulate</Action>
      {bookmarkCategory && (
        <Action
          icon={
            <BookOutlined
              onClick={async () => {
                try {
                  await bookmarkToProjectLibrary(ctx, {
                    entity_id: entity.id,
                    category: bookmarkCategory,
                  });
                  notification.success({ message: 'Entity successfully bookmarked' });
                } catch {
                  notification.error({ message: "Couldn't add entity to bookmarks" });
                }
              }}
            />
          }
        >
          Bookmark
        </Action>
      )}
      <Action icon={<DownloadOutlined />}>Download</Action>
    </div>
  );
}
