import { useCallback, useState } from 'react';
import { App } from 'antd';

import { deleteBookmarksFromProjectLibrary } from '@/features/bookmark/actions';
import { dataAtom } from '@/state/explore-section/list-view-atoms';
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
  dataKey: string;
  clearSelectedRows: () => void;
};

export default function Footer<T extends EntityCoreIdentifiable>({
  clearSelectedRows,
  selectedRows,
  virtualLabId,
  projectId,
  category,
  dataKey,
}: Props<T>) {
  const [loading, setLoading] = useState(false);
  const { notification } = App.useApp();

  const notifySuccess = useCallback(() => {
    notification.success({
      message: 'Resources successfully removed from the library',
      placement: 'topRight',
      duration: 3,
    });
  }, []);

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
    [selectedRows]
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
      () => setLoading(false)
    );

    if (error) {
      return notifyError();
    } else {
      // NOTE: this is required to avoid infinite loops
      setTimeout(() => dataAtom.remove({ key: dataKey, dataType: category }));
      notifySuccess();
      clearSelectedRows();
    }
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
