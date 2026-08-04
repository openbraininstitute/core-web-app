import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssetContentType, AssetLabel, AssetStatus } from '@/api/entitycore/types/shared/global';
import { DirectoryFileViewer } from '@/features/scan-config/components/file-viewer/directory-viewer';

import type { ReactNode } from 'react';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';

const listDirectoryOfAssets = vi.hoisted(() => vi.fn());

vi.mock('@/api/entitycore/queries/assets', () => ({ listDirectoryOfAssets }));

vi.mock('@/services/entity-download/pre-singed-url', () => ({
  getEntityCorePresignedUrl: vi.fn(async ({ assetPath }: { assetPath?: string }) => ({
    url: `https://s3.test/${assetPath}`,
    size: 1,
  })),
}));

const asset = {
  id: 'asset-1',
  path: 'figures',
  is_directory: true,
  content_type: AssetContentType.directory,
  size: -1,
  label: AssetLabel.efeature_extraction_figures,
  status: AssetStatus.CREATED,
} satisfies Partial<IAsset> as IAsset;

const file = {
  id: asset.id,
  asset,
  entity: { id: 'entity-1', type: 'task_result' },
  name: 'figures',
  renderer: 'default',
} as TActivityCustomFile;

const context = { virtualLabId: 'vl-1', projectId: 'proj-1' };

function renderDirectory() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DirectoryFileViewer
        file={file}
        context={context}
        renderChild={(child: TActivityCustomFile): ReactNode => (
          <div data-testid="child">{child.assetPath}</div>
        )}
      />
    </QueryClientProvider>
  );
}

describe('DirectoryFileViewer', () => {
  it('lists the folder contents and drills into a file and back', async () => {
    listDirectoryOfAssets.mockResolvedValue({
      files: {
        'summary.png': { name: 'summary.png', size: 120, last_modified: '' },
        'raw.bin': { name: 'raw.bin', size: 40, last_modified: '' },
        'panels/IV_curve.png': { name: 'IV_curve.png', size: 200, last_modified: '' },
      },
    });

    renderDirectory();

    // the sub-folder is collapsed into one tile rather than shown as a deep path
    const folder = await screen.findByRole('button', { name: /panels/ });
    expect(folder).toHaveTextContent('1 file');

    // an image gets a thumbnail, an unknown extension falls back to a placeholder tile
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'summary.png' })).toHaveAttribute(
        'src',
        'https://s3.test/summary.png'
      )
    );
    expect(screen.queryByRole('img', { name: 'raw.bin' })).not.toBeInTheDocument();
    // the format is named by the tile's badge (uppercased in CSS, so lowercase in the DOM)
    expect(screen.getByRole('button', { name: /raw\.bin/ })).toHaveTextContent('bin');

    // descend into the sub-folder, open the file inside it, then walk back out
    fireEvent.click(folder);
    fireEvent.click(await screen.findByRole('button', { name: /IV_curve\.png/ }));
    expect(screen.getByTestId('child')).toHaveTextContent('panels/IV_curve.png');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /IV_curve\.png/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('button', { name: /summary\.png/ })).toBeInTheDocument();
  });

  it('says so when the folder is empty', async () => {
    listDirectoryOfAssets.mockResolvedValue({ files: {} });
    renderDirectory();

    expect(await screen.findByText('This folder is empty')).toBeInTheDocument();
  });
});
