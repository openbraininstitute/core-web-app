export default function SectionTabs({
    activeSection,
    setActiveSection
}:{
    activeSection: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
    setActiveSection: (section: 'overview' | 'provenance' | 'related-publications' | 'related-circuits') => void;
}) {

    const sections = [
        {
            name: 'Overview',
            id: 'overview'
        },
        {
            name: 'Provenance',
            id: 'provenance'
        },
        {
            name: 'Related Publications',
            id: 'related-publications'
        },
        {
            name: 'Related Circuits',
            id: 'related-circuits'
        }
    ]

    return (
        <div className="relative w-full grid grid-cols-4">
            {
                sections.map((section: {name: string; id: string}) => {
                    return (
                        <button
                            key={section.id}
                            className="w-full text-center text-xl transition-colors duration-300 ease-in-out py-4 text-primary-9"
                            style={{
                                fontWeight: activeSection === section.id ? 'bold' : 'normal',
                                background: activeSection === section.id ? 'white' : 'transparent',
                            }}
                            onClick={() => setActiveSection(section.id as 'overview' | 'provenance' | 'related-publications' | 'related-circuits')}
                            type="button"
                            aria-label={`Go to ${section.name} section`}
                            >
                                {section.name}
                        </button>
                    )
                })
            }
        </div>
    )
}