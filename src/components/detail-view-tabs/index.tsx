import { Options, parseAsString, useQueryState, UseQueryStateReturn } from 'nuqs';
import { classNames } from '@/util/utils';

export type TabsKeys = 'configuration' | 'analysis' | 'simulation';
export const TabsConfig: Array<{ key: TabsKeys; title: string }> = [
  { key: 'configuration', title: 'Configuration' },
  { key: 'analysis', title: 'Analysis' },
  { key: 'simulation', title: 'Simulation' },
];

export default function Tabs() {
  const { activeTab, onChangeTab } = useTabs();
  return (
    <ul className="!border-neutral-3 flex w-full items-center justify-center border">
      {TabsConfig.map(({ key, title }) => (
        <li
          key={key}
          title={title}
          className={classNames(
            'border-e-neutral-2 w-1/3 flex-[1_1_33%] border-0 border-r py-3 text-center text-xl font-semibold',
            'transition-all duration-200 ease-out last:border-r-0',
            'hover:bg-primary-9/10',
            activeTab === key ? 'bg-primary-9 text-white' : 'text-primary-9 bg-white'
          )}
        >
          <button
            type="button"
            className="w-full"
            onClick={onChangeTab(key)}
            onKeyDown={onChangeTab(key)}
          >
            {title}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function useTabs() {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsString.withDefault(TabsConfig.at(0)!.key)
  );

  const onChangeTab = (key: string) => () => setActiveTab(key);

  return {
    activeTab,
    onChangeTab,
  };
}
