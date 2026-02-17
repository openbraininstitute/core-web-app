/* eslint-disable react/jsx-props-no-spreading */

'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React from 'react';

import { cn } from '@/utils/css-class';

const PillTabs = TabsPrimitive.Root;

const PillTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'bg-muted text-muted-foreground inline-flex h-14 items-center justify-center rounded-full p-1',
      className
    )}
    {...props}
  />
));
PillTabsList.displayName = TabsPrimitive.List.displayName;

const PillTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:ring-ring inline-flex h-full items-center justify-center px-6 py-3 text-sm font-medium whitespace-nowrap transition-all first:rounded-l-full last:rounded-r-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
PillTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const PillTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:ring-ring mt-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));
PillTabsContent.displayName = TabsPrimitive.Content.displayName;

export { PillTabs, PillTabsList, PillTabsTrigger, PillTabsContent };
