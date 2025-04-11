import { ArrowRightOutlined } from '@ant-design/icons';

import Link from '@/components/Link';
import { INTERACTIVE_PATH } from '@/constants/explore-section/paths';

type Props = {
  href?: string;
  prefetch?: boolean;
};

export default function BackToInteractiveExplorationBtn({
  href = INTERACTIVE_PATH,
  prefetch = true,
}: Props) {
  return (
    <Link
      className="bg-neutral-1 text-primary-8 flex h-full w-[40px] shrink-0 flex-col items-center pt-2 text-sm"
      href={href}
      prefetch={prefetch}
    >
      <ArrowRightOutlined className="mt-1.5 mb-4 rotate-180" />
      <div style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>
        Back to interactive exploration
      </div>
    </Link>
  );
}
