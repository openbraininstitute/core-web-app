import {
  CloseOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { HTMLProps, ReactNode, useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from 'antd';
import { loadable } from 'jotai/utils';

import Link from 'next/link';
import get from 'es-toolkit/compat/get';

import { BaselineBookmarkAdd, BookmarkMinus } from '@/components/icons/EditorIcons';
import {
  addBookmarksToProjectLibrary,
  deleteBookmarksFromProjectLibrary,
} from '@/features/bookmark/actions';
import { useAppNotification } from '@/components/notification';
import { bookmarksForProjectAtomFamily } from '@/state/virtual-lab/bookmark';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { ToolbarButton } from '@/components/buttons/toolbar';
import { resolveLibraryUrl } from '@/utils/url-builder';
import { serverMessages } from '@/i18n/en/bookmark';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { ErrorCause } from '@/api/apiClient';

type Props = {
  virtualLabId: string;
  projectId: string;
  entityId: string;
  resourceId?: string;
  type: TEntityTypeDict;
  customButton?: (
    props: HTMLProps<HTMLButtonElement> & { loading?: boolean; operation?: 'save' | 'remove' }
  ) => ReactNode;
};

export default function BookmarkButton({
  virtualLabId,
  projectId,
  entityId,
  resourceId,
  type,
  customButton,
}: Props) {
  const pathname = usePathname();
  const notification = useAppNotification();
  const [opStatus, setOpStatus] = useState<{
    op: 'add' | 'remove' | 'none';
    status: 'none' | 'succeeded' | 'failed';
  }>({ op: 'none', status: 'none' });
  const [opRunning, setOpRunning] = useState<{ id?: string; op: 'add' | 'remove' | 'none' }>({
    id: undefined,
    op: 'none',
  });
  const onOpRunning = (id: string, op: 'add' | 'remove') => setOpRunning({ id, op });
  const resetOp = () => setOpRunning({ id: undefined, op: 'none' });
  const isSaving = opRunning.op === 'add' && !!opRunning.id;
  const isRemoving = opRunning.op === 'remove' && !!opRunning.id;
  const isSaved = opStatus.op === 'add' && opStatus.status === 'succeeded';

  const entity = getEntityByCoreType({ type });
  const dataType = entity?.extendedType;
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
        notification.info({
          key: 'bookmark-success',
          icon: <></>,
          className: classNames('bookmark-success', '[&_.ant-notification-notice-message]:m-0!'),
          closeIcon: <CloseOutlined className="text-white" />,
          message: (
            <div className="flex flex-col items-center justify-center gap-4 text-white">
              <div className="self-start text-white">
                This entity has been added to library successfully
              </div>
              <Link
                href={libraryPage}
                className="hover:text-primary-8 w-max rounded-none border border-white px-3 py-2 text-center hover:bg-white"
              >
                See in library
              </Link>
            </div>
          ),
        });
        return;
      }
      if (action === 'remove') {
        return notification.success({
          message: 'Entity removed from library successfully',
          duration: 3,
          placement: 'topRight',
        });
      }
    },
    [notification, libraryPage, virtualLabId, projectId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const notifyError = useCallback(
    (action: 'add' | 'remove', err: Error) => {
      const cause = err.cause as ErrorCause<{
        error_code: string;
        message: string;
      }>;
      if (action === 'add') {
        notification.error({
          message: 'Entity could not be added to the library',
          description: get(serverMessages, get(cause, 'data.error_code'), ''),
          duration: 3,
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: 'Entity could not be removed from the library',
          description: get(serverMessages, get(cause, 'data.error_code'), ''),
          duration: 3,
          placement: 'topRight',
        });
      }
    },
    [notification]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const saveToLibrary = useCallback(async () => {
    onOpRunning(entityId, 'add');
    const { error } = await tryCatch(
      addBookmarksToProjectLibrary({
        virtualLabId,
        projectId,
        bookmark: {
          category: dataType!,
          entity_id: entityId,
        },
      }),
      resetOp,
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
      setOpStatus({ op: 'add', status: 'failed' });
    } else {
      setOpStatus({ op: 'add', status: 'succeeded' });
      notifySuccess('add');
      refreshBookmarks();
    }
  }, [
    virtualLabId,
    projectId,
    dataType,
    entityId,
    resourceId,
    pathname,
    notifyError,
    refreshBookmarks,
    notifySuccess,
  ]);

  const removeFromLibrary = useCallback(async () => {
    onOpRunning(entityId, 'remove');
    const { error } = await tryCatch(
      deleteBookmarksFromProjectLibrary({
        virtualLabId,
        projectId,
        bookmarks: [{ category: dataType!, entity_id: entityId }],
      }),
      resetOp,
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
      setOpStatus({ op: 'remove', status: 'failed' });
    } else {
      setOpStatus({ op: 'remove', status: 'succeeded' });
      notifySuccess('remove');
      refreshBookmarks();
    }
  }, [
    virtualLabId,
    projectId,
    dataType,
    entityId,
    resourceId,
    pathname,
    notifyError,
    notifySuccess,
    refreshBookmarks,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBookmarked = useMemo(() => {
    return (
      dataType &&
      bookmarks.state === 'hasData' &&
      bookmarks.data.data?.[dataType]?.some((b) => b.entity_id === entityId)
    );
  }, [bookmarks, dataType, entityId]);

  // if (bookmarks.state === 'loading') {
  //   return (
  //     <div className="flex w-32 items-center justify-center">
  //       <Spin className="px-3 py-2" indicator={<LoadingOutlined />} />
  //     </div>
  //   );
  // }

  if (bookmarks.state === 'hasError') {
    return (
      <WarningFilled
        title="Bookmark status could not be loaded"
        className="text-warning mx-2 w-max px-2"
      />
    );
  }

  const addButton = customButton ? (
    customButton({
      onClick: saveToLibrary,
      children: 'Save to Library',
      loading: isSaving || bookmarks.state === 'loading',
      operation: 'save',
    })
  ) : (
    <Button
      type="text"
      className="text-primary-7 hover:text-primary-6! flex items-center gap-2 hover:bg-transparent!"
      onClick={saveToLibrary}
      loading={isSaving}
      disabled={isSaving}
    >
      {isSaving ? 'Saving...' : 'Save to library'}
      <PlusOutlined className="border-neutral-2 border px-4 py-3" />
    </Button>
  );

  const removeButton = customButton ? (
    customButton({
      onClick: removeFromLibrary,
      children: 'Remove from library',
      loading: isRemoving || bookmarks.state === 'loading',
      operation: 'remove',
    })
  ) : (
    <Button
      type="text"
      className="hover:text-primary-6! mr-3 flex h-[36px] items-center gap-2 px-1 text-gray-500 hover:bg-transparent!"
      loading={isRemoving}
      disabled={isRemoving}
      onClick={removeFromLibrary}
    >
      {isRemoving ? 'Removing...' : 'Remove from library'}
      <MinusCircleOutlined />
    </Button>
  );
  return <>{isBookmarked || isSaved ? removeButton : addButton}</>;
}

export function DetailViewBookmarkButton({
  children,
  onClick,
  loading,
  operation,
}: HTMLProps<HTMLButtonElement> & { loading?: boolean; operation?: 'save' | 'remove' }) {
  return (
    <button
      type="button"
      title={operation === 'save' ? 'Save to library' : 'Remove from library'}
      disabled={!onClick || loading}
      onClick={onClick}
    >
      <ToolbarButton
        icon={
          operation === 'save' ? (
            <BaselineBookmarkAdd className="text-[21px]" />
          ) : (
            <BookmarkMinus className="text-[21px]" />
          )
        }
        stateIcon={loading ? <LoadingOutlined className="text-[18px]" /> : undefined}
      >
        {children}
      </ToolbarButton>
    </button>
  );
}
