import { useAtomValue } from 'jotai';

import usePathname from '@/hooks/pathname';
import Link from '@/components/Link';
import { themeAtom, Theme } from '@/state/theme';
import { classNames } from '@/util/utils';

const COMMON_CLASSNAME = 'flex-auto text-center h-12 leading-[3rem] mr-px';

type Tab = {
  name: string;
  href: string;
  baseHref: string;
};

const tabs: Tab[] = [
  {
    name: 'Experiment Setup',
    href: '/app/experiment-designer/experiment-setup',
    baseHref: '/app/experiment-designer/experiment-setup',
  },
  {
    name: 'Sensory Input',
    href: '/app/experiment-designer/sensory-input',
    baseHref: '/app/experiment-designer/sensory-input',
  },
  {
    name: 'Stimulation Protocol',
    href: '/app/experiment-designer/stimulation-protocol',
    baseHref: '/app/experiment-designer/stimulation-protocol',
  },
  {
    name: 'Recording',
    href: '/app/experiment-designer/recording',
    baseHref: '/app/experiment-designer/recording',
  },
  {
    name: 'Imaging',
    href: '/app/experiment-designer/imaging',
    baseHref: '/app/experiment-designer/imaging',
  },
  {
    name: 'Analysis',
    href: '/app/experiment-designer/analysis',
    baseHref: '/app/experiment-designer/analysis',
  },
];

function getTabClassName(active: boolean, theme: Theme) {
  let className;

  if (theme === 'light') {
    className = active ? 'bg-primary-7 text-white' : 'bg-neutral-1 text-primary-7';
  } else {
    className = active ? 'bg-neutral-1 text-black' : 'bg-black text-neutral-1';
  }

  return classNames(COMMON_CLASSNAME, className);
}

export default function ExperimentDesignerTopTabs() {
  const theme = useAtomValue(themeAtom);
  const pathname = usePathname();

  return (
    <div className="flex">
      {/* TODO top navigation menu 2 */}
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={getTabClassName(!!pathname?.startsWith(tab.baseHref), theme)}
          preserveLocationSearchParams
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
}
