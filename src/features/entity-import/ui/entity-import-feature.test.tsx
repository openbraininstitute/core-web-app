import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ImportInputType } from '../core/contracts';
import { EntityImportFeature } from '../index';

import type { EntityImportAdapter } from '../core/adapter';

const adapter: EntityImportAdapter<Record<string, string>, { id: string }> = {
  id: 'mock-import',
  title: 'Mock Entity Import',
  templateFileName: 'mock-import.csv',
  submitLabel: 'Import rows',
  fields: [
    {
      label: 'Name',
      path: 'name',
      required: true,
      inputType: ImportInputType.Text,
    },
    {
      label: 'Brain Region',
      path: 'brainRegion',
      required: true,
      inputType: ImportInputType.RemoteSelect,
      remote: {
        async search({ query }) {
          if (!query.toLowerCase().includes('ctx')) {
            return [];
          }

          return [
            {
              value: 'Isocortex',
              label: 'Isocortex',
              recommended: true,
            },
          ];
        },
      },
    },
  ],
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
    brainRegion: z.string().min(1, 'Brain region is required'),
  }),
  buildPayload({ values }) {
    return values;
  },
  submitRow: vi.fn(async ({ row }) => ({ id: row.id })),
};

describe('EntityImportFeature', () => {
  it('applies a selected remote suggestion to all matching rows', async () => {
    const user = userEvent.setup();

    render(
      <EntityImportFeature
        adapter={adapter}
        context={{ projectId: 'project-1', virtualLabId: 'lab-1' }}
        initialRows={[
          { name: 'Neuron A', brainRegion: 'Ctx' },
          { name: 'Neuron B', brainRegion: 'Ctx' },
        ]}
      />
    );

    await user.click(screen.getByLabelText('Brain Region row 1'));

    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Brain Region', level: 4 })).toBeInTheDocument();

    const validatorInput = screen.getByLabelText('Validator value');
    await user.clear(validatorInput);
    await user.type(validatorInput, 'Ctx');

    const suggestion = await screen.findByText('Isocortex');
    await waitFor(() => {
      expect(suggestion).toBeInTheDocument();
    });

    await user.click(suggestion);
    await user.click(screen.getByRole('button', { name: /Apply to all/i }));

    expect(screen.getByLabelText('Brain Region row 1')).toHaveValue('Isocortex');
    expect(screen.getByLabelText('Brain Region row 2')).toHaveValue('Isocortex');
  });
});
