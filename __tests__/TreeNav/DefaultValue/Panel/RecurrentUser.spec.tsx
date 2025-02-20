import { render, screen, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';

import { sectionAtom } from '@/state/application';
import { idAtom as brainModelConfigIdAtom } from '@/state/brain-model-config';
import BrainRegions from '@/components/build-section/BrainRegionSelector/BrainRegions';
import sessionAtom from '@/state/session';
import {
  previouslySelectedRegion,
  defaultIncreasedTimeout,
  regionContainerSelector,
} from '__tests__/__utils__/BrainRegionPanel/constants';

const HydrateAtoms = ({ initialValues, children }: any) => {
  useHydrateAtoms(initialValues);
  return children;
};

function TestProvider({ initialValues, children }: any) {
  return (
    <JotaiProvider>
      <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
    </JotaiProvider>
  );
}

global.ResizeObserver = class MockedResizeObserver {
  observe = jest.fn();

  unobserve = jest.fn();

  disconnect = jest.fn();
};

jest.mock('src/util/utils.ts', () => {
  const utils = jest.requireActual('src/util/utils.ts');
  return {
    ...utils,
    getInitializationValue: () => previouslySelectedRegion,
  };
});

window.HTMLElement.prototype.scrollIntoView = jest.fn();

const defaultRegion = 'Isocortex';

async function checkTreeExpandedFromSaved() {
  const selector = `div[data-tree-id] button > ${regionContainerSelector}`;
  await screen.findByText('Basic cell groups and regions', { selector });
  await screen.findByText('Brain stem', { selector });
  await screen.findByText('Cerebrum', { selector });
  await screen.findByText('Cerebellum', { selector });
  await screen.findByText('Cerebral cortex', { selector });
  await screen.findByText('Cortical plate', { selector });
  await screen.findByText(defaultRegion, { selector });
}

describe('Default brain region panel in explore', () => {
  beforeEach(async () => {
    await waitFor(() => render(Provider()));
  });

  test('show Isocortex in brain region tree', async () => {
    await screen.findByText(
      defaultRegion,
      {
        selector: `div[data-tree-id] button  > ${regionContainerSelector}`,
      },
      { timeout: defaultIncreasedTimeout }
    );
  });

  test('show expanded tree', checkTreeExpandedFromSaved);

  function Provider() {
    return (
      <TestProvider
        initialValues={[
          [sessionAtom, { accessToken: 'abc' }],
          [sectionAtom, 'explore'],
          [brainModelConfigIdAtom, '123'],
        ]}
      >
        <BrainRegions />
      </TestProvider>
    );
  }
});

describe('Default brain region panel in buid', () => {
  beforeEach(async () => {
    await waitFor(() => render(Provider()));
  });

  test('show expanded tree', checkTreeExpandedFromSaved);

  function Provider() {
    return (
      <TestProvider
        initialValues={[
          [sessionAtom, { accessToken: 'abc' }],
          [sectionAtom, 'build'],
          [brainModelConfigIdAtom, '123'],
        ]}
      >
        <BrainRegions />
      </TestProvider>
    );
  }
});
