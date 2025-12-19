'use client';

import { useRef, useState } from 'react';

import { classNames } from '@/util/utils';

interface AlphabeticalFilterProps<T extends Record<K, string>, K extends keyof T> {
  data: T[];
  selectedLetter: string | null;
  setSelectedLetter: (letter: string | null) => void;
  labelKey: K;
}

export default function AlphabeticalFilter<T extends Record<K, string>, K extends keyof T>({
  data,
  selectedLetter,
  setSelectedLetter,
  labelKey,
}: AlphabeticalFilterProps<T, K>) {
  const [slideOffset, setSlideOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonListRef = useRef<HTMLDivElement>(null);

  const validLetters = new Set<string>();
  data.forEach((item) => {
    const firstLetter = item[labelKey].charAt(0).toUpperCase();
    if (/[A-Z]/.test(firstLetter)) {
      validLetters.add(firstLetter);
    }
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const getMaxOffset = () => {
    if (containerRef.current && buttonListRef.current) {
      return Math.max(0, buttonListRef.current.scrollWidth - containerRef.current.offsetWidth);
    }
    return 0;
  };

  const handleSlideLeft = () => {
    if (containerRef.current) {
      const slideAmount = containerRef.current.offsetWidth;
      const newOffset = Math.max(slideOffset - slideAmount, 0);
      setSlideOffset(newOffset);
    }
  };

  const handleSlideRight = () => {
    if (containerRef.current) {
      const slideAmount = containerRef.current.offsetWidth;
      const maxOffset = getMaxOffset();
      const newOffset = Math.min(slideOffset + slideAmount, maxOffset);
      setSlideOffset(newOffset);
    }
  };

  return (
    <div className="mb-8 flex items-center gap-2">
      <button
        type="button"
        onClick={handleSlideLeft}
        disabled={slideOffset === 0}
        className={classNames(
          'flex-shrink-0 rounded-md px-2 py-1 text-sm font-medium',
          slideOffset === 0
            ? 'cursor-not-allowed opacity-50'
            : 'bg-primary-7 text-primary-1 hover:bg-primary-5',
        )}
        aria-label="Slide alphabetical filter left"
      >
        &lt;
      </button>
      <div ref={containerRef} className="w-full overflow-hidden">
        <div
          ref={buttonListRef}
          className="flex flex-nowrap gap-2 transition-transform duration-300"
          style={{ transform: `translateX(-${slideOffset}px)` }}
        >
          <button
            type="button"
            onClick={() => setSelectedLetter(null)}
            className={classNames(
              'flex-shrink-0 rounded-md px-3 py-1 text-sm font-medium',
              selectedLetter === null
                ? 'bg-primary-3 text-white'
                : 'bg-primary-7 text-primary-1 hover:bg-primary-5',
            )}
          >
            All
          </button>
          {alphabet.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => {
                if (validLetters.has(letter)) {
                  setSelectedLetter(letter);
                }
              }}
              disabled={!validLetters.has(letter)}
              className={classNames(
                'flex-shrink-0 rounded-md px-3 py-1 text-sm font-medium',
                selectedLetter === letter
                  ? 'bg-primary-3 text-white'
                  : 'bg-primary-7 text-primary-1 hover:bg-primary-5',
                !validLetters.has(letter) ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary-5',
              )}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSlideRight}
        disabled={slideOffset >= getMaxOffset()}
        className={classNames(
          'flex-shrink-0 rounded-md px-2 py-1 text-sm font-medium',
          slideOffset >= getMaxOffset()
            ? 'cursor-not-allowed opacity-50'
            : 'bg-primary-7 text-primary-1 hover:bg-primary-5',
        )}
        aria-label="Slide alphabetical filter right"
      >
        &gt;
      </button>
    </div>
  );
}
