'use client';

import React, { type ReactElement, type ReactNode, useState } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import {
  detailViewTabbedContentClass,
  detailViewTabbedEmptyClass,
  detailViewTabbedTabButtonClass,
} from '@/ui/segments/detail-view/variant-styles';
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
  variant?: TViewVariant;
};

export default function Tabs({
  children,
  defaultIndex = 0,
  defaultMessage,
  variant = ViewVariant.Light,
}: TabsProps) {
  const tabs = React.Children.toArray(children).filter((t) => {
    return Boolean((t as ReactElement<TabProps>).props.visible ?? true);
  }) as ReactElement<TabProps>[];

  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  if (tabs.length === 0) {
    return <div className={detailViewTabbedEmptyClass(variant)}>{defaultMessage}</div>;
  }

  function rounded(index: number) {
    if (index === 0 && index === tabs.length - 1) return 'rounded-full!';
    if (index === 0) return 'rounded-l-full!';
    if (index === tabs.length - 1) return 'rounded-r-full!';
    return undefined;
  }

  return (
    <div className="w-full">
      <div className="inline-flex w-full flex-wrap">
        {tabs.map((tab, index) => (
          <Button
            size="lg"
            variant={variant === ViewVariant.Default ? 'ghost' : 'outline'}
            key={tab.props.label}
            onClick={() => setActiveIndex(index)}
            active={variant === ViewVariant.Light && activeIndex === index}
            className={cn(
              detailViewTabbedTabButtonClass(variant, activeIndex === index),
              rounded(index),
              { 'rounded-none': variant === ViewVariant.Light }
            )}
            borderless={variant === ViewVariant.Default}
          >
            {tab.props.label}
          </Button>
        ))}
      </div>
      <div className={detailViewTabbedContentClass(variant)}>{tabs[activeIndex]}</div>
    </div>
  );
}
