
export type SingleCircuitListView = {
    key: string;
    name: string;
    description: string;
    brainRegion: string;
    specie: string;
    numberOfNeurons: number;
    createdBy: string;
    creationDate: string;
    hasSubcircuits: boolean;
    subcircuits?: SingleCircuitListView[];
}

const CIRCUIT_PLACHOLDER_DATA: SingleCircuitListView[] = [
    {
        key: "UID_Circuit_Central_subvolume_Somatosensory_cortex_N-1",
        name: "Central subvolume",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ti...",
        brainRegion: "Somatosensory cortex",
        specie: "Rat",
        numberOfNeurons: 1000,
        createdBy: "James Isbister",
        creationDate: "2023-05-12",
        hasSubcircuits: true,
        subcircuits: [
            {
                key: "UID_circuit_excitatory_central_subvolume_somatosensory_cortex_N-1A",
                name: "Excitatory central subvolume",
                description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ti...",
                brainRegion: "Somatosensory cortex",
                specie: "Rat",
                numberOfNeurons: 1000,
                createdBy: "James Isbister",
                creationDate: "2023-05-12",
                hasSubcircuits: false
            },
            {
                key: "UID_circuit_Inhibitory_central_subvolume_somatosensory_cortex_N-1B",
                name: "Inhibitory central subvolume",
                description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ti...",
                brainRegion: "Somatosensory cortex",
                specie: "Rat",
                numberOfNeurons: 1000,
                createdBy: "James Isbister",
                creationDate: "2023-05-12",
                hasSubcircuits: false
            }
        ]
    },
    {
        key: "UID_circuit_central_subvolume_region-field-CA1_N-1",
        name: "Central CA1 Region Field",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ti...",
        brainRegion: "Region Field CA1",
        specie: "Mouse",
        numberOfNeurons: 1000,
        createdBy: "James Isbister",
        creationDate: "2023-05-12",
        hasSubcircuits: false
    },
    {
        key: "UID_circuit_central_subvolume_cerebellum_N-1",
        name: "Cerbellum Central Subvolume",
        specie: "Mouse",
        description: "Nunc mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Ti...",
        brainRegion: "Cerebellum",
        numberOfNeurons: 1000,
        createdBy: "James Isbister",
        creationDate: "2023-05-12",
        hasSubcircuits: false
    }
]

export default CIRCUIT_PLACHOLDER_DATA;