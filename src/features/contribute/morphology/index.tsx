'use client';

import {
  LoadingOutlined,
  UploadOutlined,
  CheckCircleFilled,
  WarningFilled,
  RightOutlined,
} from '@ant-design/icons';
import Ajv, { AnySchema } from 'ajv';
import { atom } from 'jotai';
import { Fragment, useMemo, useRef, useState, KeyboardEvent, useEffect } from 'react';
import { Config, ConfigValue, JSONMorphologySchemaForm } from './_components/components';
import { useConfigAtom } from './_components/hooks/config-atom';
import {
  isRootCategory,
  resolveKey,
  useObioneJsonConfigurationSchema,
} from './_components/hooks/schema';
import { Section } from './_components/section';
import { CATEGORIES, isAtom, ORDERING } from './_components/utils';
import { AtomsMap, JSONMorphologySchema } from './types';
import { resolveDataKey } from '@/utils/key-builder';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import ApiError from '@/api/error';
import authFetch from '@/authFetch';
import { useAppNotification } from '@/components/notification';
import { classNames } from '@/util/utils';
import styles from './small-microcircuit.module.css';

export default function ContributeMorphologyConfiguration({
  circuitId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
}: {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
}) {
  if (!!initialCampaignId !== !!initialConfig) {
    throw new Error('Both or none of initialCampaignId, initialConfigId should be passed');
  }

  const { node } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: 'explore', projectId }),
  });

  const [configTab, setConfigTab] = useState<string>('info');
  const [editing, setEditing] = useState(true);
  const [schema, setSchema] = useState<JSONMorphologySchema | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
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

  // Add success state
  const [isSuccess, setIsSuccess] = useState(false);

  // Add validation state
  const [formValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({
    isValid: true,
    errors: [],
  });

  // Debug log to verify selectedFile state
  useEffect(() => {
    console.log('selectedFile state:', selectedFile);
  }, [selectedFile]);

  const selectedCatSchema = schema?.properties?.[configTab]?.additionalProperties?.anyOf?.find(
    (s) => s.properties?.type.const === selectedCategory
  );

  const handleAddReferenceClick = (referenceTab: string) => {
    setConfigTab(referenceTab);
    setEditing(true);
    setSelectedCategory('');
  };

  const readOnly = initialConfig !== undefined;

  const validate = useMemo(() => {
    const ajv = new Ajv({ strictSchema: false, allErrors: true });
    if (!schema) {
      return;
    }
    return ajv.compile(schema as AnySchema);
  }, [schema]);

  const [atomsMap, setAtomsMap] = useState<AtomsMap>({});

  // Fix TS2554: Adjust useConfigAtom call to pass only schema and atomsMap
  const config = useConfigAtom(schema, atomsMap);

  if (validate && initialConfig && !initialConfigValidated.current) {
    initialConfigValidated.current = true;
    validate(initialConfig);
    if (validate.errors) {
      throw new Error('Invalid Simulation Campaign Configuration');
    }
  }

  const errors = useMemo(() => {
    if (validate) {
      validate(config);
    }
    return validate?.errors;
  }, [validate, config]);

  useObioneJsonConfigurationSchema(circuitId, notification, setSchema, setAtomsMap);

  // Update the submit button condition
  const canSubmit =
    !errors?.length && !loading && !readOnly && selectedFile && formValidation.isValid;

  // Show success page if upload was successful
  if (isSuccess) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-4 text-4xl font-bold text-green-600">
            ✓ Morphology created successfully
          </div>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="bg-primary-8 hover:bg-primary-9 rounded-full px-6 py-3 text-white transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex h-full w-full items-center justify-between">
        <LoadingOutlined />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col space-y-5 bg-gray-100 px-10 pt-6">
      <div className="w-full border-t border-gray-200" />
      <div className={styles.threeColumns}>
        <div className={styles.scrollable}>
          <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
            {/* ... form validation */}
            <div className="self-start text-gray-500 uppercase">Assets</div>
            <div
              role="button"
              tabIndex={0}
              className={classNames(
                'flex h-[50px] min-h-[50px] w-full cursor-pointer items-center justify-between rounded-full border border-gray-200 px-5 py-2 drop-shadow hover:bg-white',
                configTab === 'assets' ? 'bg-white' : 'bg-gray-50'
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
              <span className="text-primary-9 text-base">Assets</span>
              <div className="flex gap-2">
                {selectedFile ? (
                  <>
                    <CheckCircleFilled
                      className="text-green-600"
                      style={{ fontSize: '14px', visibility: 'visible' }}
                    />
                    <RightOutlined className="text-white" style={{ fontSize: '14px' }} />
                  </>
                ) : (
                  <>
                    <WarningFilled
                      className="assets-warning text-yellow-400"
                      style={{ fontSize: '14px', visibility: 'visible' }}
                    />
                    <RightOutlined className="text-primary-8" style={{ fontSize: '14px' }} />
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
                        schema={schema} // Added
                        config={config} // Added
                        errors={errors} // Added
                        atomsMap={atomsMap}
                        setAtomsMap={setAtomsMap}
                        configTab={configTab}
                        setConfigTab={setConfigTab}
                        setSelectedItemIdx={setSelectedItemIdx}
                        setEditing={setEditing}
                        setSelectedCategory={setSelectedCategory}
                        campaignId={campaignId} // Optional
                        loading={loading} // Optional
                        selectedItemIdx={selectedItemIdx} // Optional
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

                    const morphologyConfig =
                      (Array.isArray(config.morphology) && config.morphology.length > 0
                        ? config.morphology[0]
                        : {
                            brain_region_id: node.id,
                            species_id: 'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
                          }) ?? {};

                    let legacyId;

                    if (Array.isArray(morphologyConfig.legacy_id)) {
                      legacyId = morphologyConfig.legacy_id;
                    } else if (typeof morphologyConfig.legacy_id === 'string') {
                      legacyId = [morphologyConfig.legacy_id];
                    } else {
                      legacyId = [];
                    }

                    const newJson = {
                      authorized_public: false,
                      license_id:
                        morphologyConfig.license_id || 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7',
                      name: morphologyConfig.name || 'test',
                      description: morphologyConfig.description || 'string',
                      location: {
                        x: 0,
                        y: 0,
                        z: 0,
                      },
                      legacy_id: legacyId,
                      species_id:
                        morphologyConfig.species_id ||
                        morphologyConfig.species ||
                        'b7ad4cca-4ac2-4095-9781-37fb68fe9ca1',
                      strain_id: morphologyConfig.strain_id || null,
                      brain_region_id:
                        morphologyConfig.brain_region_id ||
                        morphologyConfig.brain_region ||
                        node.id,
                      subject_id:
                        morphologyConfig.subject_id || '1c71c68c-44a4-4972-955d-7e0f264425e3',
                    };

                    setNewJsonPayload(newJson);

                    const headers = {
                      accept: 'application/json',
                      'Content-Type': 'application/json',
                      'virtual-lab-id': virtualLabId || 'bf7d398c-b812-408a-a2ee-098f633f7798',
                      'project-id': projectId || '100a9a8a-5229-4f3d-aef3-6a4184c59e74',
                    };

                    // Submit JSON payload
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
                    const entityId = jsonResponseData.id;

                    // Second API call: Upload file
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
                        `https://staging.openbraininstitute.org/api/entitycore/reconstruction-morphology/${entityId}/assets`,
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

                      // Show success page instead of notification
                      setIsSuccess(true);
                    } else {
                      notification.success({
                        message: 'Record submitted successfully, no file uploaded',
                      });
                    }

                    setShowConfig(true);
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
                      }${errors?.length ? 'Form validation errors. ' : ''}${
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        console.log('File selected:', file); // Debug log
                        if (file) {
                          setSelectedFile(file);
                          setFileStatus({ message: `File selected: ${file.name}` });
                        } else {
                          setSelectedFile(null);
                          setFileStatus({});
                        }
                      }}
                    />
                  </label>
                  {fileStatus?.message && (
                    <span className="text-sm text-gray-600">{fileStatus.message}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {schema.properties &&
            schema.properties?.[configTab]?.additionalProperties?.anyOf &&
            !selectedCategory &&
            editing &&
            configTab !== 'assets' && (
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
                              ? (subValue.const ?? null)
                              : (subValue.default ?? null);
                        });
                      }
                      const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                        parseInt(subkey.split('_')[1], 10)
                      );
                      itemIndexes.sort((a, b) => a - b);
                      const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                      setSelectedItemIdx(itemIdx);
                      setAtomsMap({
                        ...atomsMap,
                        [configTab]: {
                          ...atomsMap[configTab],
                          [resolveKey(schema, configTab, itemIdx)]:
                            atom<Record<string, ConfigValue>>(initial),
                        },
                      });
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
                                ? (subValue.const ?? null)
                                : (subValue.default ?? null);
                          });
                        }
                        const itemIndexes = Object.keys(atomsMap[configTab]).map((subkey) =>
                          parseInt(subkey.split('_')[1], 10)
                        );
                        itemIndexes.sort((a, b) => a - b);
                        const itemIdx = (itemIndexes.at(-1) ?? -1) + 1;
                        setSelectedItemIdx(itemIdx);
                        setAtomsMap({
                          ...atomsMap,
                          [configTab]: {
                            ...atomsMap[configTab],
                            [resolveKey(schema, configTab, itemIdx)]:
                              atom<Record<string, ConfigValue>>(initial),
                          },
                        });
                      }
                    }}
                  >
                    <div className="text-primary-9 text-lg font-bold">{o.title}</div>
                    <div className="mt-3 text-base text-gray-700">{o.description}</div>
                  </div>
                ))}
              </div>
            )}
          {schema.properties &&
            schema.properties?.[configTab] &&
            editing &&
            (isRootCategory(schema, configTab) || selectedCatSchema) &&
            configTab !== 'assets' && (
              <JSONMorphologySchemaForm
                onAddReferenceClick={handleAddReferenceClick}
                disabled={!!campaignId || loading || readOnly}
                config={config}
                schema={
                  selectedCatSchema ??
                  schema.properties[configTab]?.additionalProperties ??
                  schema.properties[configTab]
                }
                stateAtom={
                  isAtom(atomsMap[configTab])
                    ? atomsMap[configTab]
                    : atomsMap[configTab][resolveKey(schema, configTab, selectedItemIdx)]
                }
                nodeId={node.id}
                currentCategory={configTab}
              />
            )}
        </div>
      </div>
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
  );
}
