'use client';

import { LoadingOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type {
  TBrowsePrerequisite,
  TBrowsePrerequisiteValue,
} from '@/ui/segments/workflows/browse/browse-config';

type WorkflowBrowsePrerequisiteProps = {
  prerequisite: TBrowsePrerequisite;
  value: TBrowsePrerequisiteValue | null;
  onSelect: (value: TBrowsePrerequisiteValue) => void;
  onContinue: () => void;
  /** the entities view is loading after confirm; keeps the picker on screen with feedback */
  pending?: boolean;
};

/**
 * phase 1 of an prerequisite browse step: renders the prerequisite picker for the configured
 * `presentation` and a continue action
 * the picker yields a {@link TBrowsePrerequisiteValue}
 * that downstream code (the loader) consumes; the prerequisite is never persisted for the time being
 * in the workflow session nor the schema configuration
 */
export function WorkflowBrowsePrerequisite({
  prerequisite,
  value,
  onSelect,
  onContinue,
  pending = false,
}: WorkflowBrowsePrerequisiteProps) {
  return (
    <div className="flex h-full min-h-0 flex-col [grid-area:body]">
      <div className="min-h-0 flex-1 overflow-hidden">
        {prerequisite.presentation.kind === 'custom' ? (
          <prerequisite.presentation.render value={value} onSelect={onSelect} />
        ) : (
          <div className="flex h-40 items-center justify-center text-gray-600">
            Unsupported prerequisite presentation: {prerequisite.presentation.kind}
          </div>
        )}
      </div>
      <div className="flex shrink-0 justify-end bg-background px-4 py-3">
        <Button
          rounded
          variant="default"
          disabled={!value || pending}
          className={cn(
            'h-12 min-w-64 px-10 text-lg font-bold shadow-skmp-s',
            'disabled:bg-neutral-2 disabled:text-neutral-4!'
          )}
          onClick={onContinue}
        >
          {pending ? (
            <>
              <LoadingOutlined /> Loading…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
