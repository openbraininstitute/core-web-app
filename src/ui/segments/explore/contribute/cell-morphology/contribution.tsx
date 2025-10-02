import { Form } from 'antd';
import isNil from 'lodash/isNil';

import { getOrganizations } from '@/api/entitycore/queries/general/organization-agent';
import { getConsortia } from '@/api/entitycore/queries/general/consortium-agent';
import { getPersons } from '@/api/entitycore/queries/general/person-agent';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import { getRoles } from '@/api/entitycore/queries/general/role';
import {
  label,
  CellMorphologySchema,
  zodFieldValidator,
  AgentType,
  type TAgentType,
} from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';

import type { IConsortium, IOrganization, IPerson } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { IRole } from '@/api/entitycore/types/shared/role';

export function Contribution() {
  const form = Form.useFormInstance();

  const AgentTypeFormInput = SelectPopoverFormItem<TAgentType>({
    options: Object.entries(AgentType).map(([, value]) => ({
      label: value.label,
      value: value.key,
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  const PersonAgentDropdown = AsyncSelectFormItem<PaginationFilter, IPerson>({
    dataKey: ['agents', 'person'],
    queryFn: getPersons,
    getOptionLabel: (l) => l.pref_label ?? `${l.givenName} ${l.familyName}`,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a person...',
    searchPlaceholder: 'Search person...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  const OrganizationAgentDropdown = AsyncSelectFormItem<PaginationFilter, IOrganization>({
    dataKey: ['agents', 'organization'],
    queryFn: getOrganizations,
    getOptionLabel: (l) => l.pref_label ?? l.alternative_name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select an organization...',
    searchPlaceholder: 'Search organization...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  const ConsortiumAgentDropdown = AsyncSelectFormItem<PaginationFilter, IConsortium>({
    dataKey: ['agents', 'consortium'],
    queryFn: getConsortia,
    getOptionLabel: (l) => l.pref_label ?? l.alternative_name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a consortium...',
    searchPlaceholder: 'Search consortium...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
  });

  const agentDropdown = (type: TAgentType) => {
    switch (type) {
      case AgentType.Person.key:
        return <PersonAgentDropdown />;
      case AgentType.Organization.key:
        return <OrganizationAgentDropdown />;
      case AgentType.Consortium.key:
        return <ConsortiumAgentDropdown />;
      default:
        return null;
    }
  };

  const AgentRoleDropdown = AsyncSelectFormItem<PaginationFilter, IRole>({
    dataKey: ['roles'],
    queryFn: getRoles,
    getOptionLabel: (l) => l.name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a role...',
    searchPlaceholder: 'Search role...',
    clsx: { trigger: 'rounded-full  h-12', content: 'z-[99999]' },
    searchable: false,
  });

  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <Form.Item
          name={['contribution', 'agent_type']}
          label={label('Agent type', 'main', <sup className="text-destructive">*</sup>)}
          rules={[
            {
              required: true,
              validator: zodFieldValidator(CellMorphologySchema, 'contribution.agent_type', form),
            },
          ]}
          className="w-1/2"
        >
          <AgentTypeFormInput />
        </Form.Item>
        <Form.Item
          name={['contribution', 'role_id']}
          label={label('Role', 'main', <sup className="text-destructive">*</sup>)}
          rules={[
            {
              required: true,
              validator: zodFieldValidator(CellMorphologySchema, 'contribution.role_id', form),
            },
          ]}
          className="w-1/2"
        >
          <AgentRoleDropdown />
        </Form.Item>
      </div>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const agentType = getFieldValue(['contribution', 'agent_type']);
          if (isNil(agentType)) return null;
          return (
            <Form.Item
              name={['contribution', 'agent_id']}
              label={label('Agent', 'main', <sup className="text-destructive">*</sup>)}
              rules={[
                {
                  required: true,
                  validator: zodFieldValidator(CellMorphologySchema, 'contribution.agent_id', form),
                },
              ]}
            >
              {agentDropdown(agentType)}
            </Form.Item>
          );
        }}
      </Form.Item>
    </>
  );
}
