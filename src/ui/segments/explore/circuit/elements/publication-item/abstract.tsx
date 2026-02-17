import { useEffect, useRef, useState } from 'react';

import { classNames } from '@/util/utils';

interface Props {
  abstract: string;
  className?: string;
}

export function Abstract({ abstract, className }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  const visibleRef = useRef<HTMLParagraphElement>(null);
  const hiddenRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const visible = visibleRef.current;
    const hidden = hiddenRef.current;

    if (visible && hidden) {
      const visibleHeight = visible.getBoundingClientRect().height;
      const hiddenHeight = hidden.getBoundingClientRect().height;
      setIsClamped(hiddenHeight > visibleHeight + 1);
    }
  }, []);

  return (
    <div className={classNames('relative space-y-2 bg-gray-50 p-3', className)}>
      <p
        ref={visibleRef}
        className={classNames(
          'text-justify leading-relaxed transition-all duration-300',
          !isExpanded && 'line-clamp-2'
        )}
      >
        {abstract}
      </p>

      <p ref={hiddenRef} className="invisible absolute top-0 h-auto w-full whitespace-pre-wrap">
        {abstract}
      </p>

      {isClamped && (
        <button
          type="button"
          aria-label={isExpanded ? 'Show less' : 'Read more'}
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
