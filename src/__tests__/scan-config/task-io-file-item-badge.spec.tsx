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
  it('labels the SONATA circuit directory rather than calling it a folder', () => {
    render(
      <TaskIOFileItem
        file={makeFile(
          { path: 'circuit', is_directory: true, label: AssetLabel.sonata_circuit },
          'circuit_config.json'
        )}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('circuit directory')).toBeInTheDocument();
    // the name stays rendered in full next to the longer badge
    expect(screen.getByText('circuit_config.json')).toBeInTheDocument();
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
