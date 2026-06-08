'use client';

import { InboxOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { Button } from '@/ui/molecules/button';

type Props = {
  group: string;
  capitalizedGroup: string | undefined;
  workflowsHref: string;
  showWorkflowsLink: boolean;
};

export function QuickAccessEmptyState({
  group,
  capitalizedGroup,
  workflowsHref,
  showWorkflowsLink,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="flex items-center justify-center size-20 rounded-full bg-primary-8 mb-6">
        <InboxOutlined className="text-white! text-3xl" />
      </div>
      <h2 className="text-primary-8 text-xl font-semibold mb-2">
        No {capitalizedGroup?.toLowerCase() ?? group} examples yet
      </h2>
      <p className="text-neutral-4 text-sm max-w-md leading-relaxed">
        Curated {group} examples for quick access will appear here once they become available. Check
        back soon or explore other categories.
      </p>
      {showWorkflowsLink && (
        <Button
          asChild
          rounded
          size="responsive"
          variant="outline"
          className="mt-6 px-4 py-4 bg-background shadow-none hover:font-bold hover:bg-white hover:shadow-md"
        >
          <Link href={workflowsHref} className="text-primary-8 hover:text-primary-9 text-base!">
            View all Workflows
          </Link>
        </Button>
      )}
    </div>
  );
}
