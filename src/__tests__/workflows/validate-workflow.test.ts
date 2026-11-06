import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import { ScanConfigActivity, SchemaNameDict } from '@/features/scan-config/types';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import { getWorkflow } from '@/ui/segments/workflows/config/helpers';
import {
  resolveScanConfigFromRegistry,
  ScanConfigGeneratedApiPath,
} from '@/ui/segments/workflows/config/scan-config-binding';
import { findScanConfigRegistryByTargetType } from '@/ui/segments/workflows/config/scan-config-registry';

describe('Workflows > Validate > E-model', () => {
  it('activates the Validate category with the e-model entry', () => {
    const validate = ActivityRegistry[WorkflowActivityDictValue.validate];

    expect(validate.disabled).toBe(false);
    expect(validate.workflows.map((workflow) => workflow.label)).toEqual(['E-model']);
  });

  it('is a scan-config workflow on the validate activity', () => {
    const workflow = getWorkflow({
      activity: WorkflowActivityDictValue.validate,
      targetType: ExtendedEntitiesTypeDict.EModelValidationCampaign,
    });

    expect(workflow?.scanConfig?.definition.activity).toBe(ScanConfigActivity.Validate);
    expect(workflow?.scanConfig?.schemaName).toBe(SchemaNameDict.EModelValidationScanConfig);
  });

  it('generates its campaign through the e-model validation endpoint', () => {
    const registry = findScanConfigRegistryByTargetType(
      ExtendedEntitiesTypeDict.EModelValidationCampaign
    );

    if (!registry) throw new Error('the validate workflow is not registered');

    expect(resolveScanConfigFromRegistry(registry).generatedEndpoint).toMatch(
      new RegExp(`/generated/${ScanConfigGeneratedApiPath.EModelValidation}$`)
    );
    expect(ScanConfigGeneratedApiPath.EModelValidation).toBe(
      'e-model-validation-scan-config-generate-grid'
    );
  });
});
