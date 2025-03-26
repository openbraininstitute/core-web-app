import { SingleCircuitListView } from "../type";


const CIRCUIT_PLACHOLDER_DATA: SingleCircuitListView[] = [
    {
        key: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1",
        name: "Central subvolume",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Tincidunt vitae semper quis lectus nulla at. Volutpat ac tincidunt vitae semper. Adipiscing commodo elit at imperdiet dui accumsan",
        brainRegion: "Somatosensory cortex",
        specie: "Rat",
        numberOfNeurons: "211K",
        numberOfConnections: "82.6M",
        numberOfSynapses: "407M",
        files: [
            {
                type: "sonata",
                key: "sonataFile",
                url: "https://beq.ebooksgratuits.com/vents/Dumas_Le_comte_de_Monte_Cristo_1.pdf",
                isAvailable: false,
            },
            {
                type: "connectome utilities",
                key: "connectomeUtilitiesFile",
                url: "https://www.google",
                isAvailable: true,
            }
        ],
        provenance: {
            isASubcircuit: false,
            subcircuitOf: null
        },
        hasSubcircuits: true,
        subcircuits: [
            {
                key: "UID_circuit_excitatory_central_subvolume_somatosensory_cortex_N-1A",
                name: "Excitatory central subvolume",
                description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Tincidunt vitae semper quis lectus nulla at. Volutpat ac tincidunt vitae semper. Adipiscing commodo elit at imperdiet dui accumsan",
                brainRegion: "Somatosensory cortex",
                specie: "Rat",
                numberOfNeurons: "211K",
                numberOfConnections: "82.6M",
                numberOfSynapses: "407M",
                files: [
                    {
                        type: "sonata",
                        key: "sonataFile",
                        url: "https://beq.ebooksgratuits.com/vents/Dumas_Le_comte_de_Monte_Cristo_1.pdf",
                        isAvailable: false,
                    },
                    {
                        type: "connectome utilities",
                        key: "connectomeUtilitiesFile",
                        url: "https://www.google",
                        isAvailable: true,
                    }
                ],
                provenance: {
                    isASubcircuit: true,
                    subcircuitOf: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1"
                },
                hasSubcircuits: false,
                subcircuits: null,
                metadata: {
                    revision: 1,
                    createdBy: "James Isbister",
                    creationDate: "2023-05-12",
                    license: {
                        name: "Open",
                        url: "https://www.sciencedirect.com/journal/neuroscience/publish/open-access-options"
                    }
                },
                images: {
                    low: "/images/circuits/Somatosensory_cortex_preview_01.png",
                    normal: "/images/circuits/Somatosensory_cortex_preview_01.png",
                    high: "/images/circuits/Somatosensory_cortex_preview_01.png"
                }
            },
            {
                key: "UID_circuit_Inhibitory_central_subvolume_somatosensory_cortex_N-1B",
                name: "Inhibitory central subvolume",
                description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Tincidunt vitae semper quis lectus nulla at. Volutpat ac tincidunt vitae semper. Adipiscing commodo elit at imperdiet dui accumsan",
                brainRegion: "Somatosensory cortex",
                specie: "Rat",
                numberOfNeurons: "211K",
                numberOfConnections: "82.6M",
                numberOfSynapses: "407M",
                files: [
                    {
                        type: "sonata",
                        key: "sonataFile",
                        url: "https://beq.ebooksgratuits.com/vents/Dumas_Le_comte_de_Monte_Cristo_1.pdf",
                        isAvailable: false,
                    },
                    {
                        type: "connectome utilities",
                        key: "connectomeUtilitiesFile",
                        url: "https://www.google",
                        isAvailable: true,
                    }
                ],
                provenance: {
                    isASubcircuit: true,
                    subcircuitOf: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1"
                },
                hasSubcircuits: false,
                subcircuits: null,
                metadata: {
                    revision: 1,
                    createdBy: "James Isbister",
                    creationDate: "2023-05-12",
                    license: {
                        name: "Open",
                        url: "https://www.sciencedirect.com/journal/neuroscience/publish/open-access-options"
                    }
                },
                images: {
                    low: "/images/circuits/Somatosensory_cortex_preview_01.png",
                    normal: "/images/circuits/Somatosensory_cortex_preview_01.png",
                    high: "/images/circuits/Somatosensory_cortex_preview_01.png"
                }
            }
        ],
        metadata: {
            revision: 1,
            createdBy: "James Isbister",
            creationDate: "2023-05-12",
            license: {
                name: "Open",
                url: "https://www.sciencedirect.com/journal/neuroscience/publish/open-access-options"
            }
        },
        images: {
            low: "/images/circuits/Somatosensory_cortex_preview_01.png",
            normal: "/images/circuits/Somatosensory_cortex_preview_01.png",
            high: "/images/circuits/Somatosensory_cortex_preview_01.png"
        }
    },
    {
        key: "UID_circuit_central_subvolume_region-field-CA1_N-1",
        name: "Central CA1 Region Field",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Tincidunt vitae semper quis lectus nulla at. Volutpat ac tincidunt vitae semper. Adipiscing commodo elit at imperdiet dui accumsan",
        brainRegion: "Region Field CA1",
        specie: "Mouse",
        numberOfNeurons: "211K",
        numberOfConnections: "82.6M",
        numberOfSynapses: "407M",
        files: [
            {
                type: "sonata",
                key: "sonataFile",
                url: "https://beq.ebooksgratuits.com/vents/Dumas_Le_comte_de_Monte_Cristo_1.pdf",
                isAvailable: false,
            },
            {
                type: "connectome utilities",
                key: "connectomeUtilitiesFile",
                url: "https://www.google",
                isAvailable: true,
            }
        ],
        provenance: {
            isASubcircuit: false,
            subcircuitOf: null
        },
        hasSubcircuits: false,
        subcircuits: null,
        metadata: {
            revision: 1,
            createdBy: "James Isbister",
            creationDate: "2023-05-12",
            license: {
                name: "Open",
                url: "https://www.sciencedirect.com/journal/neuroscience/publish/open-access-options"
            }
        },
        images: {
            low: "/images/circuits/Somatosensory_cortex_preview_01.png",
            normal: "/images/circuits/Somatosensory_cortex_preview_01.png",
            high: "/images/circuits/Somatosensory_cortex_preview_01.png"
        }
    },
    {
        key: "UID_circuit_central_subvolume_cerebellum_N-1",
        name: "Cerbellum Central Subvolume",
        specie: "Mouse",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Tincidunt vitae semper quis lectus nulla at. Volutpat ac tincidunt vitae semper. Adipiscing commodo elit at imperdiet dui accumsan",
        brainRegion: "Cerebellum",
        numberOfNeurons: "211K",
        numberOfConnections: "82.6M",
        numberOfSynapses: "407M",
        files: [
            {
                type: "sonata",
                key: "sonataFile",
                url: "https://beq.ebooksgratuits.com/vents/Dumas_Le_comte_de_Monte_Cristo_1.pdf",
                isAvailable: false,
            },
            {
                type: "connectome utilities",
                key: "connectomeUtilitiesFile",
                url: "https://www.google",
                isAvailable: true,
            }
        ],
        provenance: {
            isASubcircuit: false,
            subcircuitOf: null
        },
        hasSubcircuits: false,
        subcircuits: null,
        metadata: {
            revision: 1,
            createdBy: "James Isbister",
            creationDate: "2023-05-12",
            license: {
                name: "Open",
                url: "https://www.sciencedirect.com/journal/neuroscience/publish/open-access-options"
            }
        },
        images: {
            low: "/images/circuits/Somatosensory_cortex_preview_01.png",
            normal: "/images/circuits/Somatosensory_cortex_preview_01.png",
            high: "/images/circuits/Somatosensory_cortex_preview_01.png"
        }
    }
]

export default CIRCUIT_PLACHOLDER_DATA;