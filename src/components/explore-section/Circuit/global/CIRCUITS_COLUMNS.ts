export type SingleColumnContent = {
  title: string;
  id: string;
  isActive: boolean;
};

const CIRCUITS_COLUMNS: SingleColumnContent[] = [
  {
    title: 'Name',
    id: 'name',
    isActive: true,
  },
  {
    title: 'Subcircuits',
    id: 'subcircuits',
    isActive: true,
  },
  {
    title: 'Description',
    id: 'description',
    isActive: true,
  },
  {
    title: 'Brain region',
    id: 'brainRegion',
    isActive: true,
  },
  {
    title: 'Scale',
    id: 'scale',
    isActive: true,
  },
  {
    title: '# Neurons',
    id: 'numberOfNeurons',
    isActive: true,
  },
  {
    title: '# Connections',
    id: 'numberOfConnections',
    isActive: true,
  },
  {
    title: '# Synapses',
    id: 'numberOfSynapses',
    isActive: true,
  },
  {
    title: 'Species',
    id: 'specie',
    isActive: true,
  },
  {
    title: 'Published In',
    id: 'publishedIn',
    isActive: true,
  },
  {
    title: 'Registration date',
    id: 'registrationDate',
    isActive: true,
  },
  {
    title: 'Build category',
    id: 'buildCategory',
    isActive: true,
  },
];

export default CIRCUITS_COLUMNS;
