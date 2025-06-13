import { Sections } from '@/types/public-projects';

export default function NavigationSections({
  section,
  updateSection,
}: {
  section: string;
  updateSection: (section: Sections) => void;
}) {
  const SHOWCASE_TABS: Sections[] = ['description', 'artifacts', 'notebooks'];

  const handleTabChange = (tab: string) => {
    updateSection(tab as Sections);
  };

  return (
    <nav className="flex w-full flex-row">
      {SHOWCASE_TABS.map((tab: string) => (
        <button
          type="button"
          key={`Tab-${tab}`}
          className="text-primary-9 flex w-44 items-center justify-center py-3 text-lg font-semibold tracking-wider uppercase"
          onClick={() => handleTabChange(tab)}
          style={{
            background: section === tab ? '#fff' : 'transparent',
            color: section === tab ? '#002766' : 'white',
          }}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
