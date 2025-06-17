import { useCallback, useState } from 'react';
import { useSetAtom } from 'jotai';
import { App } from 'antd';

import { deleteBookmarksFromProjectLibrary } from '@/features/bookmark/actions';
import { bookmarksForProjectAtomFamily } from '@/state/virtual-lab/bookmark';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { ensureArray } from '@/utils/array';
import { tryCatch } from '@/api/utils';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';
import type { DataType } from '@/constants/explore-section/list-views';

type Props<T> = {
  selectedRows: Array<T>;
  virtualLabId: string;
  projectId: string;
  category: DataType;
  // @FIXME: Is that property used?
  // eslint-disable-next-line react/no-unused-prop-types
  dataKey: string;
  clearSelectedRows: () => void;
};

export default function Footer<T extends EntityCoreIdentifiable>({
  clearSelectedRows,
  selectedRows,
  virtualLabId,
  projectId,
  category,
}: Props<T>) {
  const [loading, setLoading] = useState(false);
  const { notification } = App.useApp();
  const refreshBookmarks = useSetAtom(
    bookmarksForProjectAtomFamily({ virtualLabId, projectId, category })
  );
  const notifySuccess = useCallback(() => {
    notification.success({
      message: 'Resources successfully removed from the library',
      placement: 'topRight',
      duration: 3,
    });
  }, [notification]);

  const notifyError = useCallback(
    (failedBookmarks?: LibraryBookmark[]) => {
      notification.error({
        message: failedBookmarks?.length
          ? `Some resources could not be removed from the library`
          : 'There was an error when removing resources from the library',
        placement: 'topRight',
        duration: 3,
      });
    },
    [notification]
  );

  const removeFromLibrary = async () => {
    setLoading(true);
    const { error } = await tryCatch(
      deleteBookmarksFromProjectLibrary({
        virtualLabId,
        projectId,
        bookmarks: selectedRows.map((r) => ({
          category,
          resource_id: ensureArray({ input: r.legacy_id }).at(0),
          entity_id: r.id,
        })),
      }),
      () => {
        setLoading(false);
        refreshBookmarks();
      }
    );

    if (error) {
      return notifyError();
    }

    notifySuccess();
    clearSelectedRows();
  };

  return (
    <div className="-mr-5 flex justify-end">
      <Btn
        className="fit-content animate-slide-up bg-primary-6 sticky bottom-0 ml-2 w-fit"
        onClick={removeFromLibrary}
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Removing...' : 'Remove from library'}
      </Btn>
    </div>
  );
}
