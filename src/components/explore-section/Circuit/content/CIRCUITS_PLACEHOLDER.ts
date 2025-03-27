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
            subcircuitOf: null,
            literature: [
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Related artifacts provenance"
                },
            ]
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
                    subcircuitOf: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1",
                    literature: [
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Circuit provenance"
                        },
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Related artifacts provenance"
                        },
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Related artifacts provenance"
                        },
                    ]
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
                },
                overview: {
                    cellStatistics: [
                        {
                            src: "/images/circuits/circuit_overview_cellStatistics.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        }
                    ],
                    networkStatistics: [
                        {
                            src: "/images/circuits/circuit_overview_networkStatistics-01.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        },
                        {
                            src: "/images/circuits/circuit_overview_networkStatistics-02.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        }
                    ]
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
                    subcircuitOf: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1",
                    literature: [
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Circuit provenance"
                        },
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Related artifacts provenance"
                        },
                        {
                            title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                            type: "journal",
                            authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                            link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                            doi: "10.1016/s0387-7604(97)00068-5",
                            publicationDate: "1997-11-19",
                            abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                            category: "Circuit provenance"
                        },
                    ]
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
                },
                overview: {
                    cellStatistics: [
                        {
                            src: "/images/circuits/circuit_overview_cellStatistics.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        }
                    ],
                    networkStatistics: [
                        {
                            src: "/images/circuits/circuit_overview_networkStatistics-01.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        },
                        {
                            src: "/images/circuits/circuit_overview_networkStatistics-02.jpg",
                            alt: "Cell statistics",
                            width: 1920,
                            height: 1080
                        }
                    ]
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
        },
        overview: {
            cellStatistics: [
                {
                    src: "/images/circuits/circuit_overview_cellStatistics.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ],
            networkStatistics: [
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-01.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                },
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-02.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ]
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
            subcircuitOf: null,
            literature: [
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    type: "journal",
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    type: "journal",
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Related artifacts provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    type: "journal",
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Related artifacts provenance"
                },
            ]
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
        },
        overview: {
            cellStatistics: [
                {
                    src: "/images/circuits/circuit_overview_cellStatistics.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ],
            networkStatistics: [
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-01.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                },
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-02.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ]
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
            subcircuitOf: null,
            literature: [
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
                {
                    title: "Early detection of axonal and neuronal lesions in prenatal-onset periventricular leukomalacia",
                    type: "journal",
                    authors: ["S Z Meng", "Y Arai, K Deguchi", "S Takashima"],
                    link: "https://pubmed.ncbi.nlm.nih.gov/9408595/",
                    doi: "10.1016/s0387-7604(97)00068-5",
                    publicationDate: "1997-11-19",
                    abstract: "The expression of beta-amyloid precursor protein (beta-APP) immunoreactivity was investigated in 16 cases of prenatal-onset periventricular leukomalacia (PVL). beta-APP positive axons were found in the early stage of prenatal PVL, which included coagulation necrosis, microglial activation, axonal swelling or astrogliosis, but were not detectable in the late stage of prenatal PVL. Furthermore, beta-APP immunoreactive neurons were also observed in the fifth layer of pyramidal neurons of the cerebral cortex, corresponding to the beta-APP positive axons in PVL. Thus, beta-APP is detected as an early sign of axonal and neuronal lesions in prenatal-onset PVL, and neuronal beta-APP in the cerebral cortex may function to repair cell damage. In addition, prenatal PVL occurred at various stages before birth.",
                    category: "Circuit provenance"
                },
            ]
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
        },
        overview: {
            cellStatistics: [
                {
                    src: "/images/circuits/circuit_overview_cellStatistics.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ],
            networkStatistics: [
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-01.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                },
                {
                    src: "/images/circuits/circuit_overview_networkStatistics-02.jpg",
                    alt: "Cell statistics",
                    width: 1920,
                    height: 1080
                }
            ]
        }
    }
]

export default CIRCUIT_PLACHOLDER_DATA;