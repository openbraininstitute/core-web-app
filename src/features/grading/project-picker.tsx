'use client';

import { Button, Select } from 'antd';
import { useState } from 'react';

import { messages } from '@/i18n/en/grading';

import { launchGradingNotebook } from './actions';

import type { LaunchErrorReason } from './errors';
import type { AccessibleProject, VerifiedParams } from './launch';

interface Props {
  projects: AccessibleProject[];
  virtualLabName: string;
  params: VerifiedParams;
}

export function ProjectPicker({ projects, virtualLabName, params }: Props) {
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LaunchErrorReason | null>(null);

  async function onLaunch() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    const result = await launchGradingNotebook({ ...params, project_id: projectId });
    if (result.ok) {
      // Full navigation into the (external) Jupyter pod URL. Keep `loading` set while we leave.
      window.location.assign(result.url);
      return;
    }
    setError(result.reason);
    setLoading(false);
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h2 className="text-primary-8 text-xl font-bold">Choose a project</h2>
        <p className="text-primary-7">
          You have access to several projects in{' '}
          <span className="font-semibold">{virtualLabName}</span>. Pick the one to launch this
          exercise in.
        </p>
      </div>

      <Select
        aria-label="Project"
        placeholder="Select a project"
        className="w-full text-left"
        size="large"
        value={projectId}
        onChange={setProjectId}
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
      />

      <Button
        type="primary"
        size="large"
        block
        loading={loading}
        disabled={!projectId}
        onClick={onLaunch}
      >
        Launch exercise
      </Button>

      {error && (
        <div className="space-y-1 text-center">
          <p className="font-semibold text-red-600">{messages[error].title}</p>
          <p className="text-primary-7">{messages[error].body}</p>
        </div>
      )}
    </div>
  );
}
