import { Button } from 'antd';
import type { Author } from '@/api/entitycore/types/entities/publication';
import { Person } from '@/components/icons/EditorIcons';
import Popover from '@/features/entities/neuron-simulation/experiment/elements/popover';

interface Props {
  authors: Author[];
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
      <div className="flex items-center justify-center gap-2">
        {visibleAuthors.map((author, index) => (
          <span key={author.given_name + author.family_name || index}>
            {author.given_name} {author.family_name}
            {index < visibleAuthors.length - 1 && ', '}
          </span>
        ))}
        {hasHiddenAuthors && (
          <Popover
            cls={{ contentContainer: 'p-0!' }}
            content={
              <div className="primary-scrollbar max-h-[200px] overflow-auto px-2 py-4 text-white">
                {' '}
                {authors.map((author, index) => (
                  <div
                    key={author.given_name + author.family_name || index}
                    className="hover:bg-muted rounded px-2 py-1 text-sm"
                  >
                    {author.given_name} {author.family_name}
                  </div>
                ))}
              </div>
            }
          >
            <Button
              type="text"
              className="text-paper-link hover:text-paper-hover h-auto p-0 font-normal underline"
            >
              + {hiddenAuthors.length} more
            </Button>
          </Popover>
        )}
      </div>
    </div>
  );
}
