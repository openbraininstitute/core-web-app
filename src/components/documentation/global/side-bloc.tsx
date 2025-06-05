import DOCUMENTATION_ARCHITECTURE from '../CONTENT/ARCHITECTURE';
import { SingleSectionProps } from '../type';
import NavItem from './nav-item';
import TutorialNavList from './tutorial-nav-list';

import LogoAsLink from '@/components/logo/as-link';

export default function DocumentationSideBloc() {
  return (
    <nav className="w-full text-white">
      <LogoAsLink />
      <div className="mb-2 mt-16 text-xl font-bold text-primary-3">Documentation</div>
      <div className="relative flex w-full flex-col gap-y-3">
        {DOCUMENTATION_ARCHITECTURE.map((item: SingleSectionProps) => {
          return <NavItem content={item} key={item.slug} />;
        })}
      </div>
      <TutorialNavList />
    </nav>
  );
}
