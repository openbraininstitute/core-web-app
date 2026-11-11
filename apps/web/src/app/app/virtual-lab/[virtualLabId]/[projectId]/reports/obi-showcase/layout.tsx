import type { ServerSideComponentProp } from '@/types/common';

type Props = ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null> & {
  children: React.ReactNode;
};

export default function OBIShowcaseLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
