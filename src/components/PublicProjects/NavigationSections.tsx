import { usePathname, useRouter } from 'next/navigation';

export default function NavigationSections({
  activeSection,
  setActiveSection,
}: {
  activeSection: string;
  setActiveSection: (section: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const SHOWCASE_TABS: string[] = ['description', 'artifacts', 'notebooks'];

  const handleTabChange = (tab: string) => {
    setActiveSection(tab);

    const params = new URLSearchParams(window.location.search);
    params.set('section', tab); // Add or update query param

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <nav className="flex w-full flex-row">
      {SHOWCASE_TABS.map((tab: string) => (
        <button
          type="button"
          key={`Tab-${tab}`}
          className="flex w-44 items-center justify-center py-3 text-lg font-semibold uppercase tracking-wider text-primary-9"
          onClick={() => handleTabChange(tab)}
          style={{
            background: activeSection === tab ? '#fff' : 'transparent',
            color: activeSection === tab ? '#002766' : 'white',
          }}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
