'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildWorkspaceSwitchUrl } from '@/utils/workspace-switch-url';

type Props = {
  targetVirtualLabId: string;
  targetProjectId: string;
  onNavigate?: () => void;
};

/**
 * Footer link of the workspace manager modal: navigates to the target
 * vlab/project while keeping the user on the equivalent page (data,
 * workflows, notebooks, reports) when feasible.
 */
export function GoToProjectLink({ targetVirtualLabId, targetProjectId, onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = buildWorkspaceSwitchUrl({
    pathname,
    searchParams: searchParams.toString(),
    targetVirtualLabId,
    targetProjectId,
  });

  return (
    <Button
      asChild
      variant="default"
      rounded
      size="responsive"
      className={cn(
        'bg-primary-9 mt-4 flex h-11 w-full shrink-0',
        'justify-between px-5 text-base shadow-none hover:bg-primary-9/90'
      )}
    >
      <Link
        className="text-inherit flex w-full items-center justify-between gap-2"
        href={href}
        data-testid="workspace-manager-go-to-project-link"
        id="workspace-manager-go-to-project-link"
        onClick={onNavigate}
      >
        Go to project <RightOutlined />
      </Link>
    </Button>
  );
}
