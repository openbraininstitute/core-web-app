import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';

function makeFile(asset: Partial<IAsset>, assetPath?: string): TActivityCustomFile {
  return {
    entity: { id: 'e1' },
    asset: { id: 'a1', path: 'result.json', is_directory: false, ...asset },
    assetPath,
    renderer: ActivityCustomFileRenderer.Default,
  } as unknown as TActivityCustomFile;
}

describe('TaskIOFileItem badge', () => {
  it('names the SONATA circuit entry after the directory, not its config file', () => {
    render(
      <TaskIOFileItem
        file={makeFile(
          { path: 'circuit', is_directory: true, label: AssetLabel.sonata_circuit },
          'circuit_config.json'
        )}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Circuit directory')).toBeInTheDocument();
    expect(screen.getByText('folder')).toBeInTheDocument();
    expect(screen.queryByText('circuit_config.json')).not.toBeInTheDocument();
  });

  it('keeps the generic folder badge for any other directory asset', () => {
    render(
      <TaskIOFileItem
        file={makeFile({
          path: 'figures',
          is_directory: true,
          label: AssetLabel.efeature_extraction_figures,
        })}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('folder')).toBeInTheDocument();
  });

  it('pins the tail of a long name so the run id survives truncation', () => {
    const name = 'EFeature Extraction Result — Dm_16Sept2026_1129';
    const { container } = render(
      <TaskIOFileItem file={makeFile({ path: 'result.json' })} name={name} onSelect={vi.fn()} />
    );

    // the head is what the ellipsis eats; the tail cannot shrink, so it is always readable, and it
    // is cut at the last separator rather than mid-token
    expect(screen.getByText('EFeature Extraction Result — Dm_16Sept2026')).toBeInTheDocument();
    expect(screen.getByText('_1129')).toBeInTheDocument();
    expect(container.querySelector('[data-file-name]')).toHaveAttribute('data-file-name', name);
  });

  it('leaves a short name in one piece', () => {
    render(<TaskIOFileItem file={makeFile({ path: 'result.json' })} onSelect={vi.fn()} />);

    expect(screen.getByText('result.json')).toBeInTheDocument();
  });

  it('falls back to the extension for a plain file', () => {
    render(
      <TaskIOFileItem
        file={makeFile({ path: 'out/result.json', content_type: AssetContentType.json })}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('json')).toBeInTheDocument();
  });
});
