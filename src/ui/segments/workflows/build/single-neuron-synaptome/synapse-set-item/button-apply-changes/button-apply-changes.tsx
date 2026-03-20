import { LoadingOutlined } from '@ant-design/icons';

import { ArrowSyncFilled } from '@/components/icons/buttons';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export interface ButtonApplyChangesProps {
  className?: string;
  isFormValid: boolean;
  visualizeLoading: boolean;
}

export function ButtonApplyChanges({
  className,
  isFormValid,
  visualizeLoading,
}: ButtonApplyChangesProps) {
  return (
    <div className={cn(className, 'z-30 mt-4 flex items-center justify-end')}>
      <Button
        type="submit"
        rounded
        disabled={!isFormValid || visualizeLoading}
        size="lg"
        variant="success"
        className="shadow-sm disabled:opacity-50"
      >
        <div className="flex items-center justify-center gap-3">
          <div>Apply changes</div>
          {visualizeLoading ? <LoadingOutlined /> : <ArrowSyncFilled className="size-5 text-lg" />}
        </div>
      </Button>
    </div>
  );
}
