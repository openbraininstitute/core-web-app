'use client';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { capitalize, get, isNil } from 'es-toolkit/compat';
import { useCallback, useMemo } from 'react';

import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { getRoles } from '@/api/entitycore/queries/general/role';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { ContributionSchema } from '@/ui/segments/contribute/shared/schemas';
import { AgentType } from '@/ui/segments/contribute/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { ZodObject, ZodRawShape } from 'zod';
import type { Agent } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { IRole } from '@/api/entitycore/types/shared/role';
import type { TContribution } from '@/ui/segments/contribute/shared/schemas';
import type { TAgentType } from '@/ui/segments/contribute/shared/types';

interface IContributionSelectorProps<TSchema extends ZodObject<ZodRawShape>> {
  schema: TSchema;
}

const QUERY_FN_MAPPING = {
  [AgentType.Person.key]: getPersons,
  [AgentType.Organization.key]: getOrganizations,
  [AgentType.Consortium.key]: getConsortia,
} as const;

const AGENT_TYPE_OPTIONS = Object.entries(AgentType).map(([, value]) => ({
  label: value.label,
  value: value.key,
}));

export function ContributionSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: IContributionSelectorProps<TSchema>) {
  const form = Form.useFormInstance();
  const watchedContributions = Form.useWatch('contribution', form) as
    | Array<TContribution>
    | undefined;

  const isAddButtonDisabled = useMemo(() => {
    if (!watchedContributions || watchedContributions.length === 0) return true;
    return watchedContributions.some((contrib) => !ContributionSchema.safeParse(contrib).success);
  }, [watchedContributions]);

  const handleAddContribution = useCallback(() => {
    const current = form.getFieldValue('contribution') as Array<TContribution>;
    form.setFieldValue('contribution', [
      ...current,
      {
        agent_type: undefined,
        agent_id: undefined,
        role_id: undefined,
      },
    ]);
  }, [form]);

  const AgentTypeFormInput = SelectPopoverFormItem<TAgentType>({
    options: AGENT_TYPE_OPTIONS,
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  const AgentRoleDropdown = AsyncSelectFormItem<PaginationFilter, IRole>({
    id: 'agent-role-selector',
    dataKey: keyBuilder.roles({ roleType: 'contributor' }),
    queryFn: getRoles,
    getOptionLabel: (l) => capitalize(l.name),
    getOptionValue: (l) => l.id,
    placeholder: 'Select a role...',
    searchPlaceholder: 'Search role...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  const RenderPersonDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter, Agent>({
        id: 'agent-person-selector',
        dataKey: keyBuilder.agents({ agentType: AgentType.Person.key }),
        queryFn: QUERY_FN_MAPPING[AgentType.Person.key],
        getOptionLabel: (l) => l.pref_label,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a person...',
        searchPlaceholder: 'Search for person...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'pref_label__ilike',
      }),
    []
  );

  const RenderOrganizationDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter, Agent>({
        id: 'agent-organization-selector',
        dataKey: keyBuilder.agents({ agentType: AgentType.Organization.key }),
        queryFn: QUERY_FN_MAPPING[AgentType.Organization.key],
        getOptionLabel: (l) => l.pref_label,
        getOptionValue: (l) => l.id,
        placeholder: 'Select an organization...',
        searchPlaceholder: 'Search for organization...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'pref_label__ilike',
      }),
    []
  );

  const RenderConsortiumDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter, Agent>({
        id: 'agent-consortium-selector',
        dataKey: keyBuilder.agents({ agentType: AgentType.Consortium.key }),
        queryFn: QUERY_FN_MAPPING[AgentType.Consortium.key],
        getOptionLabel: (l) => l.pref_label,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a consortium...',
        searchPlaceholder: 'Search for consortium...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'pref_label__ilike',
      }),
    []
  );

  const agentDropdownMap = useMemo(
    () => ({
      [AgentType.Person.key]: RenderPersonDropdown,
      [AgentType.Organization.key]: RenderOrganizationDropdown,
      [AgentType.Consortium.key]: RenderConsortiumDropdown,
    }),
    [RenderPersonDropdown, RenderOrganizationDropdown, RenderConsortiumDropdown]
  );

  return (
    <div className="my-3">
      <Form.List name="contribution">
        {(fields, { remove }) => (
          <div className="mt-2 flex flex-col gap-2">
            {fields.map((field) => (
              <Card key={field.key} className="relative gap-0 p-5 shadow-sm!" borderless>
                <div className="flex items-center justify-center gap-x-5">
                  <Form.Item
                    name={[field.name, 'agent_type']}
                    label={renderLabel('Type', 'main', RequiredFieldMarker)}
                    rules={[
                      {
                        required: true,
                        validator: createZodFieldValidator(
                          schema,
                          `contribution.${field.name}.agent_type`,
                          form
                        ),
                      },
                    ]}
                    className="w-1/2"
                  >
                    <AgentTypeFormInput />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'role_id']}
                    label={renderLabel('Role', 'main', RequiredFieldMarker)}
                    rules={[
                      {
                        required: true,
                        validator: createZodFieldValidator(
                          schema,
                          `contribution.${field.name}.role_id`,
                          form
                        ),
                      },
                    ]}
                    className="w-1/2"
                  >
                    <AgentRoleDropdown />
                  </Form.Item>
                </div>
                <div className="flex w-full items-start justify-center gap-x-5">
                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const agentType = getFieldValue([
                        'contribution',
                        field.name,
                        'agent_type',
                      ]) as TAgentType;

                      if (isNil(agentType)) return null;

                      const Component = get(agentDropdownMap, agentType, () => <></>);

                      return (
                        <Form.Item
                          name={[field.name, 'agent_id']}
                          label={renderLabel('Name', 'main', RequiredFieldMarker)}
                          rules={[
                            {
                              required: true,
                              validator: createZodFieldValidator(
                                schema,
                                `contribution.${field.name}.agent_id`,
                                form
                              ),
                            },
                          ]}
                          className="min-w-0 flex-1"
                        >
                          <Component />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </div>
                <div className="flex items-center justify-end gap-x-2">
                  <Button
                    rounded
                    type="button"
                    variant="icon"
                    size="lg"
                    disabled={fields.length === 1}
                    className="hover:bg-neutral-1 bg-background disabled:text-label hover:text-destructive size-12"
                    onClick={() => remove(field.name)}
                  >
                    <DeleteOutlined />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Form.List>
      <div className="mt-4 flex items-center justify-end gap-x-2">
        <Button
          rounded
          type="button"
          variant="outline"
          size="lg"
          onClick={handleAddContribution}
          disabled={isAddButtonDisabled}
          className={cn(
            'text-primary-6 bg-background disabled:bg-neutral-1 hover:bg-neutral-1',
            'hover:border-primary-7 hover:text-primary-7 w-max',
            'disabled:text-label shrink-0',
            'not-disabled:bg-primary-9 not-disabled:text-white!',
            'not-disabled:hover:bg-primary-8'
          )}
        >
          <span>Add contribution</span>
          <PlusOutlined />
        </Button>
      </div>
    </div>
  );
}
