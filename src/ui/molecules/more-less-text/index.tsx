import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/utils/css-class';

type ExpandableTextProps = {
  id?: string;
  text: string;
  collapsedLines?: number;
  className?: ComponentProps<'div'>['className'];
  btnWrapperClassName?: ComponentProps<'div'>['className'];
  children?: ({ isExpanded, toggle }: { isExpanded: boolean; toggle: () => void }) => ReactNode;
};

const clampClassFor = (lines: number): string => {
  switch (lines) {
    case 1:
      return 'line-clamp-1';
    case 2:
      return 'line-clamp-2';
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
  id,
  text,
  collapsedLines = 6,
  className,
  btnWrapperClassName,
  children,
}: ExpandableTextProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = contentRef.current;

    if (!el) return;

    const checkOverflow = (): void => {
      const computed = window.getComputedStyle(el);
      const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
      const actualLines = Math.round(el.scrollHeight / lineHeight);
      const hasOverflow = actualLines > collapsedLines;
      setIsOverflowing(hasOverflow);
    };

    const rafId = requestAnimationFrame(checkOverflow);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(checkOverflow);
      });
      resizeObserver.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [collapsedLines]);

  const toggle = (): void => {
    setIsExpanded((prev: boolean) => !prev);
  };

  return (
    <div className="relative">
      <p
        id={id}
        ref={contentRef}
        className={cn(!isExpanded && clampClassFor(collapsedLines), className)}
        aria-expanded={isExpanded}
      >
        {text}
      </p>
      {isOverflowing && (
        <div className={cn('mt-2', btnWrapperClassName)}>{children?.({ isExpanded, toggle })}</div>
      )}
    </div>
  );
}
