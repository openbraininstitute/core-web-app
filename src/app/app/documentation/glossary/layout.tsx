'use client';

import GlossaryTableOfContent from '@/components/documentation/glossary/glossary-table-of-content';

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-row">
      <GlossaryTableOfContent />
      <div className="relative ml-54 w-full">{children}</div>
    </div>
  );
}
