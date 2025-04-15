import { useEffect, useRef, useState } from 'react';

type ScrollDirection = 'left' | 'right' | null;

interface HorizontalScrollInfo {
  ref: React.RefObject<HTMLDivElement | null>;
  isScrollable: boolean;
  scrollDirection: ScrollDirection;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export default function useHorizontalScrollInfo(): HorizontalScrollInfo {
  const ref = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState<boolean>(false);
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const lastScrollLeft = useRef<number>(0);
  const epsilon = 1; // Threshold to account for floating-point errors

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateScrollInfo = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScrollLeft = scrollWidth - clientWidth;

      setIsScrollable(scrollWidth > clientWidth);
      setCanScrollLeft(scrollLeft > epsilon);
      setCanScrollRight(scrollLeft < maxScrollLeft - epsilon);
    };

    const handleScroll = () => {
      const currentScrollLeft = el.scrollLeft;
      if (currentScrollLeft > lastScrollLeft.current + epsilon) {
        setScrollDirection('right');
      } else if (currentScrollLeft < lastScrollLeft.current - epsilon) {
        setScrollDirection('left');
      }
      lastScrollLeft.current = currentScrollLeft;
      updateScrollInfo();
    };

    updateScrollInfo();
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, isScrollable, scrollDirection, canScrollLeft, canScrollRight };
}
