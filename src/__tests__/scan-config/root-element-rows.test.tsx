import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { RootElement } from '@/features/scan-config/components/root-element';
import { expandedRootElementsAtom } from '@/state/config-highlights';

import type {
  Config,
  ConfigSchema,
  IBlockDictionary,
  IBlockSingle,
  IRootBlockUnion,
} from '@/features/scan-config/types';

// What a click on a row of the blocks' list does to what is picked and to the form.
//
// A block with a form of its own (a single block, the info block, a union) is picked and its
// form opened; clicked again while that form is showing, it is put away and nothing stays picked.
//
// A block dictionary's row only opens and shuts it. Opened, it leaves the block picked and its
// form alone. Shut, it folds the form away where the form is one of its own, and then nothing
// stays picked; another block's form stays, and that block picked.

const INFO = { title: 'Info', ui_element: 'block_info', properties: {} } as unknown as IBlockSingle;
const INITIALIZE = {
  title: 'Initialization',
  ui_element: 'block_single',
  properties: {},
} as unknown as IBlockSingle;
const MODEL = {
  title: 'Model',
  ui_element: 'block_union',
  oneOf: [],
} as unknown as IRootBlockUnion;
const STIMULI = {
  title: 'Stimuli',
  ui_element: 'block_dictionary',
  singular_name: 'Stimulus',
  reference_types: [],
  additionalProperties: { oneOf: [] },
} as unknown as IBlockDictionary;

const ROOTS = { info: INFO, initialize: INITIALIZE, model_type: MODEL, stimuli: STIMULI };
const SCHEMA = { properties: ROOTS } as unknown as ConfigSchema;
const CONFIG: Config = {
  info: {},
  initialize: {},
  model_type: {},
  stimuli: { Step: { type: 'Clamp' } },
};

/** Renders one row of the list and clicks it. */
function click(
  rootElement: keyof typeof ROOTS,
  {
    selectedRootElement,
    selectedEntry = '',
    formShown = false,
    open = false,
  }: { selectedRootElement: string; selectedEntry?: string; formShown?: boolean; open?: boolean }
) {
  const store = createStore();
  store.set(expandedRootElementsAtom, new Set(open ? [rootElement] : []));
  const setters = {
    setSelectedRootElement: vi.fn(),
    setSelectedEntry: vi.fn(),
    setEditing: vi.fn(),
  };
  render(
    <Provider store={store}>
      <RootElement
        schema={SCHEMA}
        rootElement={rootElement}
        rootElementSchema={ROOTS[rootElement]}
        selectedRootElement={selectedRootElement}
        config={CONFIG}
        setConfig={vi.fn()}
        campaignId=""
        loading={false}
        errors={null}
        selectedEntry={selectedEntry}
        allEntries={new Set(['Step'])}
        newKey=""
        setNewKey={vi.fn()}
        isEditingKey={false}
        setIsEditingKey={vi.fn()}
        selectedMechanismsTab=""
        setSelectedMechanismsTab={vi.fn()}
        formShown={formShown}
        {...setters}
      />
    </Provider>
  );
  fireEvent.click(screen.getByTestId(`scan-config-root-element-${rootElement}`));
  return { ...setters, isOpen: () => store.get(expandedRootElementsAtom).has(rootElement) };
}

describe('a block with a form of its own, in the list', () => {
  it('is picked and its form opened on a click', () => {
    const row = click('initialize', { selectedRootElement: 'info', formShown: true });
    expect(row.setSelectedRootElement).toHaveBeenCalledWith('initialize');
    expect(row.setSelectedEntry).toHaveBeenCalledWith('');
    expect(row.setEditing).toHaveBeenCalledWith(true);
  });

  it.each([
    'info',
    'initialize',
    'model_type',
  ] as const)('is put away on a second click while its form is showing, nothing left picked: %s', (root) => {
    const row = click(root, { selectedRootElement: root, formShown: true });
    expect(row.setSelectedRootElement).toHaveBeenCalledWith('');
    expect(row.setSelectedEntry).toHaveBeenCalledWith('');
    expect(row.setEditing).toHaveBeenCalledWith(false);
    expect(row.setEditing).not.toHaveBeenCalledWith(true);
  });

  it('has its form opened by a click where it is picked with the form folded away', () => {
    const row = click('info', { selectedRootElement: 'info', formShown: false });
    expect(row.setSelectedRootElement).toHaveBeenCalledWith('info');
    expect(row.setEditing).toHaveBeenCalledWith(true);
    expect(row.setEditing).not.toHaveBeenCalledWith(false);
  });
});

describe('a block dictionary in the list', () => {
  it('shut on the block picked in it, folds that block`s form away and leaves nothing picked', () => {
    const row = click('stimuli', {
      open: true,
      selectedRootElement: 'stimuli',
      selectedEntry: 'Step',
      formShown: true,
    });
    expect(row.isOpen()).toBe(false);
    expect(row.setEditing).toHaveBeenCalledWith(false);
    expect(row.setSelectedEntry).toHaveBeenCalledWith('');
    expect(row.setSelectedRootElement).toHaveBeenCalledWith('');
  });

  it('shut while its kinds of block to add are showing, folds those away the same way', () => {
    const row = click('stimuli', { open: true, selectedRootElement: 'stimuli', formShown: true });
    expect(row.isOpen()).toBe(false);
    expect(row.setEditing).toHaveBeenCalledWith(false);
    expect(row.setSelectedRootElement).toHaveBeenCalledWith('');
  });

  it('shut while another block is picked, leaves that block and its form alone', () => {
    const row = click('stimuli', { open: true, selectedRootElement: 'info', formShown: true });
    expect(row.isOpen()).toBe(false);
    expect(row.setEditing).not.toHaveBeenCalled();
    expect(row.setSelectedRootElement).not.toHaveBeenCalled();
    expect(row.setSelectedEntry).not.toHaveBeenCalled();
  });

  it.each([
    ['its own block', { selectedRootElement: 'stimuli', selectedEntry: 'Step' }],
    ['another block', { selectedRootElement: 'info', selectedEntry: '' }],
  ])('opened while %s is picked, leaves the block and its form as they are', (_, picked) => {
    const row = click('stimuli', { open: false, formShown: true, ...picked });
    expect(row.isOpen()).toBe(true);
    expect(row.setEditing).not.toHaveBeenCalled();
    expect(row.setSelectedRootElement).not.toHaveBeenCalled();
    expect(row.setSelectedEntry).not.toHaveBeenCalled();
  });
});
