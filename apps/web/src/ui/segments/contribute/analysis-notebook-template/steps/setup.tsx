'use client';

import { useQuery } from '@tanstack/react-query';
import { Form, Input, Select } from 'antd';
import { useCallback, useEffect, useId, useState } from 'react';

import { getAnalysisNotebookTemplates } from '@/api/entitycore/queries/analysis-notebook-template';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { AssignmentIdConflictAlert } from '@/features/notebooks/assignment-id-conflict';
import { useDebouncedCallback } from '@/hooks/hooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  AnalysisNotebookTemplateSchema,
  ScaleEnum,
  type TAnalysisNotebookTemplateForm,
} from '@/ui/segments/contribute/analysis-notebook-template/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

const SCALE_OPTIONS = ScaleEnum.options.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

/** Matches the debounce the name-uniqueness check uses. */
const CONFLICT_CHECK_DEBOUNCE_MS = 500;

export function Setup() {
  const form = Form.useFormInstance<TAnalysisNotebookTemplateForm>();
  const { projectId, virtualLabId } = useWorkspace();
  const clearConflictId = useId();

  const validateNameUniqueness = useCallback(
    async (_: unknown, value: string) => {
      if (!value) return;

      const response = await getAnalysisNotebookTemplates({
        filters: { name: value },
        context: { projectId, virtualLabId },
      });

      if (response.data && response.data.length > 0) {
        throw new Error('A notebook template with this name already exists');
      }
    },
    [projectId, virtualLabId]
  );

  const assignmentId = Form.useWatch(['setup', 'assignment_id'], form) ?? '';
  const trimmedAssignmentId = assignmentId.trim();
  const [debouncedAssignmentId, setDebouncedAssignmentId] = useState('');
  const [clearConflict, setClearConflict] = useState(false);

  const scheduleConflictCheck = useDebouncedCallback(
    (value: string) => setDebouncedAssignmentId(value),
    [],
    CONFLICT_CHECK_DEBOUNCE_MS
  );

  useEffect(() => {
    setClearConflict(false);
    scheduleConflictCheck(trimmedAssignmentId);
  }, [trimmedAssignmentId, scheduleConflictCheck]);

  const { data: assignmentIdMatches, isFetching: conflictChecking } = useQuery({
    queryKey: ['notebook-assignment-id-conflict', projectId, debouncedAssignmentId],
    queryFn: () =>
      getAnalysisNotebookTemplates({
        filters: { assignment_id: debouncedAssignmentId, page_size: 1 },
        context: { projectId, virtualLabId },
      }),
    enabled: !!debouncedAssignmentId,
  });

  // Grading resolves an assignment to the first notebook the filter returns, so a second holder of
  // the ID would make the launch pick an arbitrary one. Only trust a result once the debounce has
  // caught up with the field, otherwise the warning trails a keystroke behind.
  const conflict =
    debouncedAssignmentId === trimmedAssignmentId ? (assignmentIdMatches?.data[0] ?? null) : null;

  const conflictCheckPending =
    !!trimmedAssignmentId && (debouncedAssignmentId !== trimmedAssignmentId || conflictChecking);

  // The pipeline releases only the notebook the user actually saw named in the warning.
  useEffect(() => {
    form.setFieldValue(
      ['setup', 'assignment_conflict_id'],
      clearConflict && conflict ? conflict.id : undefined
    );
  }, [clearConflict, conflict, form]);

  const validateAssignmentId = useCallback(async () => {
    if (!trimmedAssignmentId) return;
    if (conflictCheckPending) throw new Error('Checking whether this assignment ID is free');
    if (conflict && !clearConflict) {
      throw new Error(`${conflict.name} already uses this assignment ID`);
    }
  }, [trimmedAssignmentId, conflictCheckPending, conflict, clearConflict]);

  // The rule closes over the verdict, so re-run it whenever the verdict moves — the field itself
  // has not changed when the check settles or the checkbox is ticked.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the verdict is read by the rule, not by this effect
  useEffect(() => {
    if (!trimmedAssignmentId) return;
    form.validateFields([['setup', 'assignment_id']]).catch(() => {});
  }, [trimmedAssignmentId, conflict, clearConflict, conflictCheckPending, form]);

  const { data: virtualLab } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  const isCourseTemplate = virtualLab?.course?.template_project_id === projectId;

  return (
    <div className="h-full w-full">
      <Form.Item
        name={['setup', 'name']}
        label={renderLabel('Name', 'main', RequiredFieldMarker)}
        validateDebounce={500}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(AnalysisNotebookTemplateSchema, 'setup.name', form),
          },
          {
            validator: validateNameUniqueness,
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter notebook template name"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'description']}
        label={renderLabel('Description', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              AnalysisNotebookTemplateSchema,
              'setup.description',
              form
            ),
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          className="rounded-xl placeholder:text-sm"
          placeholder="Enter notebook template description"
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'scale']}
        label={renderLabel('Scale', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(AnalysisNotebookTemplateSchema, 'setup.scale', form),
          },
        ]}
      >
        <Select
          className="rounded-full! h-12 [&_.ant-select-selector]:rounded-full!"
          size="large"
          placeholder="Select scale"
          options={SCALE_OPTIONS}
        />
      </Form.Item>

      <Form.Item
        name={['setup', 'assignment_id']}
        label={renderLabel('Assignment ID', 'main')}
        rules={[{ validator: validateAssignmentId }]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Optional — assignment ID this notebook grades"
        />
      </Form.Item>

      {conflict && (
        <AssignmentIdConflictAlert
          conflictName={conflict.name}
          checkboxId={clearConflictId}
          clear={clearConflict}
          onClearChange={setClearConflict}
          isCourseTemplate={isCourseTemplate}
        />
      )}
    </div>
  );
}
