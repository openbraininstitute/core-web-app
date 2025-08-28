'use client';

import { PlusOutlined } from '@ant-design/icons';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';

export function ReportsHeader() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="max-w-1/2">
        <Button
          rounded
          variant="success"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          type="button"
          className="px-8"
        >
          <div className="flex items-center justify-between gap-5">
            <span>Open JupyterLab</span>
            <PlusOutlined className="ml-auto text-sm" />
          </div>
        </Button>
      </div>
    </div>
  );
}
