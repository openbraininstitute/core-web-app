import { Tooltip } from 'antd';

import { useAtom } from 'jotai';
import { FlatListViewIcon, HierarchicalViewIcon } from '@/components/icons';
import { classNames } from '@/util/utils';
import { queryParamsPerEntityTypeAtomFamily } from '@/state/explore-section/list-view-atoms';

export default function ViewToggle({ dataKey }: { dataKey: string }) {
  const [queryParams, setQueryParams] = useAtom(queryParamsPerEntityTypeAtomFamily(dataKey));
  const toggle = queryParams?.view || 'flat';

  const handleViewChange = () => {
    setQueryParams({ ...queryParams, view: toggle === 'hierarchy' ? 'flat' : 'hierarchy' });
  };

  return (
    <div className="relative flex flex-row items-center gap-x-2">
      <div className="text-primary-9 text-base font-medium">View:</div>
      <div className="relative flex flex-row items-center gap-x-2">
        <Tooltip title="Hierarchical view">
          <div>
            <HierarchicalViewIcon
              iconColor={toggle === 'hierarchy' ? '#002766' : '#AAA'}
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
              toggle === 'hierarchy' ? 'translate-x-[2px]' : 'translate-x-[21px]'
            )}
          />
        </button>
        <Tooltip title="Flat list view">
          <div>
            <FlatListViewIcon
              iconColor={toggle === 'flat' ? '#002766' : '#AAA'}
              className="h-4 w-4"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
