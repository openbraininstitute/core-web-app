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
  BookmarksSupportedTypes,
  isExperiment,
  isModel,
  isSimulation,
  MESSAGES,
} from '@/features/bookmark/helpers';
import {
  addBookmarksToProjectLibrary,
  deleteBookmarksFromProjectLibrary,
} from '@/features/bookmark/actions';
import { SIMULATION_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/simulation-data-types';
import { EXPERIMENT_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/experiment-data-types';
import { MODEL_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/model-data-types';
import { bookmarksForProjectAtomFamily } from '@/state/virtual-lab/bookmark';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
import { resolveLibraryUrl } from '@/utils/url-builder';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { DataType } from '@/constants/explore-section/list-views';
import type { ErrorCause } from '@/api/apiClient';

type Props = {
  virtualLabId: string;
  projectId: string;
  entityId: string;
  resourceId?: string;
  typeSlug: BookmarksSupportedTypes;
  customButton?: (props: HTMLProps<HTMLButtonElement>) => ReactNode;
};

export default function BookmarkButton({
  virtualLabId,
  projectId,
  entityId,
  resourceId,
  typeSlug,
  customButton,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { notification } = App.useApp();

  const [saving, setSaving] = useState(false);

  const onSaving = () => setSaving(true);
  const endSaving = () => setSaving(false);

  // TODO: use better way to get the right type, (src/api/entitycore/types/shared/context.ts)
  // use mapper that has slugs

  const { category, dataType } = useMemo(() => {
    if (isExperiment(typeSlug)) {
      return {
        dataType: Object.keys(EXPERIMENT_DATA_TYPE_CONFIG).find(
          (experimentKey) => EXPERIMENT_DATA_TYPE_CONFIG[experimentKey].name === typeSlug
        )! as DataType,
        category: 'experimental',
      };
    }
    if (isModel(typeSlug)) {
      return {
        dataType: Object.keys(MODEL_DATA_TYPE_CONFIG).find(
          (model) => MODEL_DATA_TYPE_CONFIG[model].name === typeSlug
        )! as DataType,
        category: 'models',
      };
    }
    if (isSimulation(typeSlug)) {
      return {
        dataType: Object.keys(SIMULATION_DATA_TYPE_CONFIG).find(
          (simulation) => SIMULATION_DATA_TYPE_CONFIG[simulation].name === typeSlug
        )! as DataType,
        category: 'simulations',
      };
    }
    throw new Error(`Resource of type ${typeSlug} cannot be bookmarked`);
  }, [typeSlug]);

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
    dataType: dataType,
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
        description: get(MESSAGES, get(cause, 'data.error_code'), ''),
        duration: 3,
        placement: 'topRight',
      });
    } else {
      notification.error({
        message: 'Resource could not be removed from the library',
        description: get(MESSAGES, get(cause, 'data.error_code'), ''),
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
          category: dataType,
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
          dataType,
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
    onSaving();
    const { error } = await tryCatch(
      deleteBookmarksFromProjectLibrary({
        virtualLabId,
        projectId,
        bookmarks: [{ category: dataType, entity_id: entityId, resource_id: resourceId }],
      }),
      endSaving,
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
      bookmarks.state === 'hasData' &&
      bookmarks.data.data?.[dataType]?.some((b) => b.entity_id === entityId)
    );
  }, [bookmarks, resourceId, category]);

  if (saving || bookmarks.state === 'loading') {
    return (
      <div className="flex w-32 items-center justify-end">
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
      className="text-primary-7 flex items-center gap-2 hover:bg-transparent!"
      onClick={saveToLibrary}
    >
      Save to library
      <PlusOutlined className="border-neutral-2 border px-4 py-3" />
    </Button>
  );

  const removeButton = customButton ? (
    customButton({ onClick: removeFromLibrary, children: 'Remove from library' })
  ) : (
    <Button
      type="text"
      className="mr-3 flex h-[36px] items-center gap-2 px-1 text-gray-500 hover:bg-transparent!"
      onClick={removeFromLibrary}
    >
      Remove from library
      <MinusCircleOutlined />
    </Button>
  );
  return <>{isBookmarked ? removeButton : addButton}</>;
}
