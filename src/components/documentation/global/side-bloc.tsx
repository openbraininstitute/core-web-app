import DOCUMENTATION_ARCHITECTURE from '../CONTENT/ARCHITECTURE';
import { SingleSectionProps } from '../type';
import NavItem from './nav-item';
import TutorialNavList from './tutorial-nav-list';

import LogoAsLink from '@/components/logo/as-link';

export default function DocumentationSideBloc() {
  return (
    <nav className="w-full text-white">
      <LogoAsLink />
      <div className="relative mt-10 flex w-full flex-col gap-y-3">
        {DOCUMENTATION_ARCHITECTURE.map((item: SingleSectionProps) => {
          return <NavItem content={item} key={item.slug} />;
        })}
      </div>
      <TutorialNavList />
    </nav>
  );
}
