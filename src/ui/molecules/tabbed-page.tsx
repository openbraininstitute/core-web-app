import React, { useState, ReactNode, ReactElement } from 'react';
import { Button } from './button';

type TabProps = {
  label: string; //eslint-disable-line
  children: ReactNode;
};

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

type TabsProps = {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
  defaultIndex?: number;
};

export default function Tabs({ children, defaultIndex = 0 }: TabsProps) {
  const tabs = React.Children.toArray(children) as ReactElement<TabProps>[];

  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  if (tabs.length === 0) return <div>No tabs defined.</div>;

  return (
    <div className="w-full">
      {tabs.map((tab, index) => (
        <Button
          size="lg"
          rounded
          variant="outline"
          key={tab.props.label}
          onClick={() => setActiveIndex(index)}
          active={activeIndex === index}
        >
          {tab.props.label}
        </Button>
      ))}
      <div className="mt-5">{tabs[activeIndex]}</div>
    </div>
  );
}
