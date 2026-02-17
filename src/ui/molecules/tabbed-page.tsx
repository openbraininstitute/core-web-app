import React, { type ReactElement, type ReactNode, useState } from 'react';

import { cn } from '@/utils/css-class';

import { Button } from './button';

type TabProps = {
  visible?: boolean; //eslint-disable-line
  label: string; //eslint-disable-line
  children: ReactNode;
};

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

type TabsProps = {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
  defaultIndex?: number;
  defaultMessage: string;
};

export default function Tabs({ children, defaultIndex = 0, defaultMessage }: TabsProps) {
  const tabs = React.Children.toArray(children).filter((t) => {
    return Boolean((t as ReactElement<TabProps>).props.visible ?? true);
  }) as ReactElement<TabProps>[];

  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  if (tabs.length === 0)
    return (
      <div
        className={cn(
          'text-primary-8 border-neutral-2 flex w-full',
          'items-center justify-center rounded-2xl border p-5 select-none'
        )}
      >
        {defaultMessage}
      </div>
    );

  function rounded(index: number) {
    if (index === 0 && index === tabs.length - 1) return 'rounded-full!';
    if (index === 0) return 'rounded-l-full!';
    if (index === tabs.length - 1) return 'rounded-r-full!';
    return undefined;
  }

  return (
    <div className="w-full">
      {tabs.map((tab, index) => (
        <Button
          size="lg"
          variant="outline"
          key={tab.props.label}
          onClick={() => setActiveIndex(index)}
          active={activeIndex === index}
          className={cn('rounded-none', rounded(index))}
          borderless
        >
          {tab.props.label}
        </Button>
      ))}
      <div className="mt-5">{tabs[activeIndex]}</div>
    </div>
  );
}
