export const ENTITY_CORE_DATA_TYPES = {
    RECONSTRUCTION_MORPHOLOGY: {
        type: "reconstruction-morphology",
        assetExtension: "application/swc",
    },
    EXPERIMENTAL_BOUTON_DENSITY: {
        type: "experimental-bouton-density",
        assetExtension: "application/json",
    },
    EXPERIMENTAL_NEURON_DENSITY: {
        type: "experimental-neuron-density",
        assetExtension: "application/json",
    },
    EXPERIMENTAL_SYNAPSES_PER_CONNECTION: {
        type: "experimental-synapses-per-connection",
        assetExtension: "application/json",
    },
    MESH: {
        type: "mesh",
        assetExtension: "application/json",
    },
    EMODEL: {
        type: "emodel",
        assetExtension: "application/json",
    },
    SINGLE_CELL_EXPERIMENTAL_TRACE: {
        type: "single-cell-experimental-trace",
        assetExtension: "application/json",
    },
} as const;


