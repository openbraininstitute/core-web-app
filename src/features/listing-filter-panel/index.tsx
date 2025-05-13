'use client';

import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';

import ListingFilterPanel from '@/features/listing-filter-panel/listing-filter-panel';

import { activeColumnsAtom, dataAtom, filtersAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { useUnwrappedValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

import type { CoreFilter } from '@/entity-configuration/definitions/types';
import type { WorkspaceContext } from '@/types/common';

export default function WithListingFilterPanel({
  children,
  dataType,
  virtualLabInfo,
  dataScope,
  dataKey,
  className,
}: {
  children: (props: {
    activeColumns?: string[];
    displayControlPanel: boolean;
    setDisplayControlPanel: Dispatch<SetStateAction<boolean>>;
    filters?: CoreFilter[];
  }) => ReactNode;
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
  className?: string;
  dataKey: string;
}) {
  const activeColumns = useAtomValue(
    useMemo(
      () => unwrap(activeColumnsAtom({ dataType, dataScope, key: dataKey })),
      [dataType, dataScope, dataKey]
    )
  );

  const [displayControlPanel, setDisplayControlPanel] = useState(false);

  const data = useUnwrappedValue(dataAtom({ dataType, dataScope, virtualLabInfo, key: dataKey }));
  const facets = data?.facets;

  const [filters, setFilters] = useAtom(
    useMemo(
      () => unwrap(filtersAtom({ dataType, dataScope, key: dataKey })),
      [dataType, dataScope, dataKey]
    )
  );

  console.log('filters', filters);

  return (
    <>
      <section
        className={classNames(
          'flex h-full w-full min-w-0 flex-col bg-white before:shadow-lg after:shadow-md',
          className
        )}
      >
        {children({ activeColumns, displayControlPanel, setDisplayControlPanel, filters })}
      </section>
      {displayControlPanel && filters && (
        <ListingFilterPanel
          data-testid="listing-view-control-panel"
          filters={filters}
          setFilters={setFilters}
          toggleDisplay={() => setDisplayControlPanel(false)}
          dataType={dataType}
          dataScope={dataScope}
          dataKey={dataKey}
          facets={facets}
          virtualLabInfo={virtualLabInfo}
        />
      )}
    </>
  );
}
