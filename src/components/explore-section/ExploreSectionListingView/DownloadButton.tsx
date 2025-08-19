import { ReactNode, useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { downloadArchive } from '@/services/entity-download';
import sessionAtom from '@/state/session';
import { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

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
    } catch (_error) {
      // TODO: add error notification
    } finally {
      setTimeout(() => setFetching(false), 1600);
    }
  }, [selectedRows, dataType, setFetching]);

  return session ? (
    <Btn
      className="fit-content bg-primary-8 w-fit"
      loading={fetching}
      ariaLabel="download-resources-button"
      onClick={download}
    >
      {children}
    </Btn>
  ) : null;
}
