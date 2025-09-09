import { useEffect, useState } from 'react';
import { atom, useAtom } from 'jotai';
import { InputNumber, Input, Select, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import isNil from 'lodash/isNil';

import { JSONMorphologySchema } from '../types';
import { isPlainObject } from './utils';
import Tooltip from './tooltip';

import { classNames } from '@/util/utils';
import { getSession } from '@/authFetch';

// Define interfaces for API response data
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

type Primitive = null | boolean | number | string;
interface Object {
  [key: string]: Primitive | Primitive[] | Object;
}

export type ConfigValue = Primitive | Primitive[] | Object;

export type Config = Record<string, Object | string>;

// Move session fetch to a function to avoid top-level await
const getSessionWithCheck = async () => {
  const session = await getSession();
  if (!session) {
    throw new Error('Failed to get session');
  }
  return session;
};

// Export getRequiredFieldErrors so it can be used in index.tsx
export const isEmptyValue = (value: ConfigValue): boolean => {
  if (isNil(value) || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true;
  return false;
};

// Export getRequiredFieldErrors
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

  const urlSpecies = 'https://staging.openbraininstitute.org/api/entitycore/subject';
  const urlStrain = 'https://staging.openbraininstitute.org/api/entitycore/strain';

  let json_data_species: SpeciesData = { data: [] };
  let json_data_strain: StrainData = { data: [] };

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

    json_data_species = await responseSpecies.json();
    json_data_strain = await responseStrain.json();
  } catch (error) {
    console.error((error as Error).message);
    return null;
  }

  // Add the generic records as in the Python code
  json_data_species.data.push({
    id: 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
    name: 'Generic Mus musculus',
  });
  json_data_species.data.push({
    id: '3b1c2a25-b4fb-468d-98d2-d2d431ac8b4a',
    name: 'Generic Rattus norvegicus',
  });

  const speclist: Array<{
    species_id: string;
    species_name: string;
    strains: Record<string, string>;
  }> = [];

  for (const species_record of json_data_species.data) {
    if (species_record.name === 'Unknown') {
      continue;
    }

    const filtered_data = json_data_strain.data.filter(
      (item) => item.species_id === species_record.id
    );

    const strains: Record<string, string> = {};
    for (const strain of filtered_data) {
      strains[strain.name] = strain.id;
    }

    const species_entry = {
      species_id: species_record.id,
      species_name: species_record.name,
      strains,
    };

    speclist.push(species_entry);
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
    const json_data_person: PersonData = await response.json();

    const person_dict: Record<string, string> = {};
    for (const item of json_data_person.data) {
      if (item.pref_label) {
        person_dict[item.pref_label] = item.id;
      }
    }
    return person_dict;
  } catch (error) {
    console.error((error as Error).message);
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
    const json_data_role: RoleData = await response.json();

    const role_dict: Record<string, string> = {};
    for (const item of json_data_role.data) {
      if (item.name) {
        role_dict[item.name] = item.id;
      }
    }
    return role_dict;
  } catch (error) {
    console.error((error as Error).message);
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
    const json_data_subject: SubjectData = await response.json();

    const subject_list: Array<{ label: string; value: string }> = [];
    for (const item of json_data_subject.data) {
      if (item.name) {
        const subject_entry = {
          label: item.name,
          value: item.id,
        };
        subject_list.push(subject_entry);
      }
    }
    return subject_list;
  } catch (error) {
    console.error((error as Error).message);
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
    const json_data_license: LicenseData = await response.json();

    const license_list: Array<{ label: string; value: string }> = [];
    for (const item of json_data_license.data) {
      if (item.label && item.label !== 'undefined') {
        const license_entry = {
          label: item.label,
          value: item.id,
        };
        license_list.push(license_entry);
      }
    }
    return license_list;
  } catch (error) {
    console.error((error as Error).message);
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
    const json_data_mtype: MtypeData = await response.json();

    const mtype_list: Array<{ mtype_pref_label: string; mtype_id: string }> = [];
    for (const item of json_data_mtype.data) {
      if (item.pref_label) {
        const alt_label = item.alt_label ? ` ${item.alt_label}` : '';
        const mtype_entry = {
          mtype_pref_label: item.pref_label + alt_label,
          mtype_id: item.id,
        };
        mtype_list.push(mtype_entry);
      }
    }
    return mtype_list;
  } catch (error) {
    console.error((error as Error).message);
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
    const json_data: BrainRegionResponse = await response.json();
    return json_data.name;
  } catch (error) {
    console.error((error as Error).message);
    return null;
  }
};

export function JSONMorphologySchemaForm({
  disabled,
  schema,
  stateAtom,
  config,
  onAddReferenceClick,
  nodeId,
  currentCategory,
}: {
  disabled: boolean;
  config: Config;
  schema: JSONMorphologySchema;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
  onAddReferenceClick: (reference: string) => void;
  nodeId?: string;
  currentCategory?: string;
}) {
  const skip = ['type'];

  const [state, setState] = useAtom(stateAtom);
  const [addingElement, setAddingElement] = useState<{ [key: string]: boolean }>({
    legacy_id: true,
  });
  const [newElement, setNewElement] = useState<{ [key: string]: number | string | null }>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // NEW STATE TO STORE API DATA
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

  const referenceTypesToConfigKeys: Record<string, string> = {
    NeuronSetReference: 'neuron_sets',
    TimestampsReference: 'timestamps',
  };

  const referenceTypesToTitles: Record<string, string> = {
    NeuronSetReference: 'Neuron Set',
    TimestampsReference: 'Timestamps',
  };

  // Validate form whenever state changes
  useEffect(() => {
    const errors = getRequiredFieldErrors(state, schema);
    setValidationErrors(errors);
  }, [state, schema]);

  // Fetch API data on component mount
  useEffect(() => {
    const fetchData = async () => {
      const session = await getSessionWithCheck();
      if (!session) return;

      try {
        const [speciesData, agentsData, rolesData, subjectsData, licensesData, mtypesData] =
          await Promise.all([
            processData(session.accessToken),
            fetchAgents(session.accessToken),
            fetchRoles(session.accessToken),
            fetchSubjects(session.accessToken),
            fetchLicenses(session.accessToken),
            fetchMtypes(session.accessToken),
          ]);

        let brainRegionName = null;
        if (nodeId) {
          brainRegionName = await fetchBrainRegion(session.accessToken, nodeId);
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
          setState((prev) => ({
            ...prev,
            license_id: prev.license_id || 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7',
          }));
        }
        if (mtypesData) {
          setAllMtypes(mtypesData);
        }
        if (brainRegionName) {
          setBrainRegionName(brainRegionName);
        }
      } catch (error) {
        console.error((error as Error).message);
      }
    };
    fetchData();
  }, [nodeId, setState]);

  // Rest of the useEffect hook for initial state population...
  useEffect(() => {
    if (!schema.properties) return;

    const initial: Record<string, ConfigValue> = {};

    Object.entries(schema.properties).forEach(([key, value]) => {
      if (key === 'type') initial[key] = value.const ?? null;
      else if (key === 'legacy_id') initial[key] = [];
      else if (key === 'strain_id') initial[key] = null;
      else if (key === 'subject_id')
        initial[key] = '1c71c68c-44a4-4972-955d-7e0f264425e3'; // Default to first subject_id
      else if (key === 'license_id')
        initial[key] = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7'; // Default to CC BY 4.0 Deed
      else initial[key] = value.default ?? null;
    });

    if (currentCategory === 'morphology' && nodeId) {
      const brainRegionIdKey = Object.keys(schema.properties || {}).find((key) => {
        const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
        return (
          normalizedKey === 'brainregionid' ||
          normalizedKey === 'brain_region_id' ||
          normalizedKey === 'brainregion'
        );
      });

      if (brainRegionIdKey) {
        initial[brainRegionIdKey] = nodeId;
      }
    }

    const speciesIdKey = Object.keys(schema.properties || {}).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
      return (
        normalizedKey === 'speciesid' ||
        normalizedKey === 'species_id' ||
        normalizedKey === 'species'
      );
    });

    if (speciesIdKey) {
      initial[speciesIdKey] = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1';
    }

    const atlasIdKey = Object.keys(schema.properties || {}).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
      return (
        normalizedKey === 'atlasid' || normalizedKey === 'atlas_id' || normalizedKey === 'atlas'
      );
    });

    if (atlasIdKey) {
      initial[atlasIdKey] = 'e3e70682-c209-4cac-a29f-6fbed82c07cd';
    }

    setState((prev) => ({ ...initial, ...prev }));
  }, [stateAtom, setState, schema.properties, nodeId, currentCategory]);

  const markFieldTouched = (fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));
  };

  const hasFieldError = (fieldName: string): boolean => {
    const isRequired = schema.required?.includes(fieldName) ?? false;
    const isTouched = touchedFields.has(fieldName);
    const isEmpty = isEmptyValue(state[fieldName]);
    return isRequired && isTouched && isEmpty;
  };

  const getFieldErrorMessage = (fieldName: string): string | null => {
    if (!hasFieldError(fieldName)) return null;
    const fieldSchema = schema.properties?.[fieldName];
    const fieldTitle = fieldSchema?.title || fieldName;
    return `${fieldTitle} is required`;
  };

  function renderInput(k: string, v: JSONMorphologySchema) {
    const obj = {
      ...v,
      ...v.anyOf?.find((subv) => subv.type !== 'array' && subv.type !== 'null'),
    };
    const normalizedKey = k.toLowerCase().replace(/[\s_]/g, '');

    const fieldError = getFieldErrorMessage(k);
    const hasError = hasFieldError(k);

    const isBrainRegionIdField =
      currentCategory === 'morphology' &&
      (normalizedKey === 'brainregionid' ||
        normalizedKey === 'brain_region_id' ||
        normalizedKey === 'brainregion');
    const isSpeciesIdField =
      normalizedKey === 'speciesid' ||
      normalizedKey === 'species_id' ||
      normalizedKey === 'species';
    const isAtlasIdField =
      normalizedKey === 'atlasid' || normalizedKey === 'atlas_id' || normalizedKey === 'atlas';
    const isExperimentDateField =
      normalizedKey === 'experimentdate' ||
      normalizedKey === 'experiment_date' ||
      normalizedKey === 'date' ||
      v.title?.toLowerCase().includes('date');
    const isStrainIdField =
      normalizedKey === 'strainid' || normalizedKey === 'strain_id' || normalizedKey === 'strain';
    const isAgePeriodField = normalizedKey === 'ageperiod' || normalizedKey === 'age_period';
    const isLegacyIdField = normalizedKey === 'legacyid' || normalizedKey === 'legacy_id';
    const isLicenseIdField = normalizedKey === 'licenseid' || normalizedKey === 'license_id';
    const isMtypeClassIdField = normalizedKey === 'mtypeclassid';
    const isSubjectIdField = normalizedKey === 'subjectid' || normalizedKey === 'subject_id';
    const isRoleIdField =
      normalizedKey === 'roleid' || normalizedKey === 'role_id' || normalizedKey === 'role';
    const isAgentIdField =
      normalizedKey === 'agentid' || normalizedKey === 'agent_id' || normalizedKey === 'agent';

    if (isBrainRegionIdField && nodeId) {
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full bg-gray-100 ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value={brainRegionName ? brainRegionName : 'Loading...'}
            readOnly
          />
        </div>
      );
    }

    if (isSpeciesIdField) {
      const speciesId = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1';
      const selectedSpecies = allSpeciesStrains
        ? allSpeciesStrains.find((s) => s.species_id === speciesId)
        : null;
      const speciesName = selectedSpecies ? selectedSpecies.species_name : 'Loading...';

      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full bg-gray-100 ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value={speciesName}
            readOnly
          />
        </div>
      );
    }

    if (isAtlasIdField) {
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full bg-gray-100 ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value="e3e70682-c209-4cac-a29f-6fbed82c07cd"
            readOnly
          />
        </div>
      );
    }

    if (isExperimentDateField) {
      const formatDate = (value: string) => {
        const cleaned = value.replace(/[^\d\s-]/g, '');
        const parts = cleaned.split(/[\s-]+/).filter((part) => part.length > 0);
        if (parts.length === 0) return '';
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
        return parts.slice(0, 3).join(' ');
      };

      const validateDateFormat = (value: string) => {
        if (!value) return true;
        const parts = value.split(' ');
        if (parts.length !== 3) return false;
        const [day, month, year] = parts;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        return (
          dayNum >= 1 &&
          dayNum <= 31 &&
          monthNum >= 1 &&
          monthNum <= 12 &&
          yearNum >= 1900 &&
          yearNum <= new Date().getFullYear()
        );
      };

      const currentValue = typeof state[k] === 'string' ? state[k] : '';
      const isValid = validateDateFormat(currentValue);
      const showDateError = !isValid && currentValue;

      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            onBlur={() => markFieldTouched(k)}
            value={currentValue}
            className={`w-full ${hasError || showDateError ? 'border-red-500' : ''}`}
            onChange={(e) => {
              const formatted = formatDate(e.currentTarget.value);
              setState({ ...state, [k]: formatted });
            }}
            placeholder="DD MM YYYY (e.g., 15 03 2024)"
          />
          {showDateError && (
            <div className="mt-1 text-sm text-red-500">
              Please use format: DD MM YYYY (day month year)
            </div>
          )}
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
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isAgePeriodField) {
      if (obj.enum) {
        return (
          <div className="w-full">
            <Select
              disabled={disabled}
              className={`w-full ${hasError ? 'border-red-500' : ''}`}
              onBlur={() => markFieldTouched(k)}
              onChange={(newV) => {
                setState({ ...state, [k]: newV });
                markFieldTouched(k);
              }}
              value={state[k]}
              options={obj.enum.map((subv: string) => ({
                label: subv,
                value: subv,
              }))}
              placeholder="Select age period"
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
              setState({ ...state, [k]: e.currentTarget.value });
            }}
            placeholder="Enter age period"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (isLegacyIdField) {
      return (
        <div className="w-full">
          <div className="text-primary-8 mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {Array.isArray(state[k]) &&
                state[k].map((e) => (
                  <div key={e as string} className="flex gap-1">
                    {e}{' '}
                    {!disabled && (
                      <CloseCircleOutlined
                        onClick={() => {
                          const newElements = [...(Array.isArray(state[k]) ? state[k] : [])];
                          newElements.splice(newElements.indexOf(e), 1);
                          setState({ ...state, [k]: newElements });
                          markFieldTouched(k);
                        }}
                      />
                    )}
                  </div>
                ))}
            </div>
            {!addingElement[k] && !disabled && (
              <PlusCircleOutlined
                onClick={() => setAddingElement({ ...addingElement, [k]: true })}
                className="text-primary-8"
              />
            )}
            {addingElement[k] && !disabled && (
              <div className="flex gap-2">
                <Input
                  value={typeof newElement[k] === 'string' ? newElement[k] : ''}
                  onChange={(e) => setNewElement({ ...newElement, [k]: e.currentTarget.value })}
                  placeholder="Enter legacy ID"
                />
                {newElement[k] && (
                  <CheckCircleOutlined
                    className="text-primary-8"
                    onClick={() => {
                      setState({
                        ...state,
                        [k]: [...(Array.isArray(state[k]) ? state[k] : []), newElement[k]],
                      });
                      setAddingElement({ ...addingElement, [k]: false });
                      setNewElement({ ...newElement, [k]: null });
                      markFieldTouched(k);
                    }}
                  />
                )}
                <CloseCircleOutlined
                  onClick={() => {
                    setAddingElement({ ...addingElement, [k]: false });
                    setNewElement({ ...newElement, [k]: null });
                  }}
                  className="text-primary-8"
                />
              </div>
            )}
          </div>
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
              setState({ ...state, [k]: newV });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a license"
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
              setState({ ...state, [k]: newV });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a subject"
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
              setState({ ...state, [k]: newV });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select an MTYPE CLASS"
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
              setState({ ...state, [k]: newV });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select a role"
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
              setState({ ...state, [k]: newV });
              markFieldTouched(k);
            }}
            value={state[k]}
            options={options}
            placeholder="Select an agent"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (v.is_block_reference && v.properties && typeof v.properties.type.const === 'string') {
      const referenceKey = referenceTypesToConfigKeys[v.properties.type.const];
      const referenceTitle = referenceTypesToTitles[v.properties.type.const];
      if (!referenceKey) return null;
      const referenceConfig = config[referenceKey];
      if (!isPlainObject(referenceConfig)) return null;

      const referees = Object.entries(referenceConfig).filter(([, val]) => {
        return isPlainObject(val);
      });

      if (referees.length === 0) {
        return (
          <div className="w-full">
            <Button className="w-full" onClick={() => onAddReferenceClick(referenceKey)}>
              Add {referenceTitle}
            </Button>
            {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
          </div>
        );
      }

      const defaultV =
        isPlainObject(state[k]) && typeof state[k].block_name === 'string'
          ? state[k].block_name
          : null;

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV: string) => {
              if (!v.properties?.type.const || typeof v.properties.type.const !== 'string')
                throw new Error('Invalid reference definition');

              setState({
                ...state,
                [k]: {
                  block_name: newV,
                  type: v.properties.type.const,
                  block_dict_name: referenceKey,
                },
              });
              markFieldTouched(k);
            }}
            value={defaultV}
            options={referees.map(([subkey]) => ({
              label: subkey,
              value: subkey,
            }))}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (k === 'neuron_ids') {
      return (
        <div className="w-full">
          <div className="text-primary-8 mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {isPlainObject(state[k]) &&
                Array.isArray(state[k].elements) &&
                state[k].elements.map((e) => (
                  <div key={String(e)} className="flex gap-1">
                    {e}{' '}
                    {!disabled && (
                      <CloseCircleOutlined
                        onClick={() => {
                          if (!isPlainObject(state[k]) || !Array.isArray(state[k].elements)) return;

                          if (state[k].elements.length === 1) {
                            setState({ ...state, [k]: null });
                            markFieldTouched(k);
                            return;
                          }

                          const newElements = [...state[k].elements];
                          newElements.splice(newElements.indexOf(e), 1);
                          setState({
                            ...state,
                            [k]: {
                              type: 'NamedTuple',
                              name: 'example_id_neuron_set',
                              elements: newElements,
                            },
                          });
                          markFieldTouched(k);
                        }}
                      />
                    )}
                  </div>
                ))}
            </div>
            {!addingElement[k] && !disabled && (
              <PlusCircleOutlined
                onClick={() => setAddingElement({ ...addingElement, [k]: true })}
                className="text-primary-8"
              />
            )}
            {addingElement[k] && !disabled && (
              <div className="flex gap-2">
                <InputNumber
                  disabled={disabled}
                  step={1}
                  min={0}
                  onChange={(newV) => {
                    setNewElement({ ...newElement, [k]: newV });
                  }}
                />
                {!isNil(newElement[k]) && (
                  <CheckCircleOutlined
                    className="text-primary-8"
                    onClick={() => {
                      if (!state[k]) {
                        setState({
                          ...state,
                          [k]: {
                            type: 'NamedTuple',
                            name: 'example_id_neuron_set',
                            elements: [newElement[k]],
                          },
                        });
                      } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
                        setState({
                          ...state,
                          [k]: {
                            type: 'NamedTuple',
                            name: 'example_id_neuron_set',
                            elements: [...state[k].elements, newElement[k]],
                          },
                        });
                      }
                      setAddingElement({ ...addingElement, [k]: false });
                      setNewElement({ ...newElement, [k]: null });
                      markFieldTouched(k);
                    }}
                  />
                )}
                <CloseCircleOutlined
                  onClick={() => {
                    setAddingElement({ ...addingElement, [k]: false });
                    setNewElement({ ...newElement, [k]: null });
                  }}
                  className="text-primary-8"
                />
              </div>
            )}
          </div>
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      );
    }

    if (obj.type === 'number' || obj.type === 'integer') {
      return (
        <div className="w-full">
          <InputNumber
            min={obj.minimum ?? null}
            max={obj.maximum ?? null}
            disabled={disabled}
            value={typeof state[k] === 'number' ? state[k] : null}
            onChange={(value) => {
              setState({ ...state, [k]: value });
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
              setState({ ...state, [k]: e.currentTarget.value });
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
            setState({ ...state, [k]: e.currentTarget.value });
          }}
          placeholder={`Enter value for ${v.title || k}`}
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
                    {v.units && <div className="text-lg text-gray-500">{v.units}</div>}
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
