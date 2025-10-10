import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback } from 'react';
import { Form } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';
import isNil from 'es-toolkit/compat/isNil';

import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { getRoles } from '@/api/entitycore/queries/general/role';
import {
  label,
  CellMorphologySchema,
  zodFieldValidator,
  AgentType,
  type TAgentType,
  type TCellMorphologyForm,
  TContribution,
  ContributionSchema,
} from '@/ui/segments/contribute/cell-morphology/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { Button } from '@/ui/molecules/button';
import { Card } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { Agent } from '@/api/entitycore/types/shared/global';
import type { IRole } from '@/api/entitycore/types/shared/role';

const queryFnMapping = {
  [AgentType.Person.key]: getPersons,
  [AgentType.Organization.key]: getOrganizations,
  [AgentType.Consortium.key]: getConsortia,
};

export function Contribution() {
  const form = Form.useFormInstance<TCellMorphologyForm>();

  const agentTypeOptions = Object.entries(AgentType).map(([, value]) => ({
    label: value.label,
    value: value.key,
  }));

  const AgentTypeFormInput = SelectPopoverFormItem<TAgentType>({
    options: agentTypeOptions,
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  const AgentRoleDropdown = AsyncSelectFormItem<PaginationFilter, IRole>({
    dataKey: keyBuilder.roles({ roleType: 'contributor' }),
    queryFn: getRoles,
    getOptionLabel: (l) => capitalize(l.name),
    getOptionValue: (l) => l.id,
    placeholder: 'Select a role...',
    searchPlaceholder: 'Search role...',
    clsx: { trigger: 'rounded-full  h-12', content: 'z-[99999]' },
    searchable: false,
  });

  const renderAgentDropdown = useCallback((type: TAgentType) => {
    const AgentDropdown = AsyncSelectFormItem<PaginationFilter, Agent>({
      dataKey: keyBuilder.agents({ agentType: type }),
      queryFn: queryFnMapping[type],
      getOptionLabel: (l) => l.pref_label,
      getOptionValue: (l) => l.id,
      placeholder: `Select a ${Object.values(AgentType).find((t) => t.key === type)?.label}...`,
      searchPlaceholder: `Search for ${Object.values(AgentType).find((t) => t.key === type)?.label}...`,
      clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
      searchable: false,
    });

    return <AgentDropdown />;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="my-3">
      <Form.List name="contribution">
        {(fields, { remove }) => {
          return (
            <div className="mt-2 flex flex-col gap-2">
              {fields.map((o) => {
                return (
                  <Card key={o.key} className="relative gap-0 p-5 shadow-sm!" borderless>
                    <div className="flex items-center justify-center gap-x-5">
                      <Form.Item
                        name={[o.name, 'agent_type']}
                        label={label('Type', 'main', <sup className="text-destructive">*</sup>)}
                        rules={[
                          {
                            required: true,
                            validator: zodFieldValidator(
                              CellMorphologySchema,
                              `contribution.${o.name}.agent_type`,
                              form
                            ),
                          },
                        ]}
                        className="w-1/2"
                      >
                        <AgentTypeFormInput />
                      </Form.Item>
                      <Form.Item
                        name={[o.name, 'role_id']}
                        label={label('Role', 'main', <sup className="text-destructive">*</sup>)}
                        rules={[
                          {
                            required: true,
                            validator: zodFieldValidator(
                              CellMorphologySchema,
                              `contribution.${o.name}.role_id`,
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
                          const agentType = getFieldValue(['contribution', o.name, 'agent_type']);
                          if (isNil(agentType)) return null;
                          return (
                            <Form.Item
                              name={[o.name, 'agent_id']}
                              label={label(
                                'Name',
                                'main',
                                <sup className="text-destructive">*</sup>
                              )}
                              rules={[
                                {
                                  required: true,
                                  validator: zodFieldValidator(
                                    CellMorphologySchema,
                                    `contribution.${o.name}.agent_id`,
                                    form
                                  ),
                                },
                              ]}
                              className="min-w-0 flex-1"
                            >
                              {renderAgentDropdown(agentType)}
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
                        onClick={() => remove(o.name)}
                      >
                        <DeleteOutlined />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        }}
      </Form.List>
      <div className="mt-4 flex items-center justify-end gap-x-2">
        <Button
          rounded
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            const current = form.getFieldValue('contribution') as Array<TContribution>;
            form.setFieldValue('contribution', [
              ...current,
              { agent_type: undefined, agent_id: undefined, role_id: undefined },
            ]);
          }}
          disabled={(() => {
            const contributions = form.getFieldValue('contribution') as Array<TContribution>;
            return contributions.some(
              (contrib) => ContributionSchema.required().safeParse(contrib).success === false
            );
          })()}
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
