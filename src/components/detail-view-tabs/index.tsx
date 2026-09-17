'use client';

import { parseAsString, useQueryState } from 'nuqs';

import { classNames } from '@/util/utils';

type Props<T> = {
  tabKey?: string;
  tabsConfig?: Array<{ key: T; title: string }>;
  cls?: {
    container?: string;
    tab?:
      | string
      | {
          active: string;
          inactive: string;
        };
    btn?: string;
  };
  shallow?: boolean;
  clearOnDefault?: boolean;
  defaultKey?: string;
};

export default function Tabs<T extends string>({
  tabsConfig,
  cls,
  tabKey,
  shallow,
  defaultKey,
  clearOnDefault,
}: Props<T>) {
  const { activeTab, onChangeTab } = useTabs({
    tabsConfig,
    tabKey,
    shallow,
    defaultKey,
    clearOnDefault,
  });
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
          className={classNames(
            'border-e-neutral-2 w-1/3 flex-[1_1_33%] border-0 border-r text-center text-xl font-semibold',
            'transition-all duration-200 ease-out last:border-r-0',
            activeTab === key ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white',
            // eslint-disable-next-line
            typeof cls?.tab === 'string'
              ? cls.tab
              : activeTab === key
                ? cls?.tab?.active
                : cls?.tab?.inactive
          )}
        >
          <button
            title={title}
            type="button"
            onClick={onChangeTab(key)}
            onKeyDown={onChangeTab(key)}
            aria-label={title}
            id={`tab_${key}`}
            className="w-full py-4"
            data-testid={`tab_${key}`}
          >
            <div className={classNames('line-clamp-1 w-full', cls?.btn)}>{title}</div>
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
  clearOnDefault = false,
  defaultKey = undefined,
}: Omit<Props<T>, 'cls'>) {
  const [activeTab, setActiveTab] = useQueryState(
    tabKey,
    parseAsString
      .withOptions({ shallow, clearOnDefault })
      // biome-ignore lint/style/noNonNullAssertion: first item is always present
      // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: allow chain
      .withDefault(defaultKey ?? tabsConfig?.at(0)!.key!)
  );

  const onChangeTab = (key: string) => () => setActiveTab(key as T);
  const reset = () => setActiveTab(null);

  return {
    reset,
    activeTab,
    onChangeTab,
  };
}
