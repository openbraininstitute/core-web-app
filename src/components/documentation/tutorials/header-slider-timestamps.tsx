import { StepProps } from '../type';
import { ChevronLeft, ChevronRight } from '@/components/icons';
import { classNames } from '@/util/utils';

export default function HeaderSliderTimestamps({
  content,
  handleNextStep,
  handlePreviousStep,
  activeSteps,
}: {
  content: StepProps[];
  handleNextStep: () => void;
  handlePreviousStep: () => void;
  activeSteps: { first: number; last: number };
}) {
  return (
    <header className="mt-4 mb-8 flex w-full flex-row items-center justify-between">
      <div className="flex w-full flex-row-reverse items-center justify-between gap-x-3">
        <div className="flex flex-row gap-x-3">
          {Array.from({ length: content.length }, (_, index) => (
            <div
              className={classNames(
                'h-1.5 w-6 rounded-full transition-colors duration-300',
                index >= activeSteps.first && index <= activeSteps.last
                  ? 'bg-white'
                  : 'bg-primary-6'
              )}
              key={index}
            />
          ))}
        </div>
        <div className="relative flex flex-row items-center gap-x-5">
          <button
            type="button"
            aria-label="Go to previous step"
            onClick={handlePreviousStep}
            disabled={activeSteps.first === 0}
          >
            <ChevronLeft className="h-4 w-auto" fill="white" />
          </button>

          <button
            type="button"
            aria-label="Go to next step"
            onClick={handleNextStep}
            disabled={activeSteps.last >= content.length - 1}
          >
            <ChevronRight className="h-4 w-auto" fill="white" />
          </button>
        </div>
      </div>
    </header>
  );
}
