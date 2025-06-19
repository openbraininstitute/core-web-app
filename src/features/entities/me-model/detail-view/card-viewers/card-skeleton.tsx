import React from 'react';

function CardContainerSkeleton() {
  return (
    <div className="w-full rounded-[6px] border border-gray-100 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[max-content_1fr_1fr]">
        <div className="md:col-span-1">
          <div
            className="overflow-hidden rounded-md border border-gray-200 bg-white p-2"
            style={{ height: 202, width: 202 }}
          >
            <div className="h-full w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-6">
                  <div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-6">
                  <div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardContainerSkeleton;
