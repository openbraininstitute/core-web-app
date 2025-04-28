import { parseAsString, useQueryState } from 'nuqs';
import { classNames } from '@/util/utils';

type Props<T> = {
  tabsConfig?: Array<{ key: T; title: string }>;
};

export default function Tabs<T extends string>({ tabsConfig }: Props<T>) {
  const { activeTab, onChangeTab } = useTabs({ tabsConfig });
  return (
    <ul className="!border-neutral-3 flex w-full items-center justify-center border">
      {tabsConfig?.map(({ key, title }) => (
        <li
          key={key}
          title={title}
          className={classNames(
            'border-e-neutral-2 w-1/3 flex-[1_1_33%] border-0 border-r py-3 text-center text-xl font-semibold',
            'transition-all duration-200 ease-out last:border-r-0',
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

export function useTabs<T extends string>({ tabsConfig }: Props<T>) {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsString.withDefault(tabsConfig?.at(0)!.key!)
  );

  const onChangeTab = (key: string) => () => setActiveTab(key);

  return {
    activeTab,
    onChangeTab,
  };
}
