import { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

type ExpandableTextProps = {
  text: string;
  collapsedLines?: number;
  className?: string;
  children?: ({ isExpanded, toggle }: { isExpanded: boolean; toggle: () => void }) => ReactNode;
};

const clampClassFor = (lines: number): string => {
  switch (lines) {
    case 3:
      return 'line-clamp-3';
    case 4:
      return 'line-clamp-4';
    case 5:
      return 'line-clamp-5';
    case 6:
      return 'line-clamp-6';
    case 7:
      return 'line-clamp-7';
    case 8:
      return 'line-clamp-8';
    default:
      return 'line-clamp-6';
  }
};

export function ExpandableText({
  text,
  collapsedLines = 6,
  className,
  children,
}: ExpandableTextProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const updateOverflow = (): void => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    updateOverflow();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateOverflow());
      resizeObserver.observe(el);
    }

    const handleResize = (): void => updateOverflow();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [text, collapsedLines]);

  const toggle = (): void => {
    setIsExpanded((prev: boolean) => !prev);
  };

  return (
    <div className="relative">
      <p
        ref={contentRef}
        id="project-description-text"
        className={cn(!isExpanded && clampClassFor(collapsedLines), className)}
        aria-expanded={isExpanded}
      >
        {text}
      </p>
      {(isOverflowing || isExpanded) && (
        <div className="mt-2">{children?.({ isExpanded, toggle })}</div>
      )}
    </div>
  );
}
