import { ReactNode, useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { downloadArchive } from '@/services/entity-download';
import sessionAtom from '@/state/session';
import { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import { Btn } from '@/components/buttons/base/legacy-btn';
import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';

export function ExploreDownloadButton({
  children,
  selectedRows,
  dataType,
}: RenderButtonProps & { children: ReactNode }) {
  const session = useAtomValue(sessionAtom);

  const [fetching, setFetching] = useState<boolean>(false);

  const download = useCallback(() => {
    setFetching(true);

    const entity = getEntityByLegacyType({ legacyType: dataType });
    if (!entity) {
      setFetching(false);
      throw new Error(`Can not find entity for type: ${dataType}`);
    }

    const entityType = entity?.type;

    downloadArchive(
      entityType,
      selectedRows.map((row) => row.id)
    );

    setTimeout(() => setFetching(false), 1600);
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
