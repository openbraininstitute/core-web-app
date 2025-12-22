'use client';

import { type ComponentProps, useState } from 'react';
import { match, P } from 'ts-pattern';
import type { TResolvedWorkspace, TWizardSteps } from '@/ui/segments/app-setup/helpers';
import {
  hasNoProject,
  hasNoVirtualLab,
  isAccountPayload,
  isCustomizationPayload,
  WizardSteps,
} from '@/ui/segments/app-setup/helpers';
import { WorkspaceCustomization } from '@/ui/segments/app-setup/workspace-customization';
import type { TWorkspaceIdentitySchema } from '@/ui/segments/app-setup/workspace-identity';
import { WorkspaceIdentity } from '@/ui/segments/app-setup/workspace-identity';
import { WorkspaceProvision } from '@/ui/segments/app-setup/workspace-provision';
import type { Prettify } from '@/utils/type';

type FinalStepProps = Prettify<ComponentProps<typeof WorkspaceCustomization>>;

export function WorkspaceWizard({
  step,
  resolvedWorkspace,
}: {
  step: TWizardSteps;
  resolvedWorkspace: TResolvedWorkspace;
}) {
  const [sequence, setSequence] = useState<TWizardSteps>(() => step);
  const [accountSetupPayload, setAccountSetupPayload] = useState<TWorkspaceIdentitySchema>();
  const [customizationPayload, setCustomizationPayload] = useState<FinalStepProps>();

  const toProvision = (value: TWorkspaceIdentitySchema) => {
    setAccountSetupPayload(value);
    setSequence(WizardSteps.Provision);
  };

  const toCustomization = (values: FinalStepProps) => {
    setCustomizationPayload(values);
    setSequence(WizardSteps.Customization);
  };

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
      {
        current: WizardSteps.Customization,
        customizationPayload: P.nonNullable.select('payload'),
      },
      ({ customizationPayload: cp }) => isCustomizationPayload(cp),
      // eslint-disable-next-line react/jsx-props-no-spreading
      ({ payload }) => <WorkspaceCustomization {...payload} />
    )
    .otherwise(() => null);
}

export default WorkspaceWizard;
