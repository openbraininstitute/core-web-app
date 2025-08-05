'use client';

import { CaretRightFilled } from '@ant-design/icons';
import { useState, useEffect } from 'react';

import { cn } from '@/utils/css-class';

interface SkeletonTreeProps {
  isLoading?: boolean;
  children?: React.ReactNode;
}

function SkeletonItem({
  width,
  depth = 0,
  hasChildren = false,
  showVerticalLine = true,
}: {
  width: string;
  depth?: number;
  hasChildren?: boolean;
  showVerticalLine?: boolean;
}) {
  const paddingLeft = depth * 24 + 16;

  return (
    <>
      <div className="relative">
        {/* Vertical indentation lines */}
        {depth > 0 && showVerticalLine && (
          <>
            {/* Main vertical line */}
            <div
              className="absolute top-0 bottom-0 w-px animate-pulse bg-gray-200"
              style={{ left: `${depth * 24 - 8}px` }}
            />
            {/* Horizontal connector line */}
            <div
              className="absolute top-1/2 h-px w-4 animate-pulse bg-gray-200"
              style={{
                left: `${depth * 24 - 8}px`,
                transform: 'translateY(-50%)',
              }}
            />
          </>
        )}

        <div
          className="flex items-center justify-between px-2 py-2"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div
            className="h-4 animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
            style={{
              width,
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />

          <CaretRightFilled
            size={14}
            className={cn('text-base text-gray-200 transition-transform duration-300 ease-in-out', {
              'rotate-90': hasChildren,
            })}
            style={{
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {depth > 0 && (
        <div className="relative">
          {/* Continue vertical line through separator */}
          <div
            className="absolute top-0 bottom-0 w-px animate-pulse bg-gray-200"
            style={{ left: `${depth * 24 - 8}px` }}
          />
          <div
            className="mx-4 animate-pulse border-b border-gray-100"
            style={{ marginLeft: `${paddingLeft}px` }}
          />
        </div>
      )}
    </>
  );
}

export function EnhancedTreeSkeleton({ isLoading = true, children }: SkeletonTreeProps) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    setShowSkeleton(isLoading);
  }, [isLoading]);

  if (!showSkeleton && children) {
    return <>{children}</>;
  }

  return (
    <div className="h-full w-full rounded-lg border border-gray-200 bg-white">
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>

      <div className="p-4">
        <div className="relative">
          <div
            className="h-10 animate-pulse rounded-full border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%]"
            style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>

      <div className="relative py-2 pr-4">
        <div
          className="absolute top-0 bottom-0 w-px animate-pulse bg-gray-200"
          style={{ left: '16px' }}
        />

        <SkeletonItem width="75%" depth={0} hasChildren showVerticalLine={false} />
        <SkeletonItem width="35%" depth={1} hasChildren />
        <SkeletonItem width="30%" depth={2} />
        <SkeletonItem width="32%" depth={2} />
        <SkeletonItem width="38%" depth={1} />
        <SkeletonItem width="32%" depth={1} />
      </div>
    </div>
  );
}
