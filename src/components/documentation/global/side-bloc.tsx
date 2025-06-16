import { useDocumentationArchitecture } from '../content/architecture-content';
import { SingleSectionProps } from '../type';
import NavItem from './nav-item';
import TutorialNavList from './tutorial-nav-list';

export default function DocumentationSideBloc() {
  const architectureData = useDocumentationArchitecture();

  return (
    <nav className="w-full text-white">
      <header className="mb-4 flex flex-col">
        <div className="text-primary-3 mb-2 text-xl font-bold">Documentation</div>
      </header>
      <div className="relative flex w-full flex-col gap-y-3">
        {architectureData.map((item: SingleSectionProps) => {
          return <NavItem content={item} key={item.slug} allContent={architectureData} />;
        })}
      </div>
      <TutorialNavList />
    </nav>
  );
}
