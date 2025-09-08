import React, { useState, ReactNode, ReactElement } from 'react';

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
      <div className="flex border-b border-gray-300">
        {tabs.map((tab, index) => (
          <button
            type="button"
            key={tab.props.label}
            onClick={() => setActiveIndex(index)}
            className={`-mb-px border-b-2 px-4 py-2 ${
              activeIndex === index
                ? 'border-blue-500 font-semibold text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.props.label}
          </button>
        ))}
      </div>

      <div className="p-4">{tabs[activeIndex]}</div>
    </div>
  );
}
