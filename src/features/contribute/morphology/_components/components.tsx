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

interface SubjectSpeciesRecord {
  id: string;
  name: string;
  taxonomy_id: string;
}

interface SubjectRecord {
  id: string;
  name?: string;
  description?: string;
  sex?: string;
  weight?: string;
  age_value?: string;
  age_min?: string;
  age_max?: string;
  age_unit?: string;
  age_period?: string;
  species?: SubjectSpeciesRecord;
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

const fetchConsortium = async (token: string): Promise<Record<string, string> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/consortium';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Consortium request failed with status code: ${response.status}`);
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

const fetchOrganization = async (token: string): Promise<Record<string, string> | null> => {
  const headers: HeadersInit = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = 'https://staging.openbraininstitute.org/api/entitycore/organization';

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Organization request failed with status code: ${response.status}`);
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

const fetchSubjects = async (token: string): Promise<SubjectRecord[] | null> => {
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

    return jsonDataSubject.data;
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

  const params: Record<string, string | number> = {
    page_size: 1000,
  };

  const searchParams = new URLSearchParams();
  for (const key of Object.keys(params)) {
    const value = params[key];
    searchParams.append(key, String(value));
  }

  const url = 'https://staging.openbraininstitute.org/api/entitycore/mtype';
  const newUrl = `${url}?${searchParams.toString()}`;
  try {
    const response = await fetch(newUrl, { headers });
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
  const [agentType, setAgentType] = useState<string>('Person');

  const [allSpeciesStrains, setAllSpeciesStrains] = useState<Array<{
    species_id: string;
    species_name: string;
    strains: Record<string, string>;
  }> | null>(null);
  const [allAgents, setAllAgents] = useState<Record<string, string> | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Record<string, string> | null>(null);
  const [allConsortia, setAllConsortia] = useState<Record<string, string> | null>(null);
  const [allRoles, setAllRoles] = useState<Record<string, string> | null>(null);
  const [allSubjects, setAllSubjects] = useState<SubjectRecord[] | null>(null);
  const [allLicenses, setAllLicenses] = useState<Array<{ label: string; value: string }> | null>(
    null
  );
  const [allMtypes, setAllMtypes] = useState<Array<{
    mtype_pref_label: string;
    mtype_id: string;
  }> | null>(null);
  const [brainRegionName, setBrainRegionName] = useState<string | null>(null);
  const [selectedSubjectData, setSelectedSubjectData] = useState<SubjectRecord | null>(null);

  useEffect(() => {
    const errors = getRequiredFieldErrors(state, schema);
    setValidationErrors(errors);
  }, [state, schema]);

  useEffect(() => {
    if (state.subject_id && allSubjects) {
      const selected = allSubjects.find((s) => s.id === state.subject_id);
      setSelectedSubjectData(selected || null);
      if (selected?.species?.id) {
        setState((prev) => ({ ...prev, species_id: selected.species!.id }));
      } else {
        setState((prev) => ({ ...prev, species_id: undefined }));
      }
    }
  }, [state.subject_id, allSubjects, setState]);

  useEffect(() => {
    const fetchData = async () => {
      const session = await getSessionWithCheck();
      if (!session) return;

      const [
        speciesData,
        agentsData,
        organizationData,
        consortiumData,
        rolesData,
        subjectsData,
        licensesData,
        mtypesData,
      ] = await Promise.all([
        processData(session.accessToken),
        fetchAgents(session.accessToken),
        fetchOrganization(session.accessToken),
        fetchConsortium(session.accessToken),
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
      if (organizationData) {
        setAllOrganizations(organizationData);
      }
      if (consortiumData) {
        setAllConsortia(consortiumData);
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

  useEffect(() => {
    if (allSpeciesStrains && !state.species_id) {
      const defaultSpeciesId = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1';
      setState((prev) => ({ ...prev, species_id: defaultSpeciesId }));
    }
  }, [allSpeciesStrains, state.species_id, setState]);

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
    const errorClass = hasError ? 'border-red-500' : '';

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
            disabled
            className={classNames('w-full', errorClass)}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV, strain_id: undefined })); // Reset strain_id when species changes
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

      const speciesId = state.species_id as string | undefined;
      const selectedSpecies = speciesId
        ? allSpeciesStrains.find((s) => s.species_id === speciesId)
        : null;

      if (!selectedSpecies) {
        return (
          <div className="w-full">
            <Select
              disabled={disabled || !speciesId}
              className={classNames('w-full', errorClass)}
              value={state[k]}
              options={[]}
              placeholder={
                speciesId ? 'No strains found for this species' : 'Select a species first'
              }
              allowClear
            />
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
            className={classNames('w-full', errorClass)}
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
            className={classNames('w-full', errorClass)}
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
        label: subject.name ?? subject.id,
        value: subject.id,
      }));

      return (
        <div className="w-full">
          {selectedSubjectData && (
            <div className="mb-2 text-sm text-gray-500">
              <div>
                ID: <span className="font-bold">{selectedSubjectData.id}</span>
              </div>
              {selectedSubjectData.description && (
                <div>Description: {selectedSubjectData.description}</div>
              )}
              {selectedSubjectData.sex && <div>Sex: {selectedSubjectData.sex}</div>}
              {selectedSubjectData.weight && <div>Weight: {selectedSubjectData.weight} grams</div>}
              {selectedSubjectData.age_value && (
                <div>Age Value: {selectedSubjectData.age_value}</div>
              )}
              {selectedSubjectData.age_min && <div>Age Min: {selectedSubjectData.age_min}</div>}
              {selectedSubjectData.age_max && <div>Age Max: {selectedSubjectData.age_max}</div>}
              {selectedSubjectData.age_unit && <div>Age Unit: {selectedSubjectData.age_unit}</div>}
              {selectedSubjectData.age_period && (
                <div>Age Period: {selectedSubjectData.age_period}</div>
              )}
            </div>
          )}
          <Select
            disabled={disabled}
            className={classNames('w-full', errorClass)}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              const selected = allSubjects.find((s) => s.id === newV);
              setSelectedSubjectData(selected || null);
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
            className={classNames('w-full', errorClass)}
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
            className={classNames('w-full', errorClass)}
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
      let agentData = null;
      if (agentType === 'Organization') {
        agentData = allOrganizations;
      } else if (agentType === 'Consortium') {
        agentData = allConsortia;
      } else {
        agentData = allAgents;
      }

      if (!agentData) {
        return (
          <div className="w-full">
            <Input disabled value={`Loading ${agentType.toLowerCase()}s...`} />
          </div>
        );
      }

      const options = Object.entries(agentData).map(([label, value]) => ({
        label,
        value,
      }));

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={classNames('w-full', errorClass)}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }));
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder={`Select ${agentType.toLowerCase()}`}
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
            className={classNames('w-full', errorClass)}
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
            className={classNames('w-full', errorClass)}
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
          className={classNames('w-full', errorClass)}
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
    if (normalizedKey === 'agenttype') return 'AGENT TYPE';
    return v.title || k;
  }

  const isContributionSchema = schema.title === 'Contribution';
  const agentTypeOptions = [
    { label: 'Person', value: 'Person' },
    { label: 'Organization', value: 'Organization' },
    { label: 'Consortium', value: 'Consortium' },
  ];

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
        {isContributionSchema && (
          <div>
            <div className="flex items-end gap-3">
              <div className="text-base font-semibold text-gray-700 uppercase">AGENT TYPE</div>
            </div>
            <Tooltip value="Select the type of agent (Person, Organization, or Consortium)">
              <div className="w-full">
                <Select
                  disabled={disabled}
                  className="w-full"
                  onChange={(newV) => {
                    setAgentType(newV);
                    setState((prev) => ({ ...prev, agent_id: undefined }));
                  }}
                  value={agentType}
                  options={agentTypeOptions}
                  placeholder="Select an agent type"
                />
              </div>
            </Tooltip>
          </div>
        )}

        {schema.properties &&
          Object.entries(schema.properties)
            .filter(([k]) => !skip.includes(k))
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
  const tabClass =
    tab === selectedTab
      ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
      : 'text-primary-8 bg-white';

  const buttonStyles = disabled
    ? { background: '#d1d5db', cursor: 'default', color: '#9ca3af' }
    : {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      type="button"
      style={buttonStyles}
      className={classNames('min-w-[150px] px-5 py-2', extraClass, rounded, tabClass)}
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
