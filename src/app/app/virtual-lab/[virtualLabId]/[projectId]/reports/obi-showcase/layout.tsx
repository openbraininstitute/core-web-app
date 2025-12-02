import type { ServerSideLayoutProp } from '@/types/common';

type Props = ServerSideLayoutProp<{ virtualLabId: string; projectId: string }> & {
  children: React.ReactNode;
};

export default function OBIShowcaseLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}
