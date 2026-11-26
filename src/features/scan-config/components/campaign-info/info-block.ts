import { isPlainObject } from '@/features/scan-config/components/utils';
import {
  type Config,
  type ConfigSchema,
  ScanConfigUIElementDict,
} from '@/features/scan-config/types';

import type { ErrorObject } from 'ajv';

/** What the campaign is asked for as it is generated. */
export interface ICampaignInfo {
  campaign_name: string;
  campaign_description: string;
}

/**
 * The root element holding the campaign's name and description: obi-one's `block_info`. Its values
 * are not needed while the config is edited, they are asked for as the campaign is generated.
 * The prototype takes `info` for it against an obi-one that still declares it a `block_single`.
 */
export function infoBlockKey(schema: ConfigSchema | null | undefined): string | undefined {
  const declared = Object.entries(schema?.properties ?? {}).find(
    ([, element]) =>
      'ui_element' in element && element.ui_element === ScanConfigUIElementDict.BlockInfo
  )?.[0];
  return declared ?? (schema?.properties?.info ? 'info' : undefined);
}

/** An ajv error about the root element `key`: one of its fields, or the element missing altogether. */
function isErrorUnder(error: ErrorObject, key: string) {
  return (
    error.instancePath === `/${key}` ||
    error.instancePath.startsWith(`/${key}/`) ||
    (error.instancePath === '' &&
      (error.params as { missingProperty?: string }).missingProperty === key)
  );
}

/** The schema's errors without those of the `block_info`, which holds nothing up. */
export function withoutInfoErrors<T extends ErrorObject>(
  errors: T[] | null | undefined,
  schema: ConfigSchema | null | undefined
): T[] | null {
  if (!errors) return null;
  const key = infoBlockKey(schema);
  if (!key) return errors;
  const kept = errors.filter((error) => !isErrorUnder(error, key));
  return kept.length > 0 ? kept : null;
}

/** The name and description the config holds under `key`, trimmed; empty where it has none. */
export function campaignInfoOf(config: Config, key: string): ICampaignInfo {
  const block = config[key];
  const text = (field: keyof ICampaignInfo) => {
    const value = isPlainObject(block) ? block[field] : undefined;
    return typeof value === 'string' ? value.trim() : '';
  };
  return {
    campaign_name: text('campaign_name'),
    campaign_description: text('campaign_description'),
  };
}

/**
 * The config with the campaign's name and description written into its `block_info`, an empty one
 * as the form leaves it (null). The same config where that changes nothing.
 */
export function withCampaignInfo(config: Config, key: string, info: ICampaignInfo): Config {
  const held = config[key];
  const block = isPlainObject(held) ? held : {};
  const name = info.campaign_name || null;
  const description = info.campaign_description || null;
  if (
    (block.campaign_name ?? null) === name &&
    (block.campaign_description ?? null) === description
  )
    return config;
  return {
    ...config,
    [key]: { ...block, campaign_name: name, campaign_description: description },
  } as Config;
}
