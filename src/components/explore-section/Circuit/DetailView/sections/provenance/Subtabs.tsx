export default function Subtabs({
    activeSection,
    setActiveSection,
}:{
    activeSection: "Literature" | "Related Artifacts",
    setActiveSection: (section: "Literature" | "Related Artifacts") => void
}) {

    return (
        <div className="relative w-full grid grid-cols-2 border border-solid border-gray-400 mb-12">
            <button
                className="text-xl text-center py-4 capitalize"
                style={{
                    backgroundColor: activeSection === "Literature" ? "#003A8C" : "white",
                    color: activeSection === "Literature" ? "white" : "black",
                    fontWeight: activeSection === "Literature" ? "bold" : "normal",
                    borderLeft: "1px solid #9ca3af",
                }}
                onClick={() => setActiveSection("Literature")}
            >
                Literature
            </button>
            <button
                className="text-xl text-center py-4 capitalize"
                style={{
                    backgroundColor: activeSection === "Related Artifacts" ? "#003A8C" : "white",
                    color: activeSection === "Related Artifacts" ? "white" : "black",
                    fontWeight: activeSection === "Related Artifacts" ? "bold" : "normal",
                    borderLeft: "1px solid #9ca3af",
                }}
                onClick={() => setActiveSection("Related Artifacts")}
            >
                Related Artifacts
            </button>
        </div>
    )
}