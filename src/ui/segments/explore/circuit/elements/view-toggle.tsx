import { useAtom } from 'jotai';
import { Tooltip } from 'antd';

import {
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';
import { FlatListViewIcon, HierarchicalViewIcon } from '@/components/icons';
import { useDataListStoreSession } from '@/ui/segments/data-table/elements/helpers';
import { classNames } from '@/util/utils';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type Props = {
  dataType: TExtendedEntitiesTypeDict;
  dataKey: string;
};

export function CircuitViewToggle({ dataType, dataKey }: Props) {
  const [view, updateView] = useAtom(circuitRepresentationViewAtom);
  const { sessionValue: dataListStoreSession, setSessionValue: updateDataListStoreSession } =
    useDataListStoreSession({
      dataKey,
      dataType,
    });

  const handleViewChange = () => {
    const newView =
      view === CircuitRepresentationView.Hierarchy
        ? CircuitRepresentationView.Flat
        : CircuitRepresentationView.Hierarchy;
    updateView(newView);
    updateDataListStoreSession({
      ...dataListStoreSession,
      View: newView,
    });
  };

  return (
    <div className="relative flex flex-row items-center gap-x-2">
      <div className="text-primary-9 text-base font-medium">View:</div>
      <div className="relative flex flex-row items-center gap-x-2">
        <Tooltip title="Hierarchical view">
          <div>
            <HierarchicalViewIcon
              iconColor={view === 'hierarchy' ? '#002766' : '#aaa'}
              className="h-4 w-4"
            />
          </div>
        </Tooltip>
        <button
          type="button"
          className="relative h-6 w-12 rounded-xl border border-solid border-gray-200"
          onClick={handleViewChange}
          aria-label="Toggle view"
          id="toggle-view"
        >
          <div
            className={classNames(
              'bg-primary-9 absolute top-px h-5 w-5 rounded-full transition-transform duration-300 ease-in-out',
              view === 'hierarchy' ? 'translate-x-[2px]' : 'translate-x-[21px]'
            )}
          />
        </button>
        <Tooltip title="Flat list view">
          <div>
            <FlatListViewIcon
              iconColor={view === 'flat' ? '#002766' : '#aaa'}
              className="h-4 w-4"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
