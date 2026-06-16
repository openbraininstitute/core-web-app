import { useAtom } from 'jotai';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { FlatListViewIcon, HierarchicalViewIcon } from '@/components/icons';
import { WorkspaceSection } from '@/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useDataListStateSnapshotActions } from '@/ui/segments/data-table/elements/context';
import {
  CircuitRepresentationView,
  circuitRepresentationViewAtom,
} from '@/ui/segments/explore/circuit/helpers';
import { classNames } from '@/util/utils';

type Props = {
  dataKey: string;
};
export function CircuitViewToggle({ dataKey }: Props) {
  const [view, updateView] = useAtom(circuitRepresentationViewAtom);
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
    <TooltipProvider>
      <div className="relative flex flex-row items-center gap-x-2">
        <div className="text-primary-9 text-base font-medium">View:</div>
        <div className="relative flex flex-row items-center gap-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <HierarchicalViewIcon
                  iconColor={view === 'hierarchy' ? '#002766' : '#aaa'}
                  className="h-4 w-4"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Hierarchical view</TooltipContent>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <FlatListViewIcon
                  iconColor={view === 'flat' ? '#002766' : '#aaa'}
                  className="h-4 w-4"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Flat list view</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
