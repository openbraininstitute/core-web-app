'use client';

import {
  LoadingOutlined,
  UploadOutlined,
  CheckCircleFilled,
  WarningFilled,
  RightOutlined,
} from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import { atom, useAtom, PrimitiveAtom } from 'jotai';
import { Fragment, useMemo, useRef, useState, KeyboardEvent, useEffect } from 'react';
import { Config, ConfigValue, JSONMorphologySchemaForm } from './_components/components';
import { useConfigAtom } from './_components/hooks/config-atom';
import { isRootCategory, resolveKey, useObioneJsonSchema } from './_components/hooks/schema';
import { Section } from './_components/section';
import { CATEGORIES, ORDERING } from './_components/utils';
import { AtomsMap, JSONMorphologySchema } from './types';
import { resolveDataKey } from '@/utils/key-builder';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import ApiError from '@/api/error';
import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import { classNames } from '@/util/utils';
import styles from './small-microcircuit.module.css';

// File validation function
async function checkFileIsValid(file: File | null): Promise<boolean> {
  if (!file || !(file instanceof File)) {
    return false;
  }
  const validExtensions = ['.swc', '.asc', '.h5'];
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExtensions.includes(extension)) {
    return false;
  }
  if (!file.name || file.size === 0) {
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const headers = {
      accept: 'application/json',
      // Note: Content-Type is not set explicitly for FormData; browser sets it with boundary
    };

    const response = await authFetch(
      `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/declared/upload-neuron-file`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    const responseText = await response.text();
    try {
      JSON.parse(responseText);
    } catch (e) {
      // Ignore parsing errors for now
    }

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

export default function ContributeMorphologyConfiguration({
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
}: {
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
}) {
  if (!!initialCampaignId !== !!initialConfig) {
    throw new Error('Both or none of initialCampaignId, initialConfig should be passed');
  }

  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });

  const [configTab, setConfigTab] = useState<string>('assets');
  const [editing, setEditing] = useState(true);
  const [schema, setSchema] = useState<JSONMorphologySchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ReconstructionMorphology');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<{
    message?: string;
  }>({});
  const [newJsonPayload, setNewJsonPayload] = useState<unknown>(null);
  const notification = useAppNotification();
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? '');
  const initialConfigValidated = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [formValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({
    isValid: true,
    errors: [],
  });

  const [atomsMap, setAtomsMap] = useState<AtomsMap>(() => {
    const initial: Record<string, ConfigValue> = {
      type: 'ReconstructionMorphology',
      brain_region_id: node?.id || '',
      species_id: 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
      strain_id: undefined,
      name: '',
      description: '',
      mtype_class_id: undefined,
    };
    return {
      morphology: atom<Record<string, ConfigValue>>(initial),
    };
  });

  const config = useConfigAtom(schema, atomsMap);
  const [morphologyState] = useAtom(
    atomsMap.morphology as PrimitiveAtom<Record<string, ConfigValue>>
  );

  useEffect(() => {}, [config.morphology, morphologyState]);

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const readOnly = initialConfig !== undefined;

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema || !schema.properties) {
      return null;
    }
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  if (validate && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    validate(initialConfig);
    if (validate.errors) {
      throw new Error('Invalid Simulation Campaign Configuration');
    }
  }

  const errors = useMemo(() => {
    if (!validate || !config) {
      return [];
    }
    validate(config);
    return validate.errors ?? [];
  }, [validate, config]);

  useObioneJsonSchema(notification, setSchema, setAtomsMap, 'ContributeMorphologyForm');

  const canSubmit =
    !errors.length && !loading && !readOnly && selectedFile && formValidation.isValid;

  if (isSuccess) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-4 text-4xl font-bold text-green-600">
            ✓ Morphology created successfully
          </div>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="bg-primary-8 hover:bg-primary-9 rounded-full px-6 py-3 text-white transition-colors"
            >
              Create Another
            </button>
            {entityId && (
              <button
                type="button"
                onClick={() => {
                  const newUrl =
                    window.location.href.split('?')[0].replace('/add', '') + '/' + entityId;
                  window.location.href = newUrl;
                }}
                className="bg-primary-8 hover:bg-primary-9 rounded-full px-6 py-3 text-white transition-colors"
              >
                View the record
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!schema || !schema.properties) {
    return (
      <div className="flex h-full w-full items-center justify-between">
        <LoadingOutlined />
      </div>
    );
  }

  // Fallback schema for when selectedCatSchema is undefined
  const fallbackSchema: JSONMorphologySchema = {
    type: 'object',
    properties: {},
    required: [],
    title: 'Default Schema',
    description: 'Fallback schema when no specific schema is selected',
  };

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 px-10 pt-6">
      <div className="w-full border-t border-gray-200" />
      <div className={styles.threeColumns}>
        <div className={styles.scrollable}>
          <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
            <div className="self-start text-gray-500 uppercase">Assets</div>
            <div
              role="button"
              tabIndex={0}
              className={classNames(
                'flex h-[50px] min-h-[50px] w-full cursor-pointer items-center justify-between rounded-full border border-gray-200 px-5 py-2 drop-shadow hover:bg-white',
                configTab === 'assets'
                  ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
                  : 'bg-gray-50'
              )}
              onClick={() => {
                setConfigTab('assets');
                setEditing(true);
                setSelectedCategory('');
                setSelectedItemIdx(null);
              }}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setConfigTab('assets');
                  setEditing(true);
                  setSelectedCategory('');
                  setSelectedItemIdx(null);
                }
              }}
            >
              <span
                className={classNames(
                  'text-base',
                  configTab === 'assets' ? 'text-white' : 'text-primary-9'
                )}
              >
                Assets
              </span>
              <div className="flex gap-2">
                {selectedFile ? (
                  <>
                    <CheckCircleFilled
                      className="text-green-600"
                      style={{ fontSize: '14px', visibility: 'visible' }}
                    />
                    <RightOutlined
                      className={configTab === 'assets' ? 'text-white' : 'text-primary-8'}
                      style={{ fontSize: '14px' }}
                    />
                  </>
                ) : (
                  <>
                    <WarningFilled
                      className="assets-warning text-yellow-400"
                      style={{ fontSize: '14px', visibility: 'visible' }}
                    />
                    <RightOutlined
                      className={configTab === 'assets' ? 'text-white' : 'text-primary-8'}
                      style={{ fontSize: '14px' }}
                    />
                  </>
                )}
              </div>
            </div>
            {CATEGORIES.filter((c) => c !== 'Assets').map((c) => (
              <Fragment key={c}>
                <div className="self-start text-gray-500 uppercase">{c}</div>
                {schema.properties &&
                  Object.entries(schema.properties)
                    .filter(([k]) => k !== 'type' && ORDERING[k]?.category === c)
                    .sort((a, b) => {
                      const order = (k: string) => ORDERING[k]?.order ?? 999;
                      return order(a[0]) - order(b[0]);
                    })
                    .map(([k, v]) => (
                      <Section
                        key={k}
                        k={k}
                        sectionSchema={v}
                        _schema={schema}
                        _config={config}
                        _errors={errors}
                        atomsMap={atomsMap}
                        setAtomsMap={setAtomsMap}
                        _configTab={configTab}
                        setConfigTab={setConfigTab}
                        setSelectedItemIdx={setSelectedItemIdx}
                        setEditing={setEditing}
                        setSelectedCategory={setSelectedCategory}
                        _campaignId={campaignId}
                        _loading={loading}
                        _selectedItemIdx={selectedItemIdx}
                        isSelected={configTab === k}
                      />
                    ))}
              </Fragment>
            ))}
            {!readOnly && (
              <button
                type="button"
                className={classNames(
                  'flex min-h-[50px] w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
                  !canSubmit
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
                )}
                onClick={async () => {
                  if (loading) return;
                  if (campaignId) {
                    setCampaignId('');
                    setShowConfig(false);
                    return;
                  }

                  try {
                    setLoading(true);

                    const morphologyConfig = (config.morphology || {}) as Record<
                      string,
                      ConfigValue
                    >;
                    const subjectConfig = (config.license || {}) as Record<string, ConfigValue>;
                    const licenseConfig = (config.license || {}) as Record<string, ConfigValue>;
                    const mtypeConfig = (config.mtype || {}) as Record<string, ConfigValue>;
                    const contributionConfig = (config.contribution || {}) as Record<
                      string,
                      ConfigValue
                    >;

                    const newJson = {
                      authorized_public: false,
                      license_id:
                        licenseConfig?.license_id ?? 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7',
                      name: morphologyConfig.name || '',
                      description: morphologyConfig.description || '',
                      location: {
                        x: 0,
                        y: 0,
                        z: 0,
                      },
                      legacy_id: [],
                      species_id:
                        subjectConfig.species_id || 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
                      strain_id: subjectConfig.strain_id ?? undefined,
                      brain_region_id: morphologyConfig.brain_region_id || node?.id || '',
                      subject_id: subjectConfig.subject_id ?? undefined,
                      experiment_date: undefined,
                      mtype_class_id: mtypeConfig?.mtype_class_id ?? undefined,
                    };

                    setNewJsonPayload(newJson);

                    const headers = {
                      accept: 'application/json',
                      'Content-Type': 'application/json',
                      'virtual-lab-id': virtualLabId || 'bf7d398c-b812-408a-a2ee-098f633f7798',
                      'project-id': projectId || '100a9a8a-5229-4f3d-aef3-6a4184c59e74',
                    };

                    const jsonResponse = await authFetch(
                      'https://staging.openbraininstitute.org/api/entitycore/reconstruction-morphology',
                      {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(newJson),
                      }
                    );

                    const jsonResponseText = await jsonResponse.text();
                    if (!jsonResponse.ok) {
                      throw new ApiError(`Failed to submit JSON payload: ${jsonResponseText}`, {
                        status: jsonResponse.status,
                      });
                    }

                    const jsonResponseData = JSON.parse(jsonResponseText);
                    const newEntityId = jsonResponseData.id;
                    setEntityId(newEntityId);

                    if (selectedFile) {
                      const formData = new FormData();
                      let mimeType = 'application/octet-stream';
                      const fileName = selectedFile.name;
                      if (fileName.endsWith('.swc')) {
                        mimeType = 'application/swc';
                      } else if (fileName.endsWith('.asc')) {
                        mimeType = 'text/plain';
                      } else if (fileName.endsWith('.h5')) {
                        mimeType = 'application/x-hdf5';
                      }

                      const fileWithMimeType = new File([selectedFile], selectedFile.name, {
                        type: mimeType,
                      });
                      formData.append('file', fileWithMimeType);
                      formData.append('label', 'morphology');

                      const fileUploadHeaders = {
                        'virtual-lab-id': headers['virtual-lab-id'],
                        'project-id': headers['project-id'],
                      };

                      const fileResponse = await authFetch(
                        `https://staging.openbraininstitute.org/api/entitycore/reconstruction-morphology/${newEntityId}/assets`,
                        {
                          method: 'POST',
                          headers: fileUploadHeaders,
                          body: formData,
                        }
                      );

                      const fileResponseText = await fileResponse.text();
                      if (!fileResponse.ok) {
                        throw new ApiError(`Failed to upload file: ${fileResponseText}`, {
                          status: fileResponse.status,
                        });
                      }

                      const mtypeRequestBody = {
                        authorized_public: true,
                        entity_id: newEntityId,
                        mtype_class_id: mtypeConfig?.mtype_class_id ?? undefined,
                      };

                      const fileUploadMtypeHeaders = {
                        'virtual-lab-id': headers['virtual-lab-id'],
                        'project-id': headers['project-id'],
                        'Content-Type': 'application/json',
                      };
                      const fileResponseMtype = await authFetch(
                        `https://staging.openbraininstitute.org/api/entitycore/mtype-classification`,
                        {
                          method: 'POST',
                          headers: fileUploadMtypeHeaders,
                          body: JSON.stringify(mtypeRequestBody),
                        }
                      );
                      const fileResponseMtypeText = await fileResponseMtype.text();
                      if (!fileResponseMtype.ok) {
                        throw new ApiError(`Failed to upload file: ${fileResponseMtypeText}`, {
                          status: fileResponseMtype.status,
                        });
                      }

                      const contributionRequestBody = {
                        entity_id: newEntityId,
                        agent_id: contributionConfig?.agent_id ?? undefined,
                        role_id: contributionConfig?.role_id ?? undefined,
                      };

                      const fileUploadContributionHeaders = {
                        'virtual-lab-id': headers['virtual-lab-id'],
                        'project-id': headers['project-id'],
                        'Content-Type': 'application/json',
                      };
                      const fileResponseContribution = await authFetch(
                        `https://staging.openbraininstitute.org/api/entitycore/contribution`,
                        {
                          method: 'POST',
                          headers: fileUploadContributionHeaders,
                          body: JSON.stringify(contributionRequestBody),
                        }
                      );
                      const fileResponseContributionText = await fileResponseContribution.text();
                      if (!fileResponseContribution.ok) {
                        throw new ApiError(
                          `Failed to upload file: ${fileResponseContributionText}`,
                          {
                            status: fileResponseContribution.status,
                          }
                        );
                      }

                      setIsSuccess(true);
                    } else {
                      notification.success({
                        message: 'Record submitted successfully, no file uploaded',
                      });
                    }
                  } catch (error) {
                    notification.error({
                      message: 'Failed to submit record',
                      description:
                        error instanceof ApiError && error.cause
                          ? `${error.message} (Status: ${error.cause?.status ?? 'N/A'})`
                          : String(error),
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!canSubmit}
                title={
                  !canSubmit
                    ? `Cannot submit: ${!selectedFile ? 'No file selected. ' : ''}${
                        !formValidation.isValid ? 'Required fields missing. ' : ''
                      }${errors.length ? 'Form validation errors. ' : ''}${
                        loading ? 'Loading...' : ''
                      }`.trim()
                    : 'Submit record'
                }
              >
                <div className="flex justify-between gap-5">
                  {campaignId ? 'New simulation campaign' : 'Submit record'}
                  {loading && <LoadingOutlined />}
                </div>
              </button>
            )}
          </div>
        </div>
        <div
          className={classNames(
            styles.scrollable,
            'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
          )}
        >
          {configTab === 'assets' && editing && (
            <div className="flex flex-col gap-5 p-5">
              <div className="text-base font-normal text-gray-900 uppercase">
                UPLOAD MORPHOLOGY FILE
              </div>
              <div className="mt-3 text-base text-gray-700">
                One reference file should be loaded.
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="file-upload"
                    className={classNames(
                      'flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-sm',
                      loading || readOnly
                        ? 'cursor-not-allowed bg-gray-300 text-gray-500 opacity-50'
                        : 'bg-primary-8 hover:bg-primary-9 text-white'
                    )}
                  >
                    <UploadOutlined className="mr-2" />
                    Upload swc, asc, or h5
                    <input
                      id="file-upload"
                      type="file"
                      accept=".swc,.asc,.h5"
                      className="hidden"
                      disabled={loading || readOnly}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const isValid = await checkFileIsValid(file);
                          if (isValid) {
                            setSelectedFile(file);
                            setFileStatus({ message: `File selected: ${file.name}` });
                          } else {
                            let errorDescription = `The file ${file.name} is not valid.`;
                            if (!file.name || file.size === 0) {
                              errorDescription = `The file ${file.name} is empty or has no name.`;
                            } else if (
                              !['.swc', '.asc', '.h5'].includes(
                                file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
                              )
                            ) {
                              errorDescription = `The file ${file.name} has an invalid extension. Please select a .swc, .asc, or .h5 file.`;
                            } else {
                              errorDescription = `The file ${file.name} could not be validated by the server. Please ensure it is a valid .swc, .asc, or .h5 file or check your server configuration.`;
                            }
                            notification.error({
                              message: 'Invalid File',
                              description: errorDescription,
                            });
                            setSelectedFile(null);
                            setFileStatus({ message: `Invalid file selected: ${file.name}` });
                            e.target.value = '';
                          }
                        } else {
                          setSelectedFile(null);
                          setFileStatus({});
                        }
                      }}
                    />
                  </label>
                  {fileStatus?.message && (
                    <span
                      className={classNames(
                        'text-sm',
                        fileStatus.message.includes('Invalid') ? 'text-red-500' : 'text-gray-600'
                      )}
                    >
                      {fileStatus.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {configTab !== 'assets' && editing && (
            <JSONMorphologySchemaForm
              disabled={!!campaignId || loading || readOnly}
              schema={
                isRootCategory(schema, configTab)
                  ? schema.properties[configTab]
                  : (selectedCatSchema ?? fallbackSchema)
              }
              stateAtom={
                isRootCategory(schema, configTab)
                  ? (atomsMap[configTab] as PrimitiveAtom<Record<string, ConfigValue>>)
                  : (
                      atomsMap[configTab] as Record<
                        string,
                        PrimitiveAtom<Record<string, ConfigValue>>
                      >
                    )[resolveKey(schema, configTab, selectedItemIdx)]
              }
              nodeId={node?.id}
            />
          )}
          {configTab !== 'assets' &&
            editing &&
            !isRootCategory(schema, configTab) &&
            !selectedCatSchema &&
            schema.properties[configTab]?.additionalProperties?.anyOf && (
              <div className="flex flex-col items-center gap-5">
                {schema.properties[configTab].additionalProperties.anyOf.map((o) => (
                  <div
                    key={o.title}
                    role="button"
                    tabIndex={0}
                    className="min-h-[100px] w-full cursor-pointer rounded-xl border border-gray-200 p-5 hover:bg-white"
                    onClick={() => {
                      if (isRootCategory(schema, configTab)) return;
                      setSelectedCategory(o.properties?.type.const ?? '');
                      const initial: Record<string, ConfigValue> = {};
                      if (o.properties) {
                        Object.entries(o.properties).forEach(([subkey, subValue]) => {
                          initial[subkey] =
                            subkey === 'type'
                              ? (subValue.const ?? undefined)
                              : (subValue.default ?? undefined);
                        });
                      }
                      const itemIndexes = Object.keys(atomsMap[configTab] || {}).map((subkey) =>
                        parseInt(subkey.split('_')[1], 10)
                      );
                      itemIndexes.sort((a, b) => a - b);
                      const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                      setSelectedItemIdx(itemIdx);
                      setAtomsMap((prev) => ({
                        ...prev,
                        [configTab]: {
                          ...(prev[configTab] as Record<
                            string,
                            PrimitiveAtom<Record<string, ConfigValue>>
                          >),
                          [resolveKey(schema, configTab, itemIdx)]:
                            atom<Record<string, ConfigValue>>(initial),
                        },
                      }));
                    }}
                    onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (isRootCategory(schema, configTab)) return;
                        setSelectedCategory(o.properties?.type.const ?? '');
                        const initial: Record<string, ConfigValue> = {};
                        if (o.properties) {
                          Object.entries(o.properties).forEach(([subkey, subValue]) => {
                            initial[subkey] =
                              subkey === 'type'
                                ? (subValue.const ?? undefined)
                                : (subValue.default ?? undefined);
                          });
                        }
                        const itemIndexes = Object.keys(atomsMap[configTab] || {}).map((subkey) =>
                          parseInt(subkey.split('_')[1], 10)
                        );
                        itemIndexes.sort((a, b) => a - b);
                        const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                        setSelectedItemIdx(itemIdx);
                        setAtomsMap((prev) => ({
                          ...prev,
                          [configTab]: {
                            ...(prev[configTab] as Record<
                              string,
                              PrimitiveAtom<Record<string, ConfigValue>>
                            >),
                            [resolveKey(schema, configTab, itemIdx)]:
                              atom<Record<string, ConfigValue>>(initial),
                          },
                        }));
                      }
                    }}
                  >
                    <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                    <div className="mt-3 text-base text-gray-700">{o.description}</div>
                  </div>
                ))}
              </div>
            )}
          {showConfig && (
            <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
              <div className="max-h-[80vh] max-w-4xl overflow-auto rounded-lg bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">New Record JSON</h2>
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="text-2xl text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">
                  {JSON.stringify(newJsonPayload, null, 2)}
                </pre>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
