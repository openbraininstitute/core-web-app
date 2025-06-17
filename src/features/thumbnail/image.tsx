'use client';

import { useInView } from 'react-intersection-observer';

import { classNames } from '@/util/utils';

export default function PreviewImage({
  className,
  size,
}: {
  className?: string;
  size?: { height: number; width: number } | string;
}) {
  const { ref } = useInView({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={classNames(className, 'flex items-center justify-center')}
      style={{
        height: typeof size !== 'string' && size ? size?.height : size,
        width: typeof size !== 'string' && size ? size?.width : size,
      }}
    >
      <div className="text-red-500">EntityCore Needed</div>
    </div>
  );
}
