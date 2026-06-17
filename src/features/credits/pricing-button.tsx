'use client';

import { RiErrorWarningFill } from '@remixicon/react';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export function PricingButton({ className }: { className?: string }) {
  return (
    <Button
      rounded
      size="md"
      variant="outline"
      type="button"
      className={cn(
        'border-gray-100 group shrink-0 bg-white px-4 text-primary-9 select-none hover:border-gray-300 hover:text-primary-8',
        className
      )}
      onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
    >
      <span className="flex items-center gap-3">
        Pricing
        <RiErrorWarningFill className="text-primary-9 group-hover:text-primary-8" />
      </span>
    </Button>
  );
}

export default PricingButton;
