'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { RiCheckFill } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type * as React from 'react';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // The tick is `text-current`, and `primary-foreground` is not a global theme
        // token (only a local var in the AI-assistant markdown module), so the check
        // used to inherit the surrounding text colour — invisible dark-on-dark against
        // the `primary-8` fill. Pin it to white, which the fill is dark enough for in
        // both themes.
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary-8 data-[state=checked]:text-white dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <RiCheckFill className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
