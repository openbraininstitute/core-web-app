import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AllSpeciesIcon,
  SpeciesIcon,
} from '@/features/brain-region-hierarchy/components/species-icon';
import { SPECIES_ICON_PATHS } from '@/features/brain-region-hierarchy/components/species-icon-paths';
import { SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';

describe('SpeciesIcon', () => {
  it('has a traced brain for every known species', () => {
    for (const taxonomyId of Object.values(SPECIES_TAXONOMY_IDS)) {
      expect(SPECIES_ICON_PATHS[taxonomyId], taxonomyId).toMatch(/^M[\d. CMZ]+Z$/);
    }
  });

  it('draws the species in the current text colour', () => {
    const { container } = render(
      <SpeciesIcon taxonomyId={SPECIES_TAXONOMY_IDS.MUS_MUSCULUS} className="text-gray-400" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg).toHaveClass('text-gray-400');
  });

  it('renders nothing for a species without a brain to draw', () => {
    const { container } = render(<SpeciesIcon taxonomyId="NCBITaxon:0" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws all species as four brains', () => {
    const { container } = render(<AllSpeciesIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(4);
    for (const path of paths) expect(path.getAttribute('d')).toMatch(/^M/);
  });
});
