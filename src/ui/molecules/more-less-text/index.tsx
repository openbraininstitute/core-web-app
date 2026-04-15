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
  formatter?: (content: ReactNode) => ReactNode;
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
  formatter,
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
      const collapsedHeight = lineHeight * collapsedLines;

      const clone = el.cloneNode(true) as HTMLParagraphElement;
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.pointerEvents = 'none';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.display = 'block';
      clone.style.webkitLineClamp = 'unset';
      clone.style.width = `${el.clientWidth}px`;
      clone.classList.remove(clampClassFor(collapsedLines));

      document.body.appendChild(clone);
      const fullHeight = clone.scrollHeight;
      document.body.removeChild(clone);

      const hasOverflow = fullHeight > collapsedHeight + 1;
      const visibleHeight = el.getBoundingClientRect().height;
      const fullyVisible = !hasOverflow || isExpanded || visibleHeight >= fullHeight - 1;

      setIsOverflowing(hasOverflow);

      // keep internal state aligned with what users actually see
      // if content is fully visible while overflowing, treat it as expanded
      // so "Show less" is a real collapse action (not a stale label)
      if (hasOverflow && fullyVisible && !isExpanded) {
        setIsExpanded(true);
      }
    };

    const rafId = requestAnimationFrame(checkOverflow);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(checkOverflow);
      });
      resizeObserver.observe(el);
      if (el.parentElement) {
        resizeObserver.observe(el.parentElement);
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [collapsedLines, isExpanded]);

  const toggle = (): void => {
    setIsExpanded((prev) => !prev);
  };

  const content = (
    <p
      id={id}
      ref={contentRef}
      className={cn(
        !isExpanded && clampClassFor(collapsedLines),
        className,
        'flex-none self-start'
      )}
      data-expanded={isExpanded}
    >
      {text}
    </p>
  );

  const formattedContent = formatter ? formatter(content) : content;

  return (
    <div className="relative">
      {formattedContent}

      {isOverflowing && (
        <div className={cn('mt-2 w-full', btnWrapperClassName)}>
          {children?.({ isExpanded, toggle })}
        </div>
      )}
    </div>
  );
}
