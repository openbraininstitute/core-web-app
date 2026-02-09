'use client';

import { CaretRightFilled } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

interface SkeletonTreeProps {
  isLoading?: boolean;
  children?: React.ReactNode;
}

function SkeletonItem({
  width,
  depth = 0,
  hasChildren = false,
}: {
  width: string;
  depth?: number;
  hasChildren?: boolean;
}) {
  const paddingLeft = depth * 24 + 16;

  return (
    <div className="relative">
      <div
        className="flex items-center justify-between px-2 py-3"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        <div
          className="shine h-4 rounded-full bg-gray-100"
          style={{
            width,
          }}
        />

        <CaretRightFilled
          size={14}
          className={cn('text-base text-gray-100', {
            'rotate-90': hasChildren,
          })}
        />
      </div>
    </div>
  );
}

export function TreeSkeleton({ isLoading = true, children }: SkeletonTreeProps) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    setShowSkeleton(isLoading);
  }, [isLoading]);

  if (!showSkeleton && children) {
    return <>{children}</>;
  }

  return (
    <div className="h-full w-full rounded-lg bg-white">
      <style jsx>{`
        @keyframes opacityShimmerTree {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.6;
          }
        }
        .shine {
          animation: opacityShimmerTree 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative px-2">
        <div className="shine relative mb-2 h-3 w-1/3 rounded-full bg-gray-100 px-2!" />
        <div className="shine h-10 rounded-full bg-gray-100" />
      </div>

      <div className="relative py-2 pr-4">
        <SkeletonItem width="75%" depth={0} hasChildren />
        <SkeletonItem width="50%" depth={1} hasChildren />
        <SkeletonItem width="30%" depth={2} />
        <SkeletonItem width="50%" depth={2} />
        <SkeletonItem width="32%" depth={2} />
        <SkeletonItem width="32%" depth={2} />
        <SkeletonItem width="50%" depth={1} />
        <SkeletonItem width="50%" depth={1} />
      </div>
    </div>
  );
}
