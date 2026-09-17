import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetContentType, AssetLabel, AssetStatus } from '@/api/entitycore/types/shared/global';
import { DEFAULT_SETTINGS } from '@/components/MorphoViewer/constants';
import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';

import type { ComponentProps } from 'react';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { MorphoViewer } from '@/components/MorphoViewer';
import type { MorphologySettings, Neurite } from '@/components/MorphoViewer/constants';

const fixtures = vi.hoisted(() => ({
  download: vi.fn(),
  neurites: [] as Neurite[],
}));

vi.mock('next/navigation', () => ({ useParams: () => ({}) }));

vi.mock('@/api/entitycore/queries/assets', () => ({ downloadAsset: fixtures.download }));

vi.mock('@/components/MorphoViewer', async () => {
  const { useEffect } = await import('react');
  return {
    MorphoViewer: ({
      mode,
      swc,
      swcError,
      mesh,
      meshError,
      settings,
      onNeurites,
    }: ComponentProps<typeof MorphoViewer>) => {
      useEffect(() => {
        if (swc || mesh) onNeurites(fixtures.neurites);
      }, [swc, mesh, onNeurites]);
      return (
        <div data-testid="morpho-viewer" data-mode={mode} data-settings={JSON.stringify(settings)}>
          {swc && `skeleton of ${swc}`}
          {swcError && 'skeleton error'}
          {mesh && `mesh of ${mesh.byteLength} bytes`}
          {meshError && 'mesh error'}
        </div>
      );
    },
  };
});

const SWC = asset({ id: 'swc', label: AssetLabel.morphology, content_type: AssetContentType.swc });
const MESH = asset({
  id: 'glb',
  label: AssetLabel.cell_surface_mesh,
  content_type: AssetContentType.gltf_binary,
});

function asset(overrides: Partial<IAsset> & Record<string, unknown>): IAsset {
  return { status: AssetStatus.CREATED, ...overrides } as IAsset;
}

async function downloadFile({ id }: { id: string }) {
  if (id === 'glb') return { arrayBuffer: async () => new ArrayBuffer(8) };
  return { text: async () => 'swc' };
}

function draw(assets: IAsset[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (next: IAsset[]) => (
    <QueryClientProvider client={client}>
      <CellMorphologyViewer entity={{ id: 'morphology', assets: next } as ICellMorphology} />
    </QueryClientProvider>
  );
  const { rerender } = render(tree(assets));
  return (next: IAsset[]) => rerender(tree(next));
}

const meshButton = () => screen.queryByTestId('morphology-mode-mesh');
const skeletonButton = () => screen.getByTestId('morphology-mode-skeleton');
const viewer = () => screen.getByTestId('morpho-viewer');
const downloaded = () => fixtures.download.mock.calls.map(([{ id }]) => id);
const settings = (): MorphologySettings => JSON.parse(viewer().dataset.settings ?? '');
const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Viewer settings' }));

describe('CellMorphologyViewer modes', () => {
  beforeEach(() => {
    fixtures.download.mockReset();
    fixtures.download.mockImplementation(downloadFile);
    fixtures.neurites = ['soma', 'basalDendrite', 'apicalDendrite', 'axon'];
  });

  it('opens on the mesh, listed before the skeleton, and downloads only the GLB', async () => {
    draw([SWC, MESH]);

    expect(viewer()).toHaveAttribute('data-mode', 'mesh');
    expect(
      screen.getAllByTestId(/^morphology-mode-/).map((button) => button.dataset.testid)
    ).toEqual(['morphology-mode-mesh', 'morphology-mode-skeleton']);
    expect(await screen.findByText('mesh of 8 bytes')).toBeInTheDocument();
    expect(fixtures.download).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'morphology', id: 'glb', asRawResponse: true })
    );
    expect(downloaded()).toEqual(['glb']);
  });

  it('downloads the SWC on the first switch to the skeleton, and each file once', async () => {
    draw([SWC, MESH]);
    await screen.findByText('mesh of 8 bytes');

    fireEvent.click(skeletonButton());

    expect(viewer()).toHaveAttribute('data-mode', 'skeleton');
    expect(await screen.findByText('skeleton of swc', { exact: false })).toBeInTheDocument();
    expect(viewer()).toHaveTextContent('mesh of 8 bytes');

    fireEvent.click(meshButton() as HTMLElement);
    fireEvent.click(skeletonButton());

    expect(viewer()).toHaveAttribute('data-mode', 'skeleton');
    expect(downloaded()).toEqual(['glb', 'swc']);
  });

  it('offers no mesh without a GLB asset and downloads the SWC right away', async () => {
    draw([SWC]);

    expect(meshButton()).toBeNull();
    expect(screen.getByTestId('viewer-full-screen')).toBeInTheDocument();
    expect(viewer()).toHaveAttribute('data-mode', 'skeleton');
    expect(await screen.findByText('skeleton of swc')).toBeInTheDocument();
    expect(downloaded()).toEqual(['swc']);
  });

  it('offers no mesh while the GLB is still uploading', () => {
    draw([SWC, { ...MESH, status: AssetStatus.UPLOADING }]);

    expect(meshButton()).toBeNull();
    expect(viewer()).toHaveAttribute('data-mode', 'skeleton');
  });

  it('passes a mesh error when the GLB download fails', async () => {
    fixtures.download.mockRejectedValue(new Error('409'));
    draw([SWC, MESH]);

    expect(await screen.findByText('mesh error')).toBeInTheDocument();
  });

  it('passes a skeleton error when the SWC download fails', async () => {
    fixtures.download.mockImplementation(async (params: { id: string }) => {
      if (params.id === 'swc') throw new Error('409');
      return downloadFile(params);
    });
    draw([SWC, MESH]);

    fireEvent.click(skeletonButton());

    expect(await screen.findByText('skeleton error', { exact: false })).toBeInTheDocument();
  });

  it('falls back to the skeleton when the mesh asset goes away', () => {
    const redraw = draw([SWC, MESH]);

    redraw([SWC]);

    expect(viewer()).toHaveAttribute('data-mode', 'skeleton');
  });

  it('offers only the mesh when the morphology has no SWC', async () => {
    draw([MESH]);

    expect(await screen.findByText('mesh of 8 bytes', { exact: false })).toBeInTheDocument();
    expect(meshButton()).toBeNull();
    expect(viewer()).toHaveAttribute('data-mode', 'mesh');
    expect(downloaded()).toEqual(['glb']);
  });

  it('shows the skeleton settings only in the skeleton view', async () => {
    draw([SWC, MESH]);
    await screen.findByText('mesh of 8 bytes');
    openSettings();

    expect(screen.queryByText('Skeleton view')).toBeNull();
    expect(screen.queryByText('Thickness')).toBeNull();
    expect(screen.getByText('Apical dendrite')).toBeInTheDocument();

    fireEvent.click(skeletonButton());

    expect(screen.getByText('Skeleton view')).toBeInTheDocument();
  });

  it('labels a single dendrite type as Dendrite', async () => {
    fixtures.neurites = ['soma', 'basalDendrite', 'axon'];
    draw([SWC]);
    await screen.findByText('skeleton of swc');
    openSettings();

    expect(screen.getByText('Dendrite')).toBeInTheDocument();
    expect(screen.queryByText('Basal dendrite')).toBeNull();
  });

  it('keeps hidden neurites when the background changes', async () => {
    draw([SWC]);
    await screen.findByText('skeleton of swc');
    openSettings();

    fireEvent.click(screen.getByRole('switch', { name: 'Show axon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dark background' }));

    expect(settings()).toMatchObject({ darkMode: true, hidden: ['axon'] });
  });

  it('resets colors and visibility but not the skeleton settings', async () => {
    draw([SWC]);
    await screen.findByText('skeleton of swc');
    openSettings();

    fireEvent.change(screen.getByLabelText('Axon color'), { target: { value: '#00ff00' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Show axon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Distance' }));

    expect(settings().palettes.light.axon).toBe('#00ff00');

    fireEvent.click(screen.getByRole('button', { name: 'Reset colors' }));

    expect(settings()).toMatchObject({
      palettes: DEFAULT_SETTINGS.palettes,
      hidden: [],
      colorBy: 'distance',
    });
  });

  it('offers only the background until a file has loaded', () => {
    fixtures.download.mockReturnValue(new Promise(() => {}));
    draw([SWC, MESH]);
    openSettings();

    expect(screen.getByRole('button', { name: 'Dark background' })).toBeInTheDocument();
    expect(screen.queryByText('Neurites')).toBeNull();
    expect(screen.queryByText('Skeleton view')).toBeNull();
  });
});
