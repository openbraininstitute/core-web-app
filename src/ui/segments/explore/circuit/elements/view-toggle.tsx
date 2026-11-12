import { Tooltip } from 'antd';
import { useAtom } from 'jotai';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { FlatListViewIcon, HierarchicalViewIcon } from '@/components/icons';
import { WorkspaceSection } from '@/constants';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import {
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';
import { classNames } from '@/util/utils';

type Props = {
  dataKey: string;
  /** pinned to the flat list and greyed out, as for a single scale */
  disabled?: boolean;
};
export function CircuitViewToggle({ dataKey, disabled }: Props) {
  const [selectedView, updateView] = useAtom(circuitRepresentationViewAtom);
  const view = disabled ? CircuitRepresentationView.Flat : selectedView;
  const { sync: runStorageSync } = useDataListStateSnapshotActions({
    dataKey,
    dataType: ExtendedEntitiesTypeDict.Circuit,
    section: WorkspaceSection.Data,
  });

  const handleViewChange = () => {
    const newView =
      view === CircuitRepresentationView.Hierarchy
        ? CircuitRepresentationView.Flat
        : CircuitRepresentationView.Hierarchy;
    updateView(newView);
    runStorageSync({ View: newView });
  };

  return (
    <div
      className={classNames(
        'relative flex flex-row items-center gap-x-2',
        disabled && 'opacity-40'
      )}
    >
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
          className="relative h-6 w-12 rounded-xl border border-solid border-gray-200 disabled:cursor-not-allowed"
          onClick={handleViewChange}
          disabled={disabled}
          aria-label="Toggle view"
          data-testid="view-toggle"
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
