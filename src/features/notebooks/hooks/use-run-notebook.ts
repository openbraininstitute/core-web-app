'use client';

import {
  type RemixiconComponentType,
  RiAmazonLine,
  RiMicrosoftLine,
  RiPlayFill,
} from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { useLowCredits } from '@/features/low-credits';
import {
  type NotebookStartResponse,
  startEmptyNotebook,
  startNotebook,
} from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { IAsset } from '@/api/entitycore/types/shared/global';

export type NotebookRunTarget = {
  key: string;
  label: string;
  /** overrides the virtual lab's compute cell (dev-only cloud targets) */
  cloud?: string;
  /** brand/run icon — AWS uses Amazon, Azure uses Microsoft */
  Icon: RemixiconComponentType;
  hideInProduction?: boolean;
};

const DEV_DEPLOYMENTS = ['local', 'preview', 'development'];

const DEFAULT_RUN_TARGET: NotebookRunTarget = {
  key: 'default',
  label: 'Run notebook',
  Icon: RiPlayFill,
  hideInProduction: false,
};
const DEV_RUN_TARGETS: NotebookRunTarget[] = [
  {
    key: 'aws-dev',
    label: 'Run on AWS (dev)',
    cloud: 'aws',
    Icon: RiAmazonLine,
    hideInProduction: true,
  },
  {
    key: 'azure-dev',
    label: 'Run on Azure (dev)',
    cloud: 'azure',
    Icon: RiMicrosoftLine,
    hideInProduction: true,
  },
];

/**
 * Run targets visible for the given deployment: always the default, plus the single-pod AWS/Azure
 * targets in dev/preview/local deployments.
 */
export function buildRunTargets(deploymentEnv: string): NotebookRunTarget[] {
  return [DEFAULT_RUN_TARGET, ...(DEV_DEPLOYMENTS.includes(deploymentEnv) ? DEV_RUN_TARGETS : [])];
}

/**
 * Shared "Run notebook" behaviour for the table-less notebook surfaces (mini-detail drawer and
 * detail action rail): launches the `jupyter_notebook` asset on JupyterHub. In dev/preview/local
 * deployments it also exposes the single-pod AWS/Azure run targets. `openJupyterHub` opens a bare
 * JupyterHub session (used by the Results "Open notebook" action).
 */
export function useRunNotebook({
  id,
  assets,
  enabled = true,
  embed = false,
}: {
  id: string;
  assets: IAsset[];
  enabled?: boolean;
  /**
   * Run the notebook inside the workspace (next to the AI assistant) instead of
   * handing the browser off to JupyterHub in a new tab. The pod is then spawned
   * by the run page, so its URL never has to pass through the address bar.
   */
  embed?: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const router = useRouter();
  const notification = useAppNotification();
  const [runningTarget, setRunningTarget] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { reportError: reportLowCredits, creditsModal } = useLowCredits({
    subject: 'run the notebook',
  });

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId) && enabled,
  });

  const runTargets = buildRunTargets(config.DEPLOYMENT_ENV);

  async function run(target: NotebookRunTarget = DEFAULT_RUN_TARGET) {
    if (runningTarget) return;
    const asset = getAsset({
      assets,
      label: AssetLabel.jupyter_notebook,
    }).getOneOrNull();

    if (!asset || !virtualLabData) return;

    const cloud = target.cloud ?? virtualLabData.compute_cell;

    if (embed) {
      const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/notebooks/run/${ExtendedEntitiesTypeDict.AnalysisNotebookTemplate}/${id}`;
      router.push(target.cloud ? `${base}?cloud=${encodeURIComponent(target.cloud)}` : base);
      return;
    }

    setRunningTarget(target.key);
    try {
      const retval: NotebookStartResponse = await startNotebook(
        id,
        asset.path,
        virtualLabId,
        projectId,
        cloud,
        0
      );
      notification.success({
        message: 'Notebook starting',
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      if (reportLowCredits(error)) return;
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook, unknown error: ${error}`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    } finally {
      setRunningTarget(null);
    }
  }

  async function openJupyterHub() {
    if (opening || !virtualLabData) return;
    setOpening(true);
    try {
      const retval = await startEmptyNotebook(virtualLabId, projectId, virtualLabData.compute_cell);
      window.open(retval.url, '_blank');
    } catch (error) {
      if (reportLowCredits(error)) return;
      notification.error({
        message: 'Failed to open JupyterHub',
        key: 'notebook-open-error',
        placement: 'topRight',
      });
    } finally {
      setOpening(false);
    }
  }

  return {
    run,
    runTargets,
    runningTarget,
    running: runningTarget !== null,
    openJupyterHub,
    opening,
    creditsModal,
  };
}
