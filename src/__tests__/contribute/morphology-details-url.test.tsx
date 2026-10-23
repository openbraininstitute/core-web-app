import { fireEvent, render, screen } from '@testing-library/react';
import { Form } from 'antd';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/ui/segments/contribute/event', () => ({
  makeSelectContributionEntityClickEvent: vi.fn(),
}));

const useContributionPipeline = vi.fn();
vi.mock('@/ui/segments/contribute/shared/pipeline/context', () => ({
  useContributionPipeline: () => useContributionPipeline(),
}));

import { createCellMorphologyConfig } from '@/ui/segments/contribute/cell-morphology/config';
import { SubmitButton } from '@/ui/segments/contribute/shared/components/submit-button';

import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';

const config = createCellMorphologyConfig([]);

/**
 * Mirrors the state at the moment the link is built: every step has unmounted behind the
 * progress view, so the values only live in the form store.
 */
function Harness({ generationType }: { generationType: string }) {
  const [form] = Form.useForm<TCellMorphologyForm>();
  form.setFieldsValue({ _protocol_generation_type: generationType });
  useContributionPipeline.mockReturnValue({ form });

  return (
    <SubmitButton
      loading={false}
      createdEntityId="entity-1"
      config={config}
      virtualLabId="vl-1"
      projectId="pj-1"
      onSubmit={async () => {}}
    />
  );
}

function pushedUrlFor(generationType: string) {
  push.mockClear();
  render(<Harness generationType={generationType} />);
  fireEvent.click(screen.getByRole('button', { name: /view details/i }));
  return push.mock.calls[0][0] as string;
}

describe('cell morphology details link', () => {
  it('sends a reconstruction to the experimental morphology page', () => {
    expect(pushedUrlFor('digital_reconstruction')).toContain('/data/view/cell-morphology/entity-1');
  });

  it.each([
    'computationally_synthesized',
    'modified_reconstruction',
    'placeholder',
  ])('sends a %s morphology to the synthesized page', (generationType) => {
    expect(pushedUrlFor(generationType)).toContain(
      '/data/view/synthesized-cell-morphology/entity-1'
    );
  });
});
