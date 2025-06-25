'use client';

import { useInView } from 'react-intersection-observer';

import { classNames } from '@/util/utils';

export default function PreviewImage({
  className,
  size,
}: {
  className?: string;
  size?: { height: number | string; width: number | string };
}) {
  const { ref } = useInView({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={classNames(className, 'flex items-center justify-center')}
      style={{
        height: typeof size !== 'string' && size ? size?.height : 116,
        width: typeof size !== 'string' && size ? size?.width : 196,
      }}
    >
      {/* TODO: remove this component if not needed */}
      Not yet needed
    </div>
  );
}
