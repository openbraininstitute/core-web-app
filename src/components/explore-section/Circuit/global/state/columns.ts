import { atom } from 'jotai';

export type SingleColumnContent = {
  title: string;
  id: string;
  isActive: boolean;
  columnCustomizable: boolean;
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
    title: 'Scale',
    id: 'scale',
    isActive: true,
    columnCustomizable: true,
    filterType: 'select',
  },
  {
    title: '# Neurons',
    id: 'numberOfNeurons',
    isActive: true,
    columnCustomizable: true,
    filterType: 'numeric',
  },
  {
    title: '# Connections',
    id: 'numberOfConnections',
    isActive: true,
    columnCustomizable: true,
    filterType: 'numeric',
  },
  {
    title: '# Synapses',
    id: 'numberOfSynapses',
    isActive: true,
    columnCustomizable: true,
    filterType: 'numeric',
  },
  {
    title: 'Build category',
    id: 'buildCategory',
    isActive: true,
    columnCustomizable: true,
    filterType: 'select',
  },
  {
    title: 'Species',
    id: 'specie',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
  },
  {
    title: 'Name',
    id: 'name',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
  },
  {
    title: 'Subcircuits',
    id: 'subcircuits',
    isActive: true,
    columnCustomizable: false,
    filterType: null,
  },
  {
    title: 'Description',
    id: 'description',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
  },
  {
    title: 'Brain region',
    id: 'brainRegion',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
  },
  {
    title: 'Published In',
    id: 'publishedIn',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
  },
  {
    title: 'Registration date',
    id: 'registrationDate',
    isActive: true,
    columnCustomizable: true,
    filterType: null,
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
