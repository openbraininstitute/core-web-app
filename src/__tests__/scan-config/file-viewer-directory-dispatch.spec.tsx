import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileViewer } from '@/features/scan-config/components/file-viewer';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';

const listDirectoryOfAssets = vi.hoisted(() => vi.fn());

vi.mock('@/api/entitycore/queries/assets', () => ({ listDirectoryOfAssets }));
vi.mock('@/services/entity-download/pre-singed-url', () => ({
  getEntityCorePresignedUrl: vi.fn(async ({ assetPath }: { assetPath?: string }) => ({
    url: `https://s3.test/${assetPath ?? 'x.png'}`,
    size: 1,
  })),
}));

// react-pdf pulls in the pdfjs worker, which jsdom cannot run; the dispatch is what is under test
vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {}, version: '0.0.0' },
  Document: ({ file, children }: { file: string; children?: unknown }) => (
    <div data-testid="pdf-document" data-file={file}>
      {children as never}
    </div>
  ),
  Page: () => null,
}));

/** verbatim from the entitycore `task_result` response for an e-feature extraction run */
const figuresAsset = {
  size: -1,
  sha256_digest: null,
  path: 'figures',
  full_path:
    'private/e6030ed8-a589-4be2-80a6-f975406eb1f6/2720f785-a3a2-4472-969d-19a53891c817/assets/task_result/866f9605-b854-49b4-a86c-9a997c229dd5/figures',
  is_directory: true,
  content_type: 'application/vnd.directory',
  meta: {},
  label: 'efeature_extraction_figures',
  storage_type: 'aws_s3_internal',
  id: '87a7f6ce-c8b0-4018-976a-935eb41b2602',
  status: 'created',
} as unknown as IAsset;

describe('FileViewer dispatch for the e-feature extraction figures asset', () => {
  it('opens the directory listing instead of the unsupported-format placeholder', async () => {
    listDirectoryOfAssets.mockResolvedValue({
      files: { 'trace.png': { name: 'trace.png', size: 10, last_modified: '' } },
    });

    const file = {
      id: figuresAsset.id,
      asset: figuresAsset,
      entity: { id: '866f9605-b854-49b4-a86c-9a997c229dd5', type: 'task_result' },
      name: 'figures',
      renderer: 'default',
    } as TActivityCustomFile;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <FileViewer file={file} context={{ virtualLabId: 'vl-1', projectId: 'proj-1' }} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('button', { name: /trace\.png/ })).toBeInTheDocument();
    expect(screen.queryByText(/is not supported yet/)).not.toBeInTheDocument();
  });

  it('renders a pdf opened from inside the directory with the react-pdf document', async () => {
    listDirectoryOfAssets.mockResolvedValue({
      files: { 'report.pdf': { name: 'report.pdf', size: 2048, last_modified: '' } },
    });

    const file = {
      id: figuresAsset.id,
      asset: figuresAsset,
      entity: { id: '866f9605-b854-49b4-a86c-9a997c229dd5', type: 'task_result' },
      name: 'figures',
      renderer: 'default',
    } as TActivityCustomFile;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <FileViewer file={file} context={{ virtualLabId: 'vl-1', projectId: 'proj-1' }} />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: /report\.pdf/ }));

    // the presigned url carries the in-directory path, so the document is the child, not the folder
    await waitFor(() =>
      expect(screen.getByTestId('pdf-document')).toHaveAttribute(
        'data-file',
        'https://s3.test/report.pdf'
      )
    );
    expect(screen.queryByText(/is not supported yet/)).not.toBeInTheDocument();
  });

  it('shows the placeholder for a child whose format has no viewer, not the folder again', async () => {
    listDirectoryOfAssets.mockResolvedValue({
      files: { 'raw.bin': { name: 'raw.bin', size: 12, last_modified: '' } },
    });

    const file = {
      id: figuresAsset.id,
      asset: figuresAsset,
      entity: { id: '866f9605-b854-49b4-a86c-9a997c229dd5', type: 'task_result' },
      name: 'figures',
      renderer: 'default',
    } as TActivityCustomFile;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <FileViewer file={file} context={{ virtualLabId: 'vl-1', projectId: 'proj-1' }} />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: /raw\.bin/ }));

    // an unmapped extension used to inherit the parent's directory type and re-open the listing
    expect(await screen.findByText(/is not supported yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /raw\.bin/ })).not.toBeInTheDocument();
  });
});
