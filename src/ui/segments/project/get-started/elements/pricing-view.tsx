'use client';

import { Subscription } from '@/ui/segments/profile/sections/subscription';

export function PricingView() {
  return (
    <div className="bg-primary-9 flex h-full max-h-full w-full flex-col overflow-hidden rounded-2xl px-1 py-4">
      <div className="primary-scrollbar w-full overflow-y-auto text-white">
        <Subscription />
      </div>
    </div>
  );
}

export default PricingView;
