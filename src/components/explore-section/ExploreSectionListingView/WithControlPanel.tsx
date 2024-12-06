import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { unwrap } from 'jotai/utils';

import ControlPanel from '@/components/explore-section/ControlPanel';
import { activeColumnsAtom, dataAtom, filtersAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { Filter } from '@/components/Filter/types';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import usePathname from '@/hooks/pathname';
import { useUnwrappedValue } from '@/hooks/hooks';

export default function WithControlPanel({
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
    filters?: Filter[];
  }) => ReactNode;
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  className?: string;
  dataKey?: string;
}) {
  const path = usePathname();
  const isBuildConfig = useMemo(() => path?.includes('/new/configure'), [path]);
  const activeColumns = useAtomValue(
    useMemo(
      () => unwrap(activeColumnsAtom({ dataType, dataScope, isBuildConfig, key: dataKey })),
      [dataType, dataScope, isBuildConfig, dataKey]
    )
  );

  const [displayControlPanel, setDisplayControlPanel] = useState(false);

  const [filters, setFilters] = useAtom(
    useMemo(
      () => unwrap(filtersAtom({ dataType, dataScope, key: dataKey })),
      [dataType, dataScope, dataKey]
    )
  );

  const data = useUnwrappedValue(dataAtom({ dataType, dataScope, virtualLabInfo, key: dataKey }));

  const aggregations = data?.aggs;

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
        <ControlPanel
          data-testid="listing-view-control-panel"
          aggregations={aggregations}
          filters={filters}
          setFilters={setFilters}
          toggleDisplay={() => setDisplayControlPanel(false)}
          dataType={dataType}
          dataScope={dataScope}
          dataKey={dataKey}
        />
      )}
    </>
  );
}
