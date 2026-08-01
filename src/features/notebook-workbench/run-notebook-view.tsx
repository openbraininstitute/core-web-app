'use client';

import { RiErrorWarningLine, RiExternalLinkLine, RiRefreshLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getAnalysisNotebookTemplate } from '@/api/entitycore/queries/analysis-notebook-template';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { config } from '@/config';
import { useLowCredits } from '@/features/low-credits';
import { startNotebook } from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';

import { type JupyterTarget, parsePodUrl } from './jupyter/connection';
import { JupyterProvider } from './jupyter/context';
import { NotebookWorkbench } from './workbench';

interface RunNotebookViewProps {
  /** entitycore id of the analysis notebook template. */
  id: string;
  /** Overrides the virtual lab's compute cell, e.g. 'aws'. */
  cloud?: string;
}

interface Pod {
  target: JupyterTarget;
  notebookPath: string;
  url: string;
}

/**
 * Spawns (or re-attaches to) the user's pod for this notebook and drives it in
 * place, instead of handing the browser off to JupyterHub in a new tab.
 *
 * The pod is started here rather than at the click site so the URL — which can
 * carry a credential — never has to travel through the address bar, and so a
 * reload reconnects rather than dead-ends.
 */
export function RunNotebookView({ id, cloud }: RunNotebookViewProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const [pod, setPod] = useState<Pod | null>(null);
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);
  const { reportError: reportLowCredits, creditsModal } = useLowCredits({
    subject: 'run the notebook',
  });

  const { data: entity } = useQuery({
    queryKey: ['analysis-notebook-template', id, virtualLabId, projectId],
    queryFn: () => getAnalysisNotebookTemplate({ id, context: { virtualLabId, projectId } }),
    enabled: Boolean(id && virtualLabId && projectId),
  });

  const { data: virtualLab } = useQuery({
    queryKey: ['virtual-lab', virtualLabId],
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId),
  });

  // Local development: point the workbench at a Jupyter server you already run,
  // so the UI can be worked on without spawning a pod or spending credits.
  // Ignored outside `local` deployments.
  const devServer =
    config.DEPLOYMENT_ENV === 'local' ? process.env.NEXT_PUBLIC_NOTEBOOK_DEV_URL : undefined;

  useEffect(() => {
    if (!devServer || pod) return;
    const parsed = parsePodUrl(devServer);
    setPod({
      target: parsed.target,
      notebookPath: parsed.notebookPath ?? 'Welcome.ipynb',
      url: devServer,
    });
  }, [devServer, pod]);

  const spawn = useCallback(async () => {
    if (devServer || !entity || !virtualLab) return;

    const asset = getAsset({
      assets: entity.assets,
      label: AssetLabel.jupyter_notebook,
    }).getOneOrNull();
    if (!asset) {
      setError({ message: 'This notebook has no .ipynb file attached.' });
      return;
    }

    setError(null);
    try {
      const started = await startNotebook(
        id,
        asset.path,
        virtualLabId,
        projectId,
        cloud ?? virtualLab.compute_cell,
        0
      );
      const parsed = parsePodUrl(started.url);
      setPod({
        target: parsed.target,
        notebookPath: parsed.notebookPath ?? asset.path,
        url: started.url,
      });
    } catch (e: unknown) {
      if (reportLowCredits(e)) return;
      const cause = e instanceof Error ? (e.cause as { hint?: string } | undefined) : undefined;
      setError({ message: e instanceof Error ? e.message : String(e), hint: cause?.hint });
    }
  }, [cloud, devServer, entity, id, projectId, reportLowCredits, virtualLab, virtualLabId]);

  // Spawn exactly once per mount. `spawn` changes identity whenever its inputs
  // do, so without this guard a re-render could request a second pod — and each
  // request reserves credits.
  const requested = useRef(false);
  useEffect(() => {
    if (pod || requested.current) return;
    if (devServer || !entity || !virtualLab) return;
    requested.current = true;
    void spawn();
  }, [devServer, entity, pod, spawn, virtualLab]);

  // The pod is on another origin. If it does not allow this one, every request
  // fails with an opaque network error, so probe once and say so plainly rather
  // than rendering an editor that silently cannot do anything.
  const [reachable, setReachable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!pod) return;
    let cancelled = false;
    void (async () => {
      try {
        await fetch(`${pod.target.baseUrl}/api/status`, {
          headers: pod.target.token ? { Authorization: `token ${pod.target.token}` } : {},
          credentials: pod.target.token ? 'same-origin' : 'include',
        });
        if (!cancelled) setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pod]);

  const title = entity?.name ?? 'Notebook';

  return (
    <>
      {pod && reachable === false ? (
        <PodUnreachable podUrl={pod.url} />
      ) : error ? (
        <StartupError
          title="Could not start the notebook"
          message={error.hint ?? error.message}
          onRetry={() => {
            setError(null);
            void spawn();
          }}
        />
      ) : pod && reachable ? (
        <JupyterProvider target={pod.target}>
          <NotebookWorkbench initialPath={pod.notebookPath} title={title} podUrl={pod.url} />
        </JupyterProvider>
      ) : (
        <Starting title={title} cloud={cloud ?? virtualLab?.compute_cell} />
      )}
      {creditsModal}
    </>
  );
}

function Starting({ title, cloud }: { title: string; cloud?: string }) {
  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-3">
      <div className="border-neutral-2 border-t-primary-9 size-7 animate-spin rounded-full border-2" />
      <p className="text-primary-9 text-sm font-semibold">Starting {title}</p>
      <p className="text-neutral-4 text-xs">
        Provisioning a kernel{cloud ? ` on ${cloud}` : ''}. This usually takes under a minute.
      </p>
    </div>
  );
}

function StartupError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)] items-center justify-center p-8">
      <div className="border-neutral-2 max-w-140 rounded-2xl border bg-white p-6">
        <div className="text-destructive flex items-center gap-2">
          <RiErrorWarningLine className="size-5 shrink-0" />
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <p className="text-neutral-4 mt-2 text-sm leading-relaxed">{message}</p>
        <div className="mt-4">
          <Button size="sm" onClick={onRetry}>
            <RiRefreshLine className="size-3.5" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The pod started but will not talk to this origin. Confirmed cause on staging:
 * the single-user server sends no `Access-Control-Allow-Origin`, and its URL is an
 * OAuth bootstrap that expects a browser navigation rather than an API call.
 */
function PodUnreachable({ podUrl }: { podUrl: string }) {
  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)] items-center justify-center p-8">
      <div className="border-neutral-2 max-w-160 rounded-2xl border bg-white p-6">
        <div className="text-warning flex items-center gap-2">
          <RiErrorWarningLine className="size-5 shrink-0" />
          <h2 className="text-base font-bold">This notebook server can&apos;t be embedded yet</h2>
        </div>
        <p className="text-neutral-4 mt-2 text-sm leading-relaxed">
          The pod started, but it does not accept API calls from{' '}
          <code className="bg-neutral-1 rounded px-1 py-0.5 font-mono text-xs">
            {typeof window === 'undefined' ? 'this app' : window.location.origin}
          </code>
          . Running it in place needs the single-user server to allow this origin for HTTP and
          websockets, and to accept a token instead of an interactive login. Until then you can run
          it in JupyterHub.
        </p>
        <a href={podUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block">
          <Button size="sm">
            <RiExternalLinkLine className="size-3.5" />
            Open in JupyterHub
          </Button>
        </a>
      </div>
    </div>
  );
}
