'use client';

import { parseAsString, Parser, useQueryState } from 'nuqs';
import { classNames } from '@/util/utils';

type Props<T> = {
  tabKey?: string;
  tabsConfig?: Array<{ key: T; title: string }>;
  cls?: {
    container?: string;
    tab?: string;
    btn?: string;
  };
  shallow?: boolean;
};

export default function Tabs<T extends string>({ tabsConfig, cls, tabKey, shallow }: Props<T>) {
  const { activeTab, onChangeTab } = useTabs({ tabsConfig, tabKey, shallow });
  return (
    <ul
      className={classNames(
        '!border-neutral-3 flex w-full items-center justify-center border',
        cls?.container
      )}
    >
      {tabsConfig?.map(({ key, title }) => (
        <li
          key={key}
          title={title}
          className={classNames(
            'border-e-neutral-2 w-1/3 flex-[1_1_33%] border-0 border-r py-3 text-center text-xl font-semibold',
            'transition-all duration-200 ease-out last:border-r-0',
            activeTab === key ? 'bg-primary-9 text-white' : 'text-primary-9 bg-white',
            cls?.tab
          )}
        >
          <button
            type="button"
            className={classNames('w-full', cls?.btn)}
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

export function useTabs<T extends string>({
  tabsConfig,
  tabKey = 'tab',
  shallow = false,
}: Omit<Props<T>, 'cls'>) {
  const [activeTab, setActiveTab] = useQueryState(
    `${tabKey}`,
    parseAsString
      .withOptions({ shallow, clearOnDefault: false })
      .withDefault(tabsConfig?.at(0)!.key!) as Parser<T>
  );

  const onChangeTab = (key: string) => () => setActiveTab(key as T);

  return {
    activeTab,
    onChangeTab,
  };
}
