import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { speciesAtlasCardTestId } from '@/features/brain-atlas-viewer/all-species/helpers';
import {
  SpeciesSelector,
  speciesOptionTestId,
} from '@/features/brain-region-hierarchy/components/species-selector';

import type {
  IHierarchyWithSpecies,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

const mouseSpecies: IWorkspaceSpecies = {
  id: 's-mouse',
  name: 'Mus musculus',
  taxonomyId: 'NCBITaxon:10090',
  hierarchId: 'h-mouse',
  displayName: 'Mouse',
};
const humanSpecies: IWorkspaceSpecies = {
  id: 's-human',
  name: 'Homo sapiens',
  taxonomyId: 'NCBITaxon:9606',
  hierarchId: 'h-human',
  displayName: 'Human',
};
const available: IHierarchyWithSpecies[] = [
  { id: 'h-mouse', name: 'Mouse hierarchy', species: mouseSpecies },
  { id: 'h-human', name: 'Human hierarchy', species: humanSpecies },
];

function renderSelector(overrides: Partial<Parameters<typeof SpeciesSelector>[0]> = {}) {
  const onSpeciesChange = vi.fn();
  const utils = render(
    <SpeciesSelector
      displaySpecies={mouseSpecies}
      workspaceHierarchyId="h-mouse"
      isAllMode={false}
      isLoading={false}
      allowAllSpecies
      remoteAvailableHierarchies={available}
      onSpeciesChange={onSpeciesChange}
      {...overrides}
    />
  );
  return { ...utils, onSpeciesChange };
}

describe('SpeciesSelector (species view)', () => {
  it('shows a loading skeleton instead of a species while it is loading', () => {
    // This is the stuck-panel symptom: an empty grey pill rather than a species name.
    const { container } = renderSelector({ isLoading: true });

    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByText('Mouse')).not.toBeInTheDocument();
  });

  it('shows the selected species name once it has loaded', () => {
    renderSelector({ displaySpecies: mouseSpecies, isLoading: false });

    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getAllByText('Mouse').length).toBeGreaterThan(0);
  });

  it('renders nothing when there are no species/hierarchies to choose from', () => {
    const { container } = renderSelector({ remoteAvailableHierarchies: [], isLoading: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('labels the selector "All" when in all-species mode', () => {
    renderSelector({ isAllMode: true, displaySpecies: null });

    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
  });
});

describe('species test ids', () => {
  it('keys a dropdown option on the scientific name', () => {
    expect(speciesOptionTestId('Homo sapiens')).toBe('species-selector-option__homo-sapiens');
    expect(speciesOptionTestId('Drosophila melanogaster')).toBe(
      'species-selector-option__drosophila-melanogaster'
    );
    expect(speciesOptionTestId('Hybrid human-mouse')).toBe(
      'species-selector-option__hybrid-human-mouse'
    );
  });

  it('gives every species card its own id, under one countable prefix', () => {
    const ids = ['Homo sapiens', 'Mus musculus', 'Loligo pealeii'].map(speciesAtlasCardTestId);

    expect(ids).toEqual([
      'all-species-atlas-card__homo-sapiens',
      'all-species-atlas-card__mus-musculus',
      'all-species-atlas-card__loligo-pealeii',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('all-species-atlas-card__'))).toBe(true);
  });
});
