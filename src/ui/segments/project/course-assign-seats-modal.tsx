import { useMutation } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';

import { assignSeats, type Enrolment, type Student } from '@/api/virtual-lab-svc/queries/course';
import { InformationIcon } from '@/components/icons';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';

interface AssignSeatsModalProps {
  open: boolean;
  courseId: string;
  enrolments: Enrolment[];
  onClose: () => void;
  onSuccess: () => void;
}

interface AssignmentResult {
  student_id: string;
  email: string;
  assignment_successful: boolean;
  seat_id?: string;
  enrolment_id?: string | null;
  project_id?: string | null;
  credit_transferred_amount?: number;
  email_sent?: boolean;
  error?: string;
}

export function AssignSeatsModal({
  open,
  courseId,
  enrolments,
  onClose,
  onSuccess,
}: AssignSeatsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<AssignmentResult[]>([]);

  const resetState = () => {
    setFile(null);
    setFilteredStudents([]);
    setExistingStudents([]);
    setError('');
    setResults([]);
  };

  const assignMutation = useMutation({
    mutationFn: async (students: Student[]) => assignSeats(courseId, students),
    onSuccess: (data) => {
      setResults(data.results || []);
      onSuccess();
    },
    onError: (err: unknown) => {
      const errorMessage = (err as Error)?.message || 'Failed to assign seats';
      setError(errorMessage);
    },
  });

  const parseCSV = (content: string): Student[] => {
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    const students: Student[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const line of lines) {
      const parts = line.split(',').map((part) => part.trim());
      if (parts.length !== 2) {
        throw new Error('Each line must contain exactly 2 columns: student_id and email');
      }
      const [studentId, email] = parts;
      if (!studentId || !email) {
        throw new Error('Student ID and email cannot be empty');
      }
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email format: ${email}`);
      }
      students.push({ student_id: studentId, email });
    }

    return students;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setFilteredStudents([]);
      setExistingStudents([]);
      setResults([]);

      try {
        const content = await selectedFile.text();
        const students = parseCSV(content);
        const uniqueInFile = Array.from(new Map(students.map((s) => [s.student_id, s])).values());

        if (uniqueInFile.length < students.length) {
          setError(
            `Duplicate student IDs detected in file. ${students.length - uniqueInFile.length} duplicate(s) will be ignored.`
          );
        }

        // Filter out students that already exist in enrolments
        const existingIds = new Set(enrolments.map((e) => e.student_id));
        const existingEmails = new Set(enrolments.map((e) => e.contact_email));

        const newStudents = uniqueInFile.filter(
          (s) => !existingIds.has(s.student_id) && !existingEmails.has(s.email)
        );
        const alreadyExisting = uniqueInFile.filter(
          (s) => existingIds.has(s.student_id) || existingEmails.has(s.email)
        );

        setFilteredStudents(newStudents);
        setExistingStudents(alreadyExisting);
      } catch (err) {
        setError((err as Error).message || 'Failed to parse CSV file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || filteredStudents.length === 0) {
      setError('Please select a valid file with new students');
      return;
    }

    await assignMutation.mutateAsync(filteredStudents);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const isDisabled = !file || filteredStudents.length === 0 || assignMutation.isPending;

  const successCount = results.filter((r) => r.assignment_successful).length;
  const failureCount = results.filter((r) => !r.assignment_successful).length;

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-primary-9">Assign Seats</h2>
        </div>

        {results.length > 0 ? (
          <>
            {successCount > 0 && (
              <div className="mb-4 rounded-lg bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  ✓ Successfully assigned {successCount} student(s):
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-green-700">
                  {results
                    .filter((r) => r.assignment_successful)
                    .map((result) => (
                      <li key={result.student_id}>
                        {result.student_id} - {result.email}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {failureCount > 0 && (
              <div className="mb-4 rounded-lg bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">
                  ✗ Failed to assign {failureCount} student(s):
                </p>
                <ul className="mt-2 max-h-32 space-y-2 overflow-y-auto">
                  {results
                    .filter((r) => !r.assignment_successful)
                    .map((result) => (
                      <li key={result.student_id} className="text-xs text-red-700">
                        <p className="font-medium">{result.student_id}</p>
                        <p className="text-red-600">{result.error || 'Unknown error'}</p>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleClose} className="flex-1">
                OK
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-start gap-2 rounded-lg bg-blue-50 p-4">
              <InformationIcon iconColor="#1e40af" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">CSV Format (no headers)</p>
                <p className="mt-1">Column 1: Student ID (unique identifier)</p>
                <p>Column 2: Email address</p>
                <p className="mt-2 font-mono text-xs">Example:</p>
                <p className="font-mono text-xs">STU001,student1@example.com</p>
                <p className="font-mono text-xs">STU002,student2@example.com</p>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700">
                Select CSV File
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-2 w-full"
                disabled={assignMutation.isPending}
              />
              {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
            </div>

            {existingStudents.length > 0 && (
              <div className="mb-4 rounded-lg bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-800">
                  {existingStudents.length} student(s) already enrolled:
                </p>
                <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-yellow-700">
                  {existingStudents.map((student) => (
                    <li key={student.student_id}>
                      {student.student_id} - {student.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {filteredStudents.length > 0 && (
              <div className="mb-6 rounded-lg bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Ready to assign {filteredStudents.length} new student(s):
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-green-700">
                  {filteredStudents.map((student) => (
                    <li key={student.student_id}>
                      {student.student_id} - {student.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={assignMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isDisabled}
                className={`flex-1 ${isDisabled ? '!opacity-50 !bg-gray-300 !text-gray-500' : ''}`}
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
