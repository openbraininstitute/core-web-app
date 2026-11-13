'use client';

import { omit } from 'es-toolkit';
import { useMemo } from 'react';

import { compileConfigValidator } from '@/features/scan-config/components/hooks';
import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { useScanConfiguration } from '@/features/scan-config/components/hooks/use-scan-configuration';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import { JsonView } from '@/ui/segments/detail-view/json-view';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TViewVariant } from '@/constants';
import type { Config, ConfigSchema, TScanConfigActivity } from '@/features/scan-config/types';
import type { Json } from '@/ui/segments/detail-view/json-view';
import type { TScanConfigRegistryConfig } from '@/ui/segments/workflows/config/scan-config-binding';

import styles from './workflow-config-view.module.css';

/** What a single-coordinate config adds to the scan config it extends (obi-one `SingleConfigMixin`). */
const SINGLE_CONFIG_KEYS = [
  'idx',
  'scan_output_root',
  'coordinate_output_root',
  'obi_one_version',
  'single_coordinate_scan_params',
];

/**
 * A config as the form of its workflow's scan config. A single-coordinate config is its scan
 * config with one value per field, plus a few run keys and its own `type`; a scan config passes
 * through as it is.
 */
export function toScanConfigForm(config: Record<string, Json>, schema: ConfigSchema): Config {
  return { ...omit(config, SINGLE_CONFIG_KEYS), type: schema.properties.type.const } as Config;
}

type Props = {
  scanConfig: TScanConfigRegistryConfig;
  activity: TScanConfigActivity;
  config: Record<string, Json>;
  /** the campaign the config belongs to: it keeps the form read-only */
  campaignId: string;
  virtualLabId: string;
  projectId: string;
  variant: TViewVariant;
  /** the workflow's config and output links: shown only once the workflow form opens the config */
  links: ReactNode;
};

/**
 * Read-only view of the config a model was made with, drawn with the workflow's own editor: a
 * single-coordinate config is a strict subset of its scan config, so the same schema validates
 * it. A config the current schema rejects (saved with an earlier obi-one version) is shown as
 * JSON instead.
 */
export function WorkflowConfigView(props: Props) {
  const { schema, isLoading } = useObioneJsonSchema({ schemaName: props.scanConfig.schemaName });
  const form = useMemo(
    () => (schema ? toScanConfigForm(props.config, schema) : null),
    [schema, props.config]
  );
  const valid = useMemo(
    () => (schema && form ? compileConfigValidator(schema)(form) : false),
    [schema, form]
  );

  if (isLoading) return <div className="h-96 w-full animate-pulse rounded-2xl bg-white/10" />;
  if (!form) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note="The workflow form could not be loaded, so the configuration is shown as it was saved."
      />
    );
  }
  if (!valid) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note={`This configuration was made with obi-one ${props.config.obi_one_version ?? 'of an earlier version'} and no longer matches the workflow, so it is shown as it was saved.`}
      />
    );
  }
  return <LoadedView {...props} form={form} />;
}

function RawConfig({
  config,
  variant,
  note,
}: {
  config: Json;
  variant: TViewVariant;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm opacity-80">{note}</p>
      <JsonView value={config} variant={variant} />
    </div>
  );
}

function LoadedView({ form, ...props }: Props & { form: Config }) {
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration({
    scanConfig: props.scanConfig,
    initialConfig: form,
    virtualLabId: props.virtualLabId,
    projectId: props.projectId,
    origin: props.campaignId,
    readOnly: true,
    activity: props.activity,
    campaignOriginAction: ScanConfigCampaignOriginActionDict.View,
  });

  if (isLoading) return <div className="h-96 w-full animate-pulse rounded-2xl bg-white/10" />;
  if (error || unresolvedMessage || !ready) {
    return (
      <RawConfig
        config={props.config}
        variant={props.variant}
        note={error?.message ?? unresolvedMessage ?? 'The workflow form could not be loaded.'}
      />
    );
  }

  return (
    // the editor's own columns are h-full/flex-1 down to their roots, so this view needs to give
    // them a real height to resolve against: the live route gets one from its viewport-high grid.
    // The white backing is its own too: the live route sits on a light page, so on a dark detail
    // page variant the editor's panels would otherwise float over whatever colour is behind them.
    <div
      className={cn(
        styles.view,
        'h-[min(800px,80vh)] min-h-0 rounded-2xl bg-white p-3 text-primary-9'
      )}
    >
      {props.links}
      <ScanConfigTemplate {...ready} aiEnabled={false} hideTabs />
    </div>
  );
}
