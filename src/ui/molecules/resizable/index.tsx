'use client';

import { Group, Panel, Separator } from 'react-resizable-panels';

import { HorizontalResize } from '@/components/icons/buttons';
import { cn } from '@/utils/css-class';

import type * as React from 'react';

function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full data-[orientation=vertical]:flex-col', className)}
      {...props}
    />
  );
}

function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  handlerClassName,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
  handlerClassName?: string;
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:-translate-y-1/2 [&[data-orientation=vertical]>div]:rotate-90',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            'bg-border z-10 flex items-center justify-center rounded-xs border',
            handlerClassName
          )}
        >
          <HorizontalResize className={cn('size-2.5')} />
        </div>
      )}
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
