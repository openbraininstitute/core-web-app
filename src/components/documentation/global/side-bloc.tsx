import { useDocumentationArchitecture } from '../CONTENT/architecture-content';
import { SingleSectionProps } from '../type';
import NavItem from './nav-item';
import TutorialNavList from './tutorial-nav-list';

import LogoAsLink from '@/components/logo/as-link';

export default function DocumentationSideBloc() {
  const architectureData = useDocumentationArchitecture();

  return (
    <nav className="w-full text-white">
      <LogoAsLink />
      <div className="mb-2 mt-16 text-xl font-bold text-primary-3">Documentation</div>
      <div className="relative flex w-full flex-col gap-y-3">
        {architectureData.map((item: SingleSectionProps) => {
          return <NavItem content={item} key={item.slug} allContent={architectureData} />;
        })}
      </div>
      <TutorialNavList />
    </nav>
  );
}
