import { atom } from 'jotai';

export type SingleColumnContent = {
  title: string;
  id: string;
  isActive: boolean;
  filterType: 'text' | 'numeric' | 'select' | 'boolean' | 'date' | null;
};

export type FilterConfig = {
  property: string;
  type?: string;
  min?: number | string;
  max?: number | string;
};

export const CIRCUITS_COLUMNS: SingleColumnContent[] = [
  {
    title: 'Name',
    id: 'name',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Subcircuits',
    id: 'subcircuits',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Description',
    id: 'description',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Brain region',
    id: 'brainRegion',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Scale',
    id: 'scale',
    isActive: true,
    filterType: 'select',
  },
  {
    title: '# Neurons',
    id: 'numberOfNeurons',
    isActive: true,
    filterType: 'numeric',
  },
  {
    title: '# Connections',
    id: 'numberOfConnections',
    isActive: true,
    filterType: 'numeric',
  },
  {
    title: '# Synapses',
    id: 'numberOfSynapses',
    isActive: true,
    filterType: 'numeric',
  },
  {
    title: 'Species',
    id: 'specie',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Published In',
    id: 'publishedIn',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Registration date',
    id: 'registrationDate',
    isActive: true,
    filterType: null,
  },
  {
    title: 'Build category',
    id: 'buildCategory',
    isActive: true,
    filterType: 'select',
  },
];

export const columnsAtom = atom<SingleColumnContent[]>(CIRCUITS_COLUMNS);

export const toggleColumnAtom = atom(null, (get, set, columnId: string) => {
  const columns = get(columnsAtom);
  const updatedColumns = columns.map((column) =>
    column.id === columnId ? { ...column, isActive: !column.isActive } : column
  );
  set(columnsAtom, updatedColumns);
});

export const activeColumnsCountAtom = atom(
  (get) => get(columnsAtom).filter((column) => column.isActive).length
);

export const filtersAtom = atom<Record<string, FilterConfig | null>>({});

export const setFilterAtom = atom(
  null,
  (get, set, update: { columnId: string; filter: FilterConfig | null }) => {
    const currentFilters = get(filtersAtom);
    set(filtersAtom, { ...currentFilters, [update.columnId]: update.filter });
  }
);
