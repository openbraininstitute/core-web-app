import { useEffect, useState } from 'react';
import { useAtom, PrimitiveAtom } from 'jotai';
import { InputNumber, Input, Select } from 'antd';
import isNil from 'lodash/isNil';

import { JSONMorphologySchema } from '../types';
import Tooltip from './tooltip';

import { classNames } from '@/util/utils';
import { getSession } from '@/authFetch';

interface SpeciesRecord {
  id: string;
  name: string;
}

interface StrainRecord {
  id: string;
  name: string;
  species_id: string;
}

interface PersonRecord {
  id: string;
  pref_label?: string;
}

interface RoleRecord {
  id: string;
  name?: string;
}

interface SubjectRecord {
  id: string;
  name?: string;
}

interface LicenseRecord {
  id: string;
  label?: string;
}

interface MtypeRecord {
  id: string;
  pref_label?: string;
  alt_label?: string;
}

interface BrainRegionResponse {
  name: string;
}

interface SpeciesData {
  data: SpeciesRecord[];
}

interface StrainData {
  data: StrainRecord[];
}

interface PersonData {
  data: PersonRecord[];
}

interface RoleData {
  data: RoleRecord[];
}

interface SubjectData {
  data: SubjectRecord[];
}

interface LicenseData {
  data: LicenseRecord[];
}

interface MtypeData {
  data: MtypeRecord[];
}

type Primitive = null | boolean | number | string | undefined;
interface Object {
  [key: string]: ConfigValue;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, ConfigValue | ConfigValue[] | Record<string, ConfigValue>>;

const getSessionWithCheck = async () => {
  const session = await getSession();
  if (!session) {
    throw new Error('Failed to get session');
  }
  return session;
};

export const isEmptyValue = (value: ConfigValue): boolean => {
  if (isNil(value) || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
  return false;
};

export const getRequiredFieldErrors = (
  state: Record<string, ConfigValue>,
  schema: JSONMorphologySchema
): string[] => {
  const errors: string[] = [];
  const requiredFields = schema.required || [];

  requiredFields.forEach((fieldName) => {
    const value = state[fieldName];
    if (isEmptyValue(value)) {
      const fieldSchema = schema.properties?.[fieldName];
      const fieldTitle = fieldSchema?.title || fieldName;
      errors.push(`${fieldTitle} is required`);
    }
  });

  return errors;
};

const processData = async (token: string): Promise<string | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const urlSpecies = 'https://staging.openbraininstitute.org/api/entitycore/species';
  const urlStrain = 'https://staging.openbraininstitute.org/api/entitycore/strain';

  let jsonDataSpecies: SpeciesData = { data: [] };
  let jsonDataStrain: StrainData = { data: [] };

  try {
    const [responseSpecies, responseStrain] = await Promise.all([
      fetch(urlSpecies, { headers }),
      fetch(urlStrain, { headers }),
    ]);

    if (!responseSpecies.ok) {
      throw new Error(`Species request failed with status code: ${responseSpecies.status}`);
    }
    if (!responseStrain.ok) {
      throw new Error(`Strain request failed with status code: ${responseStrain.status}`);
    }

    jsonDataSpecies = await responseSpecies.json();
    jsonDataStrain = await responseStrain.json();
  } catch {
    return null;
  }

  jsonDataSpecies.data.push({
    id: 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
    name: 'Generic Mus musculus',
  });
  jsonDataSpecies.data.push({
    id: '3b1c2a25-b4fb-468d-98d2-d2d431ac8b4a',
    name: 'Generic Rattus norvegicus',
  });

  const speclist: Array<{
    species_id: string;
    species_name: string;
    strains: Record<string, string>;
  }> = [];

  for (const speciesRecord of jsonDataSpecies.data) {
    if (speciesRecord.name === 'Unknown') {
      continue;
    }

    const filteredData = jsonDataStrain.data.filter((item) => item.species_id === speciesRecord.id);

    const strains: Record<string, string> = {};
    for (const strain of filteredData) {
      strains[strain.name] = strain.id;
    }

    const speciesEntry = {
      species_id: speciesRecord.id,
      species_name: speciesRecord.name,
      strains,
    };

    speclist.push(speciesEntry);
  }

  return JSON.stringify(speclist, null, 2);
};

const fetchAgents = async (token: string): Promise<Record<string, string> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/person';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Agent request failed with status code: ${response.status}`);
    }
    const jsonDataPerson: PersonData = await response.json();

    const personDict: Record<string, string> = {};
    for (const item of jsonDataPerson.data) {
      if (item.pref_label) {
        personDict[item.pref_label] = item.id;
      }
    }
    return personDict;
  } catch {
    return null;
  }
};

const fetchRoles = async (token: string): Promise<Record<string, string> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/role';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Role request failed with status code: ${response.status}`);
    }
    const jsonDataRole: RoleData = await response.json();

    const roleDict: Record<string, string> = {};
    for (const item of jsonDataRole.data) {
      if (item.name) {
        roleDict[item.name] = item.id;
      }
    }
    return roleDict;
  } catch {
    return null;
  }
};

const fetchSubjects = async (
  token: string
): Promise<Array<{ label: string; value: string }> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/subject';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Subject request failed with status code: ${response.status}`);
    }
    const jsonDataSubject: SubjectData = await response.json();

    const subjectList: Array<{ label: string; value: string }> = [];
    for (const item of jsonDataSubject.data) {
      if (item.name) {
        const subjectEntry = {
          label: item.name,
          value: item.id,
        };
        subjectList.push(subjectEntry);
      }
    }
    return subjectList;
  } catch {
    return null;
  }
};

const fetchLicenses = async (
  token: string
): Promise<Array<{ label: string; value: string }> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/license';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`License request failed with status code: ${response.status}`);
    }
    const jsonDataLicense: LicenseData = await response.json();

    const licenseList: Array<{ label: string; value: string }> = [];
    for (const item of jsonDataLicense.data) {
      if (item.label && item.label !== 'undefined') {
        const licenseEntry = {
          label: item.label,
          value: item.id,
        };
        licenseList.push(licenseEntry);
      }
    }
    return licenseList;
  } catch {
    return null;
  }
};

const fetchMtypes = async (
  token: string
): Promise<Array<{ mtype_pref_label: string; mtype_id: string }> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/mtype';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`MTYPE request failed with status code: ${response.status}`);
    }
    const jsonDataMtype: MtypeData = await response.json();

    const mtypeList: Array<{ mtype_pref_label: string; mtype_id: string }> = [];
    for (const item of jsonDataMtype.data) {
      if (item.pref_label) {
        const altLabel = item.alt_label ? ` ${item.alt_label}` : '';
        const mtypeEntry = {
          mtype_pref_label: item.pref_label + altLabel,
          mtype_id: item.id,
        };
        mtypeList.push(mtypeEntry);
      }
    }
    return mtypeList;
  } catch {
    return null;
  }
};

const fetchBrainRegion = async (token: string, brainRegionId: string): Promise<string | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = `https://staging.openbraininstitute.org/api/entitycore/brain-region/${brainRegionId}`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Brain region request failed with status code: ${response.status}`);
    }
    const jsonData: BrainRegionResponse = await response.json();
    return jsonData.name;
  } catch {
    return null;
  }
};

export function JSONMorphologySchemaForm({
  disabled,
  schema,
  stateAtom,
  nodeId,
}: {
  disabled: boolean;
  schema: JSONMorphologySchema;
  stateAtom: PrimitiveAtom<{ [key: string]: ConfigValue }>;
  nodeId?: string;
}) {
  const skip = ['type'];

  const [state, setState] = useAtom(stateAtom);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const [allSpeciesStrains, setAllSpeciesStrains] = useState<Array<{
    species_id: string;
    species_name: string;
    strains: Record<string, string>;
  }> | null>(null);
  const [allAgents, setAllAgents] = useState<Record<string, string> | null>(null);
  const [allRoles, setAllRoles] = useState<Record<string, string> | null>(null);
  const [allSubjects, setAllSubjects] = useState<Array<{ label: string; value: string }> | null>(
    null
  );
  const [allLicenses, setAllLicenses] = useState<Array<{ label: string; value: string }> | null>(
    null
  );
  const [allMtypes, setAllMtypes] = useState<Array<{
    mtype_pref_label: string;
    mtype_id: string;
  }> | null>(null);
  const [brainRegionName, setBrainRegionName] = useState<string | null>(null);

  useEffect(() => {
    const errors = getRequiredFieldErrors(state, schema);
    setValidationErrors(errors);
  }, [state, schema]);

  useEffect(() => {
    const fetchData = async () => {
      const session = await getSessionWithCheck();
      if (!session) return;

      const [speciesData, agentsData, rolesData, subjectsData, licensesData, mtypesData] =
        await Promise.all([
          processData(session.accessToken),
          fetchAgents(session.accessToken),
          fetchRoles(session.accessToken),
          fetchSubjects(session.accessToken),
          fetchLicenses(session.accessToken),
          fetchMtypes(session.accessToken),
        ]);

      let fetchedBrainRegionName = null;
      if (nodeId) {
        fetchedBrainRegionName = await fetchBrainRegion(session.accessToken, nodeId);
      }

      if (speciesData) {
        const parsedData = JSON.parse(speciesData);
        setAllSpeciesStrains(parsedData);
      }
      if (agentsData) {
        setAllAgents(agentsData);
      }
      if (rolesData) {
        setAllRoles(rolesData);
      }
      if (subjectsData) {
        setAllSubjects(subjectsData);
      }
      if (licensesData) {
        setAllLicenses(licensesData);
        if (!state.license_id) {
          const defaultLicenseId = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';
          setState((prev) => ({ ...prev, license_id: defaultLicenseId }));
        }
      }
      if (mtypesData) {
        setAllMtypes(mtypesData);
      }
      setBrainRegionName(fetchedBrainRegionName);
    };

    fetchData();
  }, [nodeId, state.license_id, setState]);

  const markFieldTouched = (field: string) => {
    setTouchedFields((prev) => new Set([...prev, field]));
  };

  function renderInput(k: string, obj: JSONMorphologySchema) {
    const normalizedKey = k.toLowerCase().replace(/[\s_]/g, '');
    const isBrainRegionIdField =
      normalizedKey === 'brainregionid' ||
      normalizedKey === 'brain_region_id' ||
      normalizedKey === 'brainregion';
    const isSpeciesIdField =
      normalizedKey === 'speciesid' ||
      normalizedKey === 'species_id' ||
      normalizedKey === 'species';
    const isStrainIdField =
      normalizedKey === 'strainid' || normalizedKey === 'strain_id' || normalizedKey === 'strain';
    const isLicenseIdField = normalizedKey === 'licenseid' || normalizedKey === 'license_id';
    const isSubjectIdField = normalizedKey === 'subjectid' || normalizedKey === 'subject_id';
    const isMtypeClassIdField = normalizedKey === 'mtypeclassid';
    const isRoleIdField =
      normalizedKey === 'roleid' || normalizedKey === 'role_id' || normalizedKey === 'role';
    const isAgentIdField =
      normalizedKey === 'agentid' || normalizedKey === 'agent_id' || normalizedKey === 'agent';

    const isRequired = schema.required?.includes(k) ?? false;
    const hasBeenTouched = touchedFields.has(k);
    const fieldError =
      hasBeenTouched && isRequired && isEmptyValue(state[k])
        ? `${obj.title || k} is required`
        : null;
    const hasError = !!fieldError;

    if (isBrainRegionIdField) {
      return (
        <div className="w-full">
          <Input disabled value={brainRegionName || 'Loading...'} />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isSpeciesIdField) {
      if (!allSpeciesStrains) {
        return (
          <div className="w-full">
            <Input disabled value="Loading species..." />
          </div>
        );
      }

      const options = allSpeciesStrains.map((species) => ({
        label: species.species_name,
        value: species.species_id,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a species"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isStrainIdField) {
      if (!allSpeciesStrains) {
        return (
          <div className="w-full">
            <Input disabled value="Loading strains..." />
          </div>
        );
      }

      const speciesId = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1';
      const selectedSpecies = allSpeciesStrains.find((s) => s.species_id === speciesId);

      if (!selectedSpecies) {
        return (
          <div className="w-full">
            <Input disabled value="No strains found for this species" />
            {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
          </div>
        );
      }

      const strainOptions = Object.entries(selectedSpecies.strains).map(([name, id]) => ({
        label: name,
        value: id,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={strainOptions}
            placeholder="Select a strain"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isLicenseIdField) {
      if (!allLicenses) {
        return (
          <div className="w-full">
            <Input disabled value="Loading licenses..." />
          </div>
        );
      }

      const options = allLicenses.map((license) => ({
        label: license.label,
        value: license.value,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a license"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isSubjectIdField) {
      if (!allSubjects) {
        return (
          <div className="w-full">
            <Input disabled value="Loading subjects..." />
          </div>
        );
      }

      const options = allSubjects.map((subject) => ({
        label: subject.label,
        value: subject.value,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a subject"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isMtypeClassIdField) {
      if (!allMtypes) {
        return (
          <div className="w-full">
            <Input disabled value="Loading MTYPE classes..." />
          </div>
        );
      }

      const options = allMtypes.map((mtype) => ({
        label: mtype.mtype_pref_label,
        value: mtype.mtype_id,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => {
                const newState = { ...prev, [k]: newV };
                return newState;
              });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select an MTYPE CLASS"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isRoleIdField) {
      if (!allRoles) {
        return (
          <div className="w-full">
            <Input disabled value="Loading roles..." />
          </div>
        );
      }

      const options = Object.entries(allRoles).map(([label, value]) => ({
        label,
        value,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a role"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isAgentIdField) {
      if (!allAgents) {
        return (
          <div className="w-full">
            <Input disabled value="Loading agents..." />
          </div>
        );
      }

      const options = Object.entries(allAgents).map(([label, value]) => ({
        label,
        value,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select an agent"
            allowClear
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (obj.type === 'number' || obj.type === 'integer') {
      return (
        <div className="w-full">
          <InputNumber
            min={obj.minimum ?? undefined}
            max={obj.maximum ?? undefined}
            disabled={disabled}
            value={typeof state[k] === 'number' ? state[k] : undefined}
            onChange={(value) => {
              setState((prev) => ({ ...prev, [k]: value }));
            }}
            onBlur={() => markFieldTouched(k)}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (obj.type === 'string') {
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value={typeof state[k] === 'string' ? state[k] : ''}
            onChange={(e) => {
              setState((prev) => ({
                ...prev,
                [k]: e.currentTarget.value,
              }));
            }}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    return (
      <div className="w-full">
        <Input
          disabled={disabled}
          className={`w-full ${hasError ? 'border-red-500' : ''}`}
          onBlur={() => markFieldTouched(k)}
          value={typeof state[k] === 'string' ? state[k] : ''}
          onChange={(e) => {
            setState((prev) => ({
              ...prev,
              [k]: e.currentTarget.value,
            }));
          }}
          placeholder={`Enter value for ${obj.title || k}`}
        />
        {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
      </div>
    );
  }

  function getFieldTitle(k: string, v: JSONMorphologySchema, normalizedKey: string): string {
    if (
      normalizedKey === 'brainregionid' ||
      normalizedKey === 'brain_region_id' ||
      normalizedKey === 'brainregion'
    )
      return 'BRAIN REGION';
    if (
      normalizedKey === 'speciesid' ||
      normalizedKey === 'species_id' ||
      normalizedKey === 'species'
    )
      return 'SPECIES';
    if (normalizedKey === 'strainid' || normalizedKey === 'strain_id' || normalizedKey === 'strain')
      return 'STRAIN';
    if (normalizedKey === 'ageperiod' || normalizedKey === 'age_period') return 'AGE PERIOD';
    if (normalizedKey === 'licenseid' || normalizedKey === 'license_id') return 'LICENSE';
    if (normalizedKey === 'mtypeclassid') return 'MTYPE CLASS';
    if (normalizedKey === 'subjectid' || normalizedKey === 'subject_id') return 'SUBJECT';
    if (normalizedKey === 'roleid' || normalizedKey === 'role_id' || normalizedKey === 'role')
      return 'ROLE';
    if (normalizedKey === 'agentid' || normalizedKey === 'agent_id' || normalizedKey === 'agent')
      return 'AGENT';

    return v.title || k;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg text-gray-500 uppercase">{schema.title}</div>
      <div className="mb-6 text-gray-500">{schema.description}</div>

      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="mb-2 font-medium text-red-800">
            Please fix the following required fields:
          </div>
          <ul className="list-inside list-disc text-sm text-red-700">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {schema.properties &&
          Object.entries(schema.properties)
            .filter(([k]) => {
              return !skip.includes(k);
            })
            .map(([k, v]) => {
              const isRequired = schema.required?.includes(k) ?? false;
              const normalizedKey = k.toLowerCase().replace(/[\s_]/g, '');
              const fieldTitle = getFieldTitle(k, v, normalizedKey);

              return (
                <div key={k}>
                  <div className="flex items-end gap-3">
                    <div
                      className={classNames(
                        'text-base font-semibold uppercase',
                        isRequired ? 'text-primary-9' : 'text-gray-700'
                      )}
                      title={v.description}
                    >
                      {fieldTitle}
                      {isRequired && <span className="ml-1 text-red-500">*</span>}
                    </div>
                    {v.units && (
                      <div className="text-lg text-gray-500">{String(v.units ?? '')}</div>
                    )}
                  </div>
                  <Tooltip value={v.description}>{renderInput(k, v)}</Tooltip>
                </div>
              );
            })}
      </div>
    </div>
  );
}

export function Tab({
  tab,
  selectedTab,
  children,
  onClick,
  rounded = 'rounded-full',
  extraClass,
  disabled,
}: {
  tab: string;
  selectedTab: string;
  onClick?: () => void;
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full';
  children?: React.ReactNode;
  extraClass?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      type="button"
      style={disabled ? { background: '#d1d5db', cursor: 'default', color: '#9ca3af' } : undefined}
      className={classNames(
        'min-w-[150px] px-5 py-2',
        extraClass,
        rounded,
        tab === selectedTab
          ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
          : 'text-primary-8 bg-white'
      )}
    >
      {children}
    </button>
  );
}

export function Chevron({ rotate }: { rotate?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
