import { IconDownloadFile } from '@/components/LandingPage/icons/IconDownloadFile';
import { LoadingNeuronSpinner } from '@/components/neuron-viewer/loading-neuron-spinner';
import { MorphoViewerSmallCircuit } from '@/morpho-viewer';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import { useCircuitLoader, useDownloadHandler } from './hooks';

import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

import styles from './viewer-layout.module.css';

export interface ViewerLayoutProps {
  className?: string;
  model: TSupportedEntitiesForScanConfiguration;
}

export default function ViewerLayout({ className, model }: ViewerLayoutProps) {
  const circuitLoader = useCircuitLoader(model);
  const loaded = circuitLoader.useLoaded();
  const error = circuitLoader.useError();
  const handleDownload = useDownloadHandler(model);

  return (
    <div className={cn(styles.layout, className, 'px-5 text-gray-500')}>
      <header className="text-lg uppercase">
        <div>Preview</div>
        <button type="button" onClick={handleDownload}>
          <IconDownloadFile />
        </button>
      </header>
      <div className={styles.viewer}>
        {error ? (
          <div className={styles.report}>
            <h1>Error while loading SONATA circuit</h1>
            <ul>
              {circuitLoader.report.tasks.map(({ message, failure }, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: no element will change without the whole list.
                <li key={index} className={cn(failure && styles.failure)}>
                  {message}
                </li>
              ))}
            </ul>
            <hr />
            <Button onClick={handleDownload}>Download SONATA file</Button>
          </div>
        ) : (
          <>
            {loaded && (
              <MorphoViewerSmallCircuit
                circuit={circuitLoader.circuit}
                loadCell={circuitLoader.loadCell}
                gizmo
                scalebar
              />
            )}
            {!loaded && (
              <div className={styles.spinner}>
                <LoadingNeuronSpinner label="Circuit" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
