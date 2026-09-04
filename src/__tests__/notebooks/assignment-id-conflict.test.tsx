import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { Form } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAnalysisNotebookTemplates,
  updateAnalysisNotebookTemplate,
} from '@/api/entitycore/queries/analysis-notebook-template';
import { createAnalysisNotebookTemplate } from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import { clearAssignmentIdFromStudentCopies } from '@/features/notebooks/assignment-id-conflict';
import { useAnalysisNotebookTemplatePipeline } from '@/ui/segments/contribute/analysis-notebook-template/pipeline';
import { Setup } from '@/ui/segments/contribute/analysis-notebook-template/steps/setup';

import type { ReactNode } from 'react';
import type { TAnalysisNotebookTemplateForm } from '@/ui/segments/contribute/analysis-notebook-template/schema';

const notify = { warning: vi.fn(), success: vi.fn(), error: vi.fn() };
vi.mock('@/components/notification', () => ({ useAppNotification: () => notify }));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'proj-1' }),
}));
vi.mock('@/api/entitycore/queries/analysis-notebook-template', () => ({
  getAnalysisNotebookTemplates: vi.fn(async () => ({ data: [] })),
  updateAnalysisNotebookTemplate: vi.fn(async () => ({})),
  deleteAnalysisNotebookTemplate: vi.fn(async () => ({})),
}));
vi.mock('@/api/entitycore/queries/experimental/analysis-notebook-template', () => ({
  createAnalysisNotebookTemplate: vi.fn(async () => ({ id: 'nb-new' })),
  uploadNotebookTemplateFile: vi.fn(async () => ({})),
}));
vi.mock('@/api/entitycore/queries/general/contribution', () => ({
  createContribution: vi.fn(async () => ({})),
}));
vi.mock('@/api/virtual-lab-svc/queries/virtual-lab', () => ({
  getVirtualLab: vi.fn(async () => ({ id: 'vl-1' })),
}));
vi.mock('@/ui/segments/contribute/analysis-notebook-template/steps/assets', () => ({
  getNotebookFiles: () => ({ notebook: new File(['{}'], 'notebook.ipynb') }),
}));
vi.mock('@/features/notebooks/assignment-id-conflict', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  clearAssignmentIdFromStudentCopies: vi.fn(async () => []),
}));

const HOLDER = { id: 'nb-holder', name: 'Week 1 analysis' };

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(getAnalysisNotebookTemplates).mockReset();
  vi.mocked(updateAnalysisNotebookTemplate).mockClear();
  vi.mocked(createAnalysisNotebookTemplate).mockClear();
  vi.mocked(clearAssignmentIdFromStudentCopies).mockClear();
  notify.warning.mockClear();
});

describe('the assignment ID field on the create form', () => {
  /** The name check queries by `name`; the conflict check queries by `assignment_id`. */
  function answerWith(holders: Array<typeof HOLDER>) {
    vi.mocked(getAnalysisNotebookTemplates).mockImplementation(async ({ filters }) =>
      filters && 'assignment_id' in filters ? { data: holders } : ({ data: [] } as never)
    );
  }

  async function renderSetup() {
    const form = { current: null } as { current: unknown };
    function Harness() {
      const [instance] = Form.useForm<TAnalysisNotebookTemplateForm>();
      form.current = instance;
      return (
        <Form form={instance} layout="vertical">
          <Setup />
        </Form>
      );
    }
    render(<Harness />, { wrapper });
    return () => form.current as ReturnType<typeof Form.useForm<TAnalysisNotebookTemplateForm>>[0];
  }

  it('warns when another notebook already holds the ID, and blocks until it is released', async () => {
    answerWith([HOLDER]);
    const getForm = await renderSetup();

    act(() => {
      getForm().setFieldValue(['setup', 'assignment_id'], 'A-1');
    });

    await waitFor(() => expect(screen.getByText(/already uses this assignment ID/)).toBeVisible(), {
      timeout: 3000,
    });

    await expect(getForm().validateFields([['setup', 'assignment_id']])).rejects.toBeTruthy();
    expect(getForm().getFieldValue(['setup', 'assignment_conflict_id'])).toBeUndefined();

    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() =>
      expect(getForm().getFieldValue(['setup', 'assignment_conflict_id'])).toBe(HOLDER.id)
    );
    await expect(getForm().validateFields([['setup', 'assignment_id']])).resolves.toBeTruthy();
  });

  it('stays quiet when the ID is free', async () => {
    answerWith([]);
    const getForm = await renderSetup();

    act(() => {
      getForm().setFieldValue(['setup', 'assignment_id'], 'A-2');
    });

    await waitFor(
      () => expect(getForm().validateFields([['setup', 'assignment_id']])).resolves.toBeTruthy(),
      { timeout: 3000 }
    );
    expect(screen.queryByText(/already uses this assignment ID/)).toBeNull();
  });
});

describe('creating a notebook that takes over an assignment ID', () => {
  const values = {
    setup: {
      name: 'New analysis',
      description: 'd',
      scale: 'cellular',
      assignment_id: 'A-1',
      assignment_conflict_id: HOLDER.id,
    },
    assets: { notebook: true },
    contribution: [],
  } as unknown as TAnalysisNotebookTemplateForm;

  it('releases the ID from the consented notebook only after the new one is complete', async () => {
    vi.mocked(getAnalysisNotebookTemplates).mockResolvedValue({ data: [HOLDER] } as never);
    const { result } = renderHook(() => useAnalysisNotebookTemplatePipeline({ sessionId: 's' }), {
      wrapper,
    });

    await act(async () => {
      await result.current.createEntity({ values });
    });

    // created without the ID, so the rollback path can never strip the other notebook for nothing
    expect(vi.mocked(createAnalysisNotebookTemplate).mock.calls[0][0].payload).toMatchObject({
      assignment_id: undefined,
    });

    const updates = vi.mocked(updateAnalysisNotebookTemplate).mock.calls.map(([arg]) => arg);
    expect(updates).toHaveLength(2);
    // release before claim: a failed claim leaves the ID unheld rather than doubly held
    expect(updates[0]).toMatchObject({ id: HOLDER.id, payload: { assignment_id: null } });
    expect(updates[1]).toMatchObject({ id: 'nb-new', payload: { assignment_id: 'A-1' } });
  });

  it('refuses to release a notebook the user never consented to', async () => {
    vi.mocked(getAnalysisNotebookTemplates).mockResolvedValue({
      data: [{ id: 'nb-someone-else', name: 'Week 2' }],
    } as never);
    const { result } = renderHook(() => useAnalysisNotebookTemplatePipeline({ sessionId: 's' }), {
      wrapper,
    });

    await act(async () => {
      await result.current.createEntity({ values });
    });

    expect(updateAnalysisNotebookTemplate).not.toHaveBeenCalled();
    expect(clearAssignmentIdFromStudentCopies).not.toHaveBeenCalled();
    // the notebook itself was created, so the user is told rather than losing the upload
    expect(notify.warning).toHaveBeenCalledOnce();
  });
});
