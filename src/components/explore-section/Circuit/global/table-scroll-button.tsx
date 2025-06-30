import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

export default function TableScrollButton({
  scrollToEnd,
  isAtEnd,
  scrollToStart,
  isAtStart,
}: {
  scrollToEnd: () => void;
  isAtEnd: boolean;
  scrollToStart: () => void;
  isAtStart: boolean;
}) {
  return (
    <div className="flex w-full flex-row justify-between">
      <button
        type="button"
        arial-label="Scroll to start"
        className={classNames(
          'flex h-12 w-12 items-center justify-center transition-all duration-300 ease-in-out',
          isAtStart
            ? 'cursor-not-allowed text-gray-500 opacity-50'
            : 'text-primary-9 cursor-pointer hover:bg-gray-200'
        )}
        id="scrollToStartButton"
        onClick={scrollToStart}
        disabled={isAtStart}
      >
        <ArrowLeftIcon className="h-3 w-auto" />
      </button>
      <button
        type="button"
        arial-label="Scroll to end"
        className={classNames(
          'flex h-12 w-12 items-center justify-center transition-all duration-300 ease-in-out',
          isAtEnd
            ? 'cursor-not-allowed text-gray-500 opacity-50'
            : 'text-primary-9 cursor-pointer hover:bg-gray-200'
        )}
        id="scrollToEndButton"
        onClick={scrollToEnd}
        disabled={isAtEnd}
      >
        <ArrowRightIcon className="h-3 w-auto" />
      </button>
    </div>
  );
}
