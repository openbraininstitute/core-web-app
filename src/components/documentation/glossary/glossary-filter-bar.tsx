import { useState } from 'react';

import { ContentForGlossaryItem } from '@/components/documentation/hooks/use-sanity-content-for-glossary';
import { classNames } from '@/util/utils';

// Define props type
type GlossaryFilterBarProps = {
  onFilterChange: (letter: string | null) => void;
  content: ContentForGlossaryItem[];
};

// Helper function to compute button classes
function getButtonClasses(
  letter: string | null,
  selectedLetter: string | null,
  hasTerms: boolean
): string {
  const baseClasses = 'px-2 py-px text-base';
  if (selectedLetter === letter) {
    return classNames(baseClasses, 'bg-white font-bold text-primary-9');
  }
  if (hasTerms) {
    return classNames(baseClasses, 'text-white');
  }
  return classNames(baseClasses, 'font-regular text-primary-5');
}

export default function GlossaryFilterBar({ onFilterChange, content }: GlossaryFilterBarProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>('All');

  // Generate alphabet array (A-Z)
  const alphabet: string[] = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  // Determine which letters have glossary terms
  const lettersWithTerms = new Set(
    content
      .map((item) => item.Name.toUpperCase().charAt(0))
      .filter((letter) => alphabet.includes(letter))
  );

  // Handle filter button click
  const handleFilterClick = (letter: string | null) => {
    setSelectedLetter(letter);
    onFilterChange(letter === 'All' ? null : letter);
  };

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto">
      {/* All button */}
      <button
        type="button"
        aria-label="Filter by All"
        className={classNames(
          'min-w-[40px] px-2 py-px text-center text-base',
          selectedLetter === 'All' ? 'text-primary-9 bg-white' : 'bg-transparent text-white'
        )}
        onClick={() => handleFilterClick('All')}
      >
        All
      </button>

      {/* Alphabet buttons */}
      {alphabet.map((letter) => (
        <button
          type="button"
          key={letter}
          aria-label={`Filter by letter ${letter}`}
          className={getButtonClasses(letter, selectedLetter, lettersWithTerms.has(letter))}
          onClick={() => handleFilterClick(letter)}
          disabled={!lettersWithTerms.has(letter)}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
