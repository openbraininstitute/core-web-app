'use client';

import { WarningOutlined } from '@ant-design/icons';

import { fetchEnrolments } from '@/api/virtual-lab-svc/queries/course';
import { patchNotebookMetadataInProjects } from '@/services/notebooks/sync-template-notebooks';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/ui/molecules/alert';
import { Checkbox } from '@/ui/molecules/checkbox';

/** The projects of everyone enrolled on a course, minus the template project itself. */
export async function studentProjectIds({
  courseId,
  templateProjectId,
}: {
  courseId: string;
  templateProjectId: string;
}) {
  const { enrolments } = await fetchEnrolments(courseId);
  return enrolments.map((e) => e.project_id).filter((id) => id !== templateProjectId);
}

/** Releases the assignment ID from a template's student copies. Returns the projects it visited. */
export async function clearAssignmentIdFromStudentCopies({
  virtualLabId,
  courseId,
  templateProjectId,
  notebookName,
}: {
  virtualLabId: string;
  courseId: string;
  templateProjectId: string;
  notebookName: string;
}) {
  const targetProjectIds = await studentProjectIds({ courseId, templateProjectId });
  await patchNotebookMetadataInProjects({
    virtualLabId,
    notebookName,
    targetProjectIds,
    patch: { assignment_id: null },
  });
  return targetProjectIds;
}

export function AssignmentIdConflictAlert({
  conflictName,
  checkboxId,
  clear,
  onClearChange,
  isCourseTemplate,
}: {
  conflictName: string;
  checkboxId: string;
  clear: boolean;
  onClearChange: (clear: boolean) => void;
  isCourseTemplate: boolean;
}) {
  return (
    <Alert variant="warning" appearance="light" className="mt-3">
      <AlertIcon>
        <WarningOutlined />
      </AlertIcon>
      <AlertContent>
        <AlertTitle>{conflictName} already uses this assignment ID</AlertTitle>
        <AlertDescription>
          Grading launches whichever notebook it finds first, so only one may hold it.
        </AlertDescription>
        <label htmlFor={checkboxId} className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            id={checkboxId}
            checked={clear}
            onCheckedChange={(checked) => onClearChange(checked === true)}
          />
          <span>
            Clear the assignment ID from {conflictName}
            {isCourseTemplate ? ' and from its student copies' : ''}
          </span>
        </label>
      </AlertContent>
    </Alert>
  );
}
