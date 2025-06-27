import { SettingsIcon } from '@/components/icons';

export default function FilterButton({
  setActive,
  numberOfFilters,
  numberOfActiveColumns,
}: {
  setActive: (active: boolean) => void;
  numberOfFilters: number;
  numberOfActiveColumns: number;
}) {
  return (
    <button
      type="button"
      aria-label="Open filters"
      className="flex w-[250px] flex-row flex-nowrap items-center justify-between rounded-none border border-solid border-gray-200 bg-white p-4 transition-all duration-300 ease-in-out hover:rounded-lg hover:bg-black/3"
      onClick={() => setActive(true)}
    >
      <div className="flex flex-row items-center gap-x-2">
        <div className="bg-primary-8 flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold text-white">
          {numberOfFilters}
        </div>
        <div className="flex flex-row items-baseline">
          <div className="text-primary-9 font-lg font-bold">Filters</div>
          <div className="ml-2 text-sm text-gray-500">
            {numberOfActiveColumns} active column{numberOfActiveColumns !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <SettingsIcon fill="#003381" className="h-4 w-auto" />
    </button>
  );
}
