'use client';

import { Subscription } from '@/ui/segments/profile/sections/subscription';

export function PricingView() {
  return (
    <div className="bg-primary-9 mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full flex-col overflow-hidden rounded-2xl p-4">
      <div className="primary-scrollbar w-full overflow-y-auto pr-2 text-white">
        <Subscription />
      </div>
    </div>
  );
}

export default PricingView;
