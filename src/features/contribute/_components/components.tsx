import { useEffect, useState, useRef } from 'react'
import { atom, useAtom } from 'jotai'
import { InputNumber, Input, Select, Button } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import isNil from 'lodash/isNil'

import { JSONSchema } from '../types'
import { isPlainObject } from './utils'
import CircuitDetails from './circuit-details'
import Tooltip from './tooltip'

import { ICircuit } from '@/api/entitycore/types/entities/circuit'
import { classNames } from '@/util/utils'

type Primitive = null | boolean | number | string
interface Object {
  [key: string]: Primitive | Primitive[] | Object
}

export type ConfigValue = Primitive | Primitive[] | Object

export type Config = Record<string, Object | string>

// Updated structure for MTYPE classification
const MTYPE_CLASSES = [
  { mtype_pref_label: 'L23_NBC', mtype_id: '6605787b-ba14-43fd-a954-de9cff4b15a0' },
  { mtype_pref_label: 'L23_NGC', mtype_id: 'dd16dca0-e567-416b-b8b7-f8fbcaa05af0' },
  { mtype_pref_label: 'L23_PC', mtype_id: '0791edc9-7ad4-4a94-a4a5-feab9b690d7e' },
  { mtype_pref_label: 'L23_PTPC', mtype_id: '52ea242f-6591-425a-8eae-962fa0b4dfe0' },
  { mtype_pref_label: 'L23_SBC', mtype_id: 'fbb8b577-92f4-4c93-b355-0982af5a3c7c' },
  { mtype_pref_label: 'L23_STPC', mtype_id: '93be8237-9861-4870-9977-ff1cf9e7462c' },
  { mtype_pref_label: 'L2_ChC', mtype_id: '91ba3deb-1139-4bc6-a12f-6a64a0ed0e92' },
  { mtype_pref_label: 'L2_IPC', mtype_id: 'e55f12e1-807c-42f6-ba98-91d6d30c57d7' },
  { mtype_pref_label: 'L2_MC', mtype_id: 'ea51f2c8-95fc-4940-a400-c37a3ff2d9eb' },
  { mtype_pref_label: 'L2_PC', mtype_id: 'dd73956b-423e-42c5-87d9-9e2cc84356b9' },
  { mtype_pref_label: 'L2_TPC', mtype_id: '7abf03d5-30b0-41ae-a02b-1f4e26c243a8' },
  { mtype_pref_label: 'L2_TPC:A', mtype_id: '9b04acb1-4737-4088-8d22-0658414bdda1' },
  { mtype_pref_label: 'L2_TPC:B', mtype_id: '4b6862b9-c438-4dfc-a2e6-1ad4d7a00eda' },
  { mtype_pref_label: 'L3_MC', mtype_id: '52578494-b41c-499b-9717-5d11f4b2f068' },
  { mtype_pref_label: 'L3_PC', mtype_id: '87fec7dd-7a2f-400a-aee0-94d1946cf1ab' },
  { mtype_pref_label: 'L3_TPC', mtype_id: '229c31f1-a6ec-4d8c-85d3-d8175ffde109' },
  { mtype_pref_label: 'L3_TPC:A', mtype_id: 'dd346e90-7bca-4976-bf9a-303b6a94b339' },
  { mtype_pref_label: 'L3_TPC:B', mtype_id: 'a71d226c-2c56-40ee-a4be-9726fc430932' },
  { mtype_pref_label: 'L3_TPC:C', mtype_id: 'd9b7bd4d-cec9-4fec-a448-79320de89f2a' },
  { mtype_pref_label: 'L4_BP', mtype_id: 'a55f6ce7-068a-4c5e-a883-de5f4304612e' },
  { mtype_pref_label: 'L4_BTC', mtype_id: '8315d249-6678-4d55-b581-3b6f9eb48e86' },
  { mtype_pref_label: 'L4_ChC', mtype_id: '0e4f3036-0d14-4fd9-b7a8-87f5e90a9fa6' },
  { mtype_pref_label: 'L4_DBC', mtype_id: '8de61c06-31e8-4483-bd98-608bc874b369' },
  { mtype_pref_label: 'L4_LBC', mtype_id: 'bb875a91-4ae5-4f6f-b050-5ad952e9cd6c' },
  { mtype_pref_label: 'L4_MC', mtype_id: '0bdf029e-a55a-444c-a7c9-9d0ff51239a5' },
  { mtype_pref_label: 'L4_NBC', mtype_id: '72673af9-2f2b-4a9a-95dc-552777ab63b9' },
  { mtype_pref_label: 'L4_NGC', mtype_id: '41f41550-5e0e-4de7-b52d-62110c338a27' },
  { mtype_pref_label: 'L4_PC', mtype_id: 'ad5769c6-7e86-4433-8f34-9efcb4f0d182' },
  { mtype_pref_label: 'L4_SBC', mtype_id: '43a7d86b-71c5-4a10-be62-ef6cf95ca694' },
  { mtype_pref_label: 'L4_SSC', mtype_id: '400a55f7-e162-4fd1-80a0-4f2facea7cec' },
  { mtype_pref_label: 'L4_TPC', mtype_id: '02e13718-5227-4c28-b838-04dd0c2c67f2' },
  { mtype_pref_label: 'L4_UPC', mtype_id: '2ef7e0b5-39e4-441b-a72a-c7186afa7f5c' },
  { mtype_pref_label: 'L56_PC', mtype_id: '629d6d6f-93f9-43d8-8a99-277740fd8f22' },
  { mtype_pref_label: 'L5_BP', mtype_id: '7b16c860-ae76-4ddf-b093-4e28620b3712' },
]

// Helper function to check if a field value is considered "empty" or invalid
const isEmptyValue = (value: ConfigValue): boolean => {
  if (isNil(value) || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return true
  return false
}

// Helper function to validate required fields
const getRequiredFieldErrors = (
  state: Record<string, ConfigValue>,
  schema: JSONSchema,
): string[] => {
  const errors: string[] = []
  const requiredFields = schema.required || []

  requiredFields.forEach((fieldName) => {
    const value = state[fieldName]
    if (isEmptyValue(value)) {
      const fieldSchema = schema.properties?.[fieldName]
      const fieldTitle = fieldSchema?.title || fieldName
      errors.push(`${fieldTitle} is required`)
    }
  })

  return errors
}

export function JSONSchemaForm({
  disabled,
  schema,
  stateAtom,
  config,
  circuit,
  onAddReferenceClick,
  nodeId,
  currentCategory,
  onValidationChange,
}: {
  disabled: boolean
  config: Config
  schema: JSONSchema
  circuit: ICircuit | undefined | null
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>
  onAddReferenceClick: (reference: string) => void
  nodeId?: string
  currentCategory?: string
  onValidationChange?: (isValid: boolean, errors: string[]) => void
}) {
  const skip = ['type']

  const [state, setState] = useAtom(stateAtom)
  const [addingElement, setAddingElement] = useState<{ [key: string]: boolean }>({
    legacy_id: true,
  })
  const [newElement, setNewElement] = useState<{ [key: string]: number | string | null }>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  const referenceTypesToConfigKeys: Record<string, string> = {
    NeuronSetReference: 'neuron_sets',
    TimestampsReference: 'timestamps',
  }

  const referenceTypesToTitles: Record<string, string> = {
    NeuronSetReference: 'Neuron Set',
    TimestampsReference: 'Timestamps',
  }

  // Callback ref to avoid dependency issues
  const onValidationChangeRef = useRef(onValidationChange)
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange
  })

  // Validate form whenever state changes
  useEffect(() => {
    const errors = getRequiredFieldErrors(state, schema)

    // Only update if errors actually changed
    setValidationErrors((prevErrors) => {
      const errorsChanged =
        prevErrors.length !== errors.length ||
        prevErrors.some((error, index) => error !== errors[index])

      if (errorsChanged && onValidationChangeRef.current) {
        onValidationChangeRef.current(errors.length === 0, errors)
      }

      return errorsChanged ? errors : prevErrors
    })
  }, [state, schema])

  useEffect(() => {
    if (!schema.properties) return

    const initial: Record<string, ConfigValue> = {}

    Object.entries(schema.properties).forEach(([key, value]) => {
      if (key === 'type') initial[key] = value.const ?? null
      else if (key === 'legacy_id') initial[key] = []
      else if (key === 'strain_id') initial[key] = null
      else if (key === 'license_id')
        initial[key] = 'c268a20e-b78a-4332-a5e1-38e26c4454b9' // Default to undefined UUID
      else initial[key] = value.default ?? null
    })

    // Auto-populate brain region id if we're in morphology category
    if (currentCategory === 'morphology' && nodeId) {
      const brainRegionIdKey = Object.keys(schema.properties || {}).find((key) => {
        const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '')
        return (
          normalizedKey === 'brainregionid' ||
          normalizedKey === 'brain_region_id' ||
          normalizedKey === 'brainregion'
        )
      })

      if (brainRegionIdKey) {
        initial[brainRegionIdKey] = nodeId
      }
    }

    // Auto-populate species id (hardcoded mouse species ID)
    const speciesIdKey = Object.keys(schema.properties || {}).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '')
      return (
        normalizedKey === 'speciesid' ||
        normalizedKey === 'species_id' ||
        normalizedKey === 'species'
      )
    })

    if (speciesIdKey) {
      initial[speciesIdKey] = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1'
    }

    // Auto-populate atlas id
    const atlasIdKey = Object.keys(schema.properties || {}).find((key) => {
      const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '')
      return (
        normalizedKey === 'atlasid' || normalizedKey === 'atlas_id' || normalizedKey === 'atlas'
      )
    })

    if (atlasIdKey) {
      initial[atlasIdKey] = 'e3e70682-c209-4cac-a29f-6fbed82c07cd'
    }

    setState((prev) => ({ ...initial, ...prev }))
  }, [stateAtom, setState, schema.properties, nodeId, currentCategory])

  // Helper function to mark field as touched
  const markFieldTouched = (fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName))
  }

  // Helper function to check if a field has an error
  const hasFieldError = (fieldName: string): boolean => {
    const isRequired = schema.required?.includes(fieldName)
    const isTouched = touchedFields.has(fieldName)
    const isEmpty = isEmptyValue(state[fieldName])
    return isRequired && isTouched && isEmpty
  }

  // Helper function to get field error message
  const getFieldErrorMessage = (fieldName: string): string | null => {
    if (!hasFieldError(fieldName)) return null
    const fieldSchema = schema.properties?.[fieldName]
    const fieldTitle = fieldSchema?.title || fieldName
    return `${fieldTitle} is required`
  }

  function renderInput(k: string, v: JSONSchema) {
    const obj = {
      ...v,
      ...v.anyOf?.find((subv) => subv.type !== 'array' && subv.type !== 'null'),
    }
    const normalizedKey = k.toLowerCase().replace(/[\s_]/g, '')

    const fieldError = getFieldErrorMessage(k)
    const hasError = hasFieldError(k)

    const isBrainRegionIdField =
      currentCategory === 'morphology' &&
      (normalizedKey === 'brainregionid' ||
        normalizedKey === 'brain_region_id' ||
        normalizedKey === 'brainregion')
    const isSpeciesIdField =
      normalizedKey === 'speciesid' || normalizedKey === 'species_id' || normalizedKey === 'species'
    const isAtlasIdField =
      normalizedKey === 'atlasid' || normalizedKey === 'atlas_id' || normalizedKey === 'atlas'
    const isExperimentDateField =
      normalizedKey === 'experimentdate' ||
      normalizedKey === 'experiment_date' ||
      normalizedKey === 'date' ||
      v.title?.toLowerCase().includes('date')
    const isStrainIdField =
      normalizedKey === 'strainid' || normalizedKey === 'strain_id' || normalizedKey === 'strain'
    const isAgePeriodField = normalizedKey === 'ageperiod' || normalizedKey === 'age_period'
    const isLegacyIdField = normalizedKey === 'legacyid' || normalizedKey === 'legacy_id'
    const isLicenseIdField = normalizedKey === 'licenseid' || normalizedKey === 'license_id'
    const isMtypeClassIdField = normalizedKey === 'mtypeclassid'

    if (isBrainRegionIdField && nodeId) {
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full bg-gray-100 ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value={nodeId}
            readOnly
          />
        </div>
      )
    }

    if (isSpeciesIdField) {
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full bg-gray-100 ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value="b7ad4cca-4ac2-4095-9781-37fb68fe9ca1"
            readOnly
          />
        </div>
      )
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
      )
    }

    if (isExperimentDateField) {
      const formatDate = (value: string) => {
        const cleaned = value.replace(/[^\d\s-]/g, '')
        const parts = cleaned.split(/[\s-]+/).filter((part) => part.length > 0)
        if (parts.length === 0) return ''
        if (parts.length === 1) return parts[0]
        if (parts.length === 2) return `${parts[0]} ${parts[1]}`
        return parts.slice(0, 3).join(' ')
      }

      const validateDateFormat = (value: string) => {
        if (!value) return true
        const parts = value.split(' ')
        if (parts.length !== 3) return false
        const [day, month, year] = parts
        const dayNum = parseInt(day, 10)
        const monthNum = parseInt(month, 10)
        const yearNum = parseInt(year, 10)
        return (
          dayNum >= 1 &&
          dayNum <= 31 &&
          monthNum >= 1 &&
          monthNum <= 12 &&
          yearNum >= 1900 &&
          yearNum <= new Date().getFullYear()
        )
      }

      const currentValue = typeof state[k] === 'string' ? state[k] : ''
      const isValid = validateDateFormat(currentValue)
      const showDateError = !isValid && currentValue

      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            onBlur={() => markFieldTouched(k)}
            value={currentValue}
            className={`w-full ${hasError || showDateError ? 'border-red-500' : ''}`}
            onChange={(e) => {
              const formatted = formatDate(e.currentTarget.value)
              setState({ ...state, [k]: formatted })
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
      )
    }

    if (isStrainIdField) {
      const allSpeciesStrains = [
        {
          species_id: 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
          species_name: 'Mouse',
          strains: {
            'C57BL/6': '123e4567-e89b-12d3-a456-426614174000',
            'BALB/c': '456e7890-e29b-41d4-a716-446655440001',
          },
        },
        {
          species_id: '789e0123-e29b-41d4-a716-446655440002',
          species_name: 'Rat',
          strains: {
            'Sprague Dawley': '890e1234-e29b-41d4-a716-446655440003',
          },
        },
      ]

      const speciesId = 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1'
      const selectedSpecies = allSpeciesStrains.find((s) => s.species_id === speciesId)

      if (!selectedSpecies) {
        return (
          <div className="w-full">
            <Input disabled value="No strains found for this species" />
            {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
          </div>
        )
      }

      const strainOptions = Object.entries(selectedSpecies.strains).map(([name, id]) => ({
        label: name,
        value: id,
      }))

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState((prev) => ({ ...prev, [k]: newV }))
              markFieldTouched(k)
            }}
            value={state[k]}
            options={strainOptions}
            placeholder="Select a strain"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
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
                setState({ ...state, [k]: newV })
                markFieldTouched(k)
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
        )
      }
      return (
        <div className="w-full">
          <Input
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            value={typeof state[k] === 'string' ? state[k] : ''}
            onChange={(e) => {
              setState({ ...state, [k]: e.currentTarget.value })
            }}
            placeholder="Enter age period"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
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
                          const newElements = [...(Array.isArray(state[k]) ? state[k] : [])]
                          newElements.splice(newElements.indexOf(e), 1)
                          setState({ ...state, [k]: newElements })
                          markFieldTouched(k)
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
                      })
                      setAddingElement({ ...addingElement, [k]: false })
                      setNewElement({ ...newElement, [k]: null })
                      markFieldTouched(k)
                    }}
                  />
                )}
                <CloseCircleOutlined
                  onClick={() => {
                    setAddingElement({ ...addingElement, [k]: false })
                    setNewElement({ ...newElement, [k]: null })
                  }}
                  className="text-primary-8"
                />
              </div>
            )}
          </div>
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
    }

    // New condition for 'license id' field
    if (isLicenseIdField) {
      const licenseOptions = {
        undefined: 'c268a20e-b78a-4332-a5e1-38e26c4454b9',
        'CC BY-NC-SA 4.0 Deed': '9e766299-b873-4162-9207-30fcd583d933',
        'CC BY-NC 2.0 Deed': 'fafcd04d-a967-4eec-b2e1-3afb2d63a41a',
        'CC BY-NC 4.0 Deed': '1283454d-b5ad-488f-acb7-d00b9f02873d',
        'CC BY 2.0 Deed': '211ac318-504d-44b9-b250-3cae8980d2e9',
        'CC BY 4.0 Deed': 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7',
        'CC0 1.0 Deed': '74b8c953-67f5-4e95-ac58-095274901328',
        'NGV_Data Licence_v1.0': '0c39107e-3b68-4f1f-904a-5c7f1b4f89c5',
      }

      const options = Object.entries(licenseOptions).map(([name, id]) => ({
        label: name,
        value: id,
      }))

      // Find the key corresponding to the current state value to set the label
      const currentLicenseLabel = Object.keys(licenseOptions).find(
        (key) => licenseOptions[key] === state[k],
      )

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState({ ...state, [k]: newV })
              markFieldTouched(k)
            }}
            value={currentLicenseLabel || state[k]} // Use the label for display, or the value if not found
            options={options}
            placeholder="Select a license"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
    }

    // New condition for 'mtype class id'
    if (isMtypeClassIdField) {
      const options = MTYPE_CLASSES.map((mtype) => ({
        label: mtype.mtype_pref_label,
        value: mtype.mtype_id,
      }))

      const currentMtypeLabel = MTYPE_CLASSES.find(
        (mtype) => mtype.mtype_id === state[k],
      )?.mtype_pref_label

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState({ ...state, [k]: newV })
              markFieldTouched(k)
            }}
            value={currentMtypeLabel || state[k]}
            options={options}
            placeholder="Select an MTYPE CLASS"
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
    }

    if (k === 'circuit' && circuit) return <CircuitDetails circuit={circuit} />

    if (v.is_block_reference && v.properties && typeof v.properties.type.const === 'string') {
      const referenceKey = referenceTypesToConfigKeys[v.properties.type.const]
      const referenceTitle = referenceTypesToTitles[v.properties.type.const]
      if (!referenceKey) return null
      const referenceConfig = config[referenceKey]
      if (!isPlainObject(referenceConfig)) return null

      const referees = Object.entries(referenceConfig).filter(([, val]) => {
        return isPlainObject(val)
      })

      if (referees.length === 0) {
        return (
          <div className="w-full">
            <Button className="w-full" onClick={() => onAddReferenceClick(referenceKey)}>
              Add {referenceTitle}
            </Button>
            {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
          </div>
        )
      }

      const defaultV =
        isPlainObject(state[k]) && typeof state[k].block_name === 'string'
          ? state[k].block_name
          : null

      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV: string) => {
              if (!v.properties?.type.const || typeof v.properties.type.const !== 'string')
                throw new Error('Invalid reference definition')

              setState({
                ...state,
                [k]: {
                  block_name: newV,
                  type: v.properties.type.const,
                  block_dict_name: referenceKey,
                },
              })
              markFieldTouched(k)
            }}
            value={defaultV}
            options={referees.map(([subkey]) => ({
              label: subkey,
              value: subkey,
            }))}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
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
                          if (!isPlainObject(state[k]) || !Array.isArray(state[k].elements)) return

                          if (state[k].elements.length === 1) {
                            setState({ ...state, [k]: null })
                            markFieldTouched(k)
                            return
                          }

                          const newElements = [...state[k].elements]
                          newElements.splice(newElements.indexOf(e), 1)
                          setState({
                            ...state,
                            [k]: {
                              type: 'NamedTuple',
                              name: 'example_id_neuron_set',
                              elements: newElements,
                            },
                          })
                          markFieldTouched(k)
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
                    setNewElement({ ...newElement, [k]: newV })
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
                        })
                      } else if (isPlainObject(state[k]) && Array.isArray(state[k].elements)) {
                        setState({
                          ...state,
                          [k]: {
                            type: 'NamedTuple',
                            name: 'example_id_neuron_set',
                            elements: [...state[k].elements, newElement[k]],
                          },
                        })
                      }
                      setAddingElement({ ...addingElement, [k]: false })
                      setNewElement({ ...newElement, [k]: null })
                      markFieldTouched(k)
                    }}
                  />
                )}
                <CloseCircleOutlined
                  onClick={() => {
                    setAddingElement({ ...addingElement, [k]: false })
                    setNewElement({ ...newElement, [k]: null })
                  }}
                  className="text-primary-8"
                />
              </div>
            )}
          </div>
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
    }

    if (obj.enum) {
      return (
        <div className="w-full">
          <Select
            disabled={disabled}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
            onBlur={() => markFieldTouched(k)}
            onChange={(newV) => {
              setState({ ...state, [k]: newV })
              markFieldTouched(k)
            }}
            value={state[k]}
            options={obj.enum.map((subv: string) => ({
              label: subv,
              value: subv,
            }))}
            placeholder={`Select ${v.title || k}`}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
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
              setState({ ...state, [k]: value })
            }}
            onBlur={() => markFieldTouched(k)}
            className={`w-full ${hasError ? 'border-red-500' : ''}`}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
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
              setState({ ...state, [k]: e.currentTarget.value })
            }}
          />
          {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
        </div>
      )
    }

    return (
      <div className="w-full">
        <Input
          disabled={disabled}
          className={`w-full ${hasError ? 'border-red-500' : ''}`}
          onBlur={() => markFieldTouched(k)}
          value={typeof state[k] === 'string' ? state[k] : ''}
          onChange={(e) => {
            setState({ ...state, [k]: e.currentTarget.value })
          }}
          placeholder={`Enter value for ${v.title || k}`}
        />
        {fieldError && <div className="mt-1 text-sm text-red-500">{fieldError}</div>}
      </div>
    )
  }

  function getFieldTitle(k: string, v: JSONSchema, normalizedKey: string): string {
    if (normalizedKey === 'strainid' || normalizedKey === 'strain_id' || normalizedKey === 'strain')
      return 'STRAIN'
    if (normalizedKey === 'ageperiod' || normalizedKey === 'age_period') return 'AGE PERIOD'
    if (normalizedKey === 'licenseid' || normalizedKey === 'license_id') return 'LICENSE'
    if (normalizedKey === 'mtypeclassid') return 'MTYPE CLASS'
    return v.title || k
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg text-gray-500 uppercase">{schema.title}</div>
      <div className="mb-6 text-gray-500">{schema.description}</div>

      {/* Show overall validation errors summary if there are any */}
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
              return !skip.includes(k)
            })
            .map(([k, v]) => {
              const isRequired = schema.required?.includes(k)
              const normalizedKey = k.toLowerCase().replace(/[\s_]/g, '')
              const fieldTitle = getFieldTitle(k, v, normalizedKey)

              return (
                <div key={k}>
                  <div className="flex items-end gap-3">
                    <div
                      className={classNames(
                        'text-base font-semibold uppercase',
                        isRequired ? 'text-primary-9' : 'text-gray-700',
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
              )
            })}
      </div>
    </div>
  )
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
  tab: string
  selectedTab: string
  onClick?: () => void
  rounded?: 'rounded-l-full' | 'rounded-r-full' | 'rounded-full'
  children?: React.ReactNode
  extraClass?: string
  disabled?: boolean
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
          : 'text-primary-8 bg-white',
      )}
    >
      {children}
    </button>
  )
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
  )
}
