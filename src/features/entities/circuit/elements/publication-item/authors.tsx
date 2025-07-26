import { Button } from 'antd';
import Popover from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { Person } from '@/components/icons/EditorIcons';

import type { Author } from '@/api/entitycore/types/entities/publication';

interface Props {
  authors: Array<Author>;
  className?: string;
  maxVisible?: number;
}

export function Authors({ authors, className, maxVisible = 3 }: Props) {
  const visibleAuthors = authors.slice(0, maxVisible);
  const hiddenAuthors = authors.slice(maxVisible);
  const hasHiddenAuthors = hiddenAuthors.length > 0;

  return (
    <div className={`text-paper-author flex items-center gap-2 text-sm ${className || ''}`}>
      <div className="border-neutral-2 flex items-center justify-center rounded-full border p-1">
        <Person className="text-primary-8" />
      </div>
      <span>
        {visibleAuthors.map((author, index) => (
          <span key={author.given_name + author.family_name || index}>
            {author.given_name} {author.family_name}
            {index < visibleAuthors.length - 1 && ', '}
          </span>
        ))}
        {hasHiddenAuthors && (
          <>
            {', '}
            <Popover
              message={authors.map((author, index) => (
                <div
                  key={author.given_name + author.family_name || index}
                  className="hover:bg-muted rounded px-2 py-1 text-sm"
                >
                  {author.given_name} {author.family_name}
                </div>
              ))}
            >
              <Button className="text-paper-link hover:text-paper-hover h-auto p-0 font-normal underline">
                +{hiddenAuthors.length} more
              </Button>
            </Popover>
          </>
        )}
      </span>
    </div>
  );
}
