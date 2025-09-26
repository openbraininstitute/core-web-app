import type { ServerSideComponentProp } from '@/types/common';

type Props = ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null> & {
  children: React.ReactNode;
};

export default function OBIShowcaseLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
