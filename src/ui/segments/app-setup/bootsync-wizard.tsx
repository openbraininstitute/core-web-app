'use client';

import { useCallback, useState } from 'react';
import { match, P } from 'ts-pattern';

import {
  hasNoProject,
  hasNoVirtualLab,
  isAccountPayload,
  isCustomizationPayload,
  WizardSteps,
} from '@/ui/segments/app-setup/helpers';
import {
  type Props as TWorkspaceCustomization,
  WorkspaceCustomization,
} from '@/ui/segments/app-setup/workspace-customization';
import { WorkspaceIdentity } from '@/ui/segments/app-setup/workspace-identity';
import { WorkspaceProvision } from '@/ui/segments/app-setup/workspace-provision';

import type { TResolvedWorkspace, TWizardSteps } from '@/ui/segments/app-setup/helpers';
import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';

export function WorkspaceWizard({
  step,
  resolvedWorkspace,
}: {
  step: TWizardSteps;
  resolvedWorkspace: TResolvedWorkspace;
}) {
  const [sequence, setSequence] = useState<TWizardSteps>(() => step);
  const [accountSetupPayload, setAccountSetupPayload] = useState<TWorkspaceIdentitySchema>();
  const [customizationPayload, setCustomizationPayload] = useState<TWorkspaceCustomization>();

  const toProvision = useCallback((value: TWorkspaceIdentitySchema) => {
    setAccountSetupPayload(value);
    setSequence(WizardSteps.Provision);
  }, []);

  const toCustomization = useCallback((values: TWorkspaceCustomization) => {
    setCustomizationPayload(values);
    setSequence(WizardSteps.Customization);
  }, []);

  return match({
    current: sequence,
    customizationPayload,
    accountSetupPayload,
    resolvedWorkspace,
  })
    .with(
      { current: WizardSteps.Identity },
      ({ resolvedWorkspace: rw }) => {
        return hasNoVirtualLab(rw);
      },
      () => <WorkspaceIdentity data={resolvedWorkspace} move={toProvision} />
    )
    .with(
      { current: WizardSteps.Provision },
      ({ accountSetupPayload: as, resolvedWorkspace: rw }) => {
        return hasNoProject(rw) || isAccountPayload(as);
      },
      ({ accountSetupPayload: as, resolvedWorkspace: rw }) => {
        const shouldCreateVirtualLab = isAccountPayload(as) && hasNoVirtualLab(rw);
        const shouldCreateProject = hasNoProject(rw);

        return (
          <WorkspaceProvision
            accountPayload={as}
            workspaceResolution={rw}
            shouldCreateVirtualLab={shouldCreateVirtualLab}
            shouldCreateProject={shouldCreateProject}
            move={toCustomization}
          />
        );
      }
    )
    .with(
      { current: WizardSteps.Customization, customizationPayload: P.nonNullable.select('payload') },
      ({ customizationPayload: cp }) => isCustomizationPayload(cp),
      ({ payload }) => <WorkspaceCustomization {...payload} />
    )
    .otherwise(() => null);
}

export default WorkspaceWizard;
