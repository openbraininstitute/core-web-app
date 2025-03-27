export default function Subtabs({
  activeSection,
  setActiveSection,
}: {
  activeSection: 'Literature' | 'Related Artifacts';
  setActiveSection: (section: 'Literature' | 'Related Artifacts') => void;
}) {
  return (
    <div className="relative mb-12 grid w-full grid-cols-2 border border-solid border-gray-400">
      <button
        className="py-4 text-center text-xl capitalize"
        style={{
          backgroundColor: activeSection === 'Literature' ? '#003A8C' : 'white',
          color: activeSection === 'Literature' ? 'white' : 'black',
          fontWeight: activeSection === 'Literature' ? 'bold' : 'normal',
          borderLeft: '1px solid #9ca3af',
        }}
        onClick={() => setActiveSection('Literature')}
        type="button"
        aria-label="Go to literature section"
      >
        Literature
      </button>
      <button
        className="py-4 text-center text-xl capitalize"
        style={{
          backgroundColor: activeSection === 'Related Artifacts' ? '#003A8C' : 'white',
          color: activeSection === 'Related Artifacts' ? 'white' : 'black',
          fontWeight: activeSection === 'Related Artifacts' ? 'bold' : 'normal',
          borderLeft: '1px solid #9ca3af',
        }}
        onClick={() => setActiveSection('Related Artifacts')}
        type="button"
        aria-label="Go to related artifacts section"
      >
        Related Artifacts
      </button>
    </div>
  );
}
