import {
  EyeFilled,
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { HTMLProps, ReactNode, useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { Button, Spin, App } from 'antd';
import { loadable } from 'jotai/utils';

import kebabCase from 'lodash/kebabCase';
import Link from 'next/link';
import get from 'lodash/get';

import {
  addBookmarksToProjectLibrary,
  deleteBookmarksFromProjectLibrary,
} from '@/features/bookmark/actions';
import { bookmarksForProjectAtomFamily } from '@/state/virtual-lab/bookmark';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { resolveLibraryUrl } from '@/utils/url-builder';
import { serverMessages } from '@/i18n/en/bookmark';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { EntityTypeValue } from '@/api/entitycore/types';
import type { ErrorCause } from '@/api/apiClient';

type Props = {
  virtualLabId: string;
  projectId: string;
  entityId: string;
  resourceId?: string;
  type: EntityTypeValue;
  customButton?: (props: HTMLProps<HTMLButtonElement>) => ReactNode;
};

export default function BookmarkButton({
  virtualLabId,
  projectId,
  entityId,
  resourceId,
  type,
  customButton,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { notification } = App.useApp();

  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);
  const loadingAction = loadingSave || loadingRemove;

  const onSaving = () => setLoadingSave(true);
  const endSaving = () => setLoadingSave(false);

  const entity = getEntityByCoreType({ type });
  const dataType = entity?.legacyType;
  const category = entity?.group;

  const bookmarks = useAtomValue(
    loadable(
      bookmarksForProjectAtomFamily({
        virtualLabId,
        projectId,
        category: dataType,
      })
    )
  );

  const refreshBookmarks = useSetAtom(
    bookmarksForProjectAtomFamily({ virtualLabId, projectId, category: dataType })
  );

  const libraryPage = resolveLibraryUrl({
    ctx: { virtualLabId, projectId },
    category,
    slug: entity?.slug,
  });

  const notifySuccess = useCallback(
    (action: 'add' | 'remove') => {
      if (action === 'add') {
        return notification.open({
          message: (
            <div className="flex items-stretch justify-center">
              <div className="px-4 py-4 text-white select-none">Added to the library</div>
              <div className="w-px bg-white" />
              <Link
                href={libraryPage}
                prefetch={false}
                className={classNames(
                  'bg-secondary-2 flex items-center justify-center gap-1.5 px-4 py-4',
                  'font-normal text-white hover:bg-teal-400/40 hover:text-white'
                )}
              >
                <span>View in Library</span>
                <EyeFilled className="text-white" />
              </Link>
            </div>
          ),
          description: null,
          className: classNames(
            '[&_.ant-notification-notice-message]:!mb-0 [&_.ant-notification-notice-message]:flex',
            '[&_.ant-notification-notice-message]:items-center',
            'bg-secondary-2 !w-max flex items-center !p-0'
          ),
          duration: 5,
          closeIcon: null,
          placement: 'bottom',
          key: `view-bookmark/${virtualLabId}/${projectId}`,
        });
      } else if (action === 'remove') {
        return notification.success({
          message: 'Resource removed from library successfully',
          duration: 3,
          placement: 'topRight',
        });
      }
    },
    [router, libraryPage]
  );

  const notifyError = useCallback((action: 'add' | 'remove', err: Error) => {
    const cause = err.cause as ErrorCause<{
      error_code: string;
      message: string;
    }>;
    if (action === 'add') {
      notification.error({
        message: 'Resource could not be added to the library',
        description: get(serverMessages, get(cause, 'data.error_code'), ''),
        duration: 3,
        placement: 'topRight',
      });
    } else {
      notification.error({
        message: 'Resource could not be removed from the library',
        description: get(serverMessages, get(cause, 'data.error_code'), ''),
        duration: 3,
        placement: 'topRight',
      });
    }
  }, []);

  const saveToLibrary = useCallback(async () => {
    onSaving();
    const { error } = await tryCatch(
      addBookmarksToProjectLibrary({
        virtualLabId,
        projectId,
        bookmark: {
          category: dataType!,
          entity_id: entityId,
          resource_id: resourceId,
        },
      }),
      endSaving,
      {
        feature: 'bookmark-to-project',
        section: pathname,
        extra: {
          virtualLabId,
          projectId,
          resourceId,
          entityId,
          dataType,
        },
      }
    );
    if (error) {
      notifyError('add', error);
      return;
    } else {
      setTimeout(() =>
        dataAtom.remove({
          key: `${projectId}/${category}/${kebabCase(dataType)}/bookmarks`,
          dataType: dataType!,
        })
      );
      refreshBookmarks();
      notifySuccess('add');
    }
  }, [
    virtualLabId,
    projectId,
    entityId,
    refreshBookmarks,
    notifySuccess,
    notifyError,
    category,
    dataType,
  ]);

  const removeFromLibrary = useCallback(async () => {
    setLoadingRemove(true);
    const { error } = await tryCatch(
      deleteBookmarksFromProjectLibrary({
        virtualLabId,
        projectId,
        bookmarks: [{ category: dataType!, entity_id: entityId, resource_id: resourceId }],
      }),
      () => setLoadingRemove(false),
      {
        feature: 'remove-bookmark-from-project',
        section: pathname,
        extra: {
          virtualLabId,
          projectId,
          resourceId,
          entityId,
        },
      }
    );
    if (error) {
      notifyError('remove', error);
      return;
    } else {
      notifySuccess('remove');
      refreshBookmarks();
    }
  }, [virtualLabId, projectId, entityId, resourceId, category, refreshBookmarks, notifyError]);

  const isBookmarked = useMemo(() => {
    return (
      dataType &&
      bookmarks.state === 'hasData' &&
      bookmarks.data.data?.[dataType]?.some((b) => b.entity_id === entityId)
    );
  }, [bookmarks, resourceId, category]);

  if (bookmarks.state === 'loading') {
    return (
      <div className="flex w-32 items-center justify-center">
        <Spin className="px-3 py-2" indicator={<LoadingOutlined />} />
      </div>
    );
  }

  if (bookmarks.state === 'hasError') {
    return (
      <WarningFilled
        title="Bookmark status could not be loaded"
        className="text-warning mx-2 w-max px-2"
      />
    );
  }

  const addButton = customButton ? (
    customButton({ onClick: saveToLibrary, children: 'Add to Library' })
  ) : (
    <Button
      type="text"
      className="text-primary-7 hover:text-primary-6! flex items-center gap-2 hover:bg-transparent!"
      onClick={saveToLibrary}
      loading={loadingAction}
      disabled={loadingAction}
    >
      {loadingSave ? 'Saving...' : 'Save to library'}
      <PlusOutlined className="border-neutral-2 border px-4 py-3" />
    </Button>
  );

  const removeButton = customButton ? (
    customButton({ onClick: removeFromLibrary, children: 'Remove from library' })
  ) : (
    <Button
      type="text"
      className="mr-3 flex h-[36px] items-center gap-2 px-1 text-gray-500 hover:bg-transparent!"
      loading={loadingAction}
      disabled={loadingAction}
      onClick={removeFromLibrary}
    >
      {loadingRemove ? 'Removing...' : 'Remove from library'}
      <MinusCircleOutlined />
    </Button>
  );
  return <>{isBookmarked ? removeButton : addButton}</>;
}
