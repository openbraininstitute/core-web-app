import { ReactNode, useCallback, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { downloadArchive } from '@/services/entity-download';
import { Button } from '@/ui/molecules/button';
import sessionAtom from '@/state/session';

import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

export function ExploreDownloadButton<T extends EntityCoreIdentifiable>({
  children,
  selectedRows,
  dataType,
}: RenderButtonProps<T> & { children: ReactNode }) {
  const session = useAtomValue(sessionAtom);

  const [fetching, setFetching] = useState<boolean>(false);

  const download = useCallback(async () => {
    setFetching(true);

    const entity = getEntityByExtendedType({ type: dataType });
    if (!entity) {
      setFetching(false);
      throw new Error(`Can not find entity for type: ${dataType}`);
    }

    const entityType = entity?.type;

    try {
      await downloadArchive(
        entityType,
        selectedRows.map((row) => row.id)
      );
    } catch (error) {
      // TODO: add error notification
    } finally {
      setTimeout(() => setFetching(false), 1600);
    }
  }, [selectedRows, dataType, setFetching]);

  return session ? (
    <Button
      rounded
      variant="default"
      className="hover:bg-primary-8 bg-primary-9 h-12 border border-white/16 px-10 font-bold shadow-sm"
      onClick={download}
    >
      <>
        {children}
        {fetching && <LoadingOutlined />}
      </>
    </Button>
  ) : null;
}
