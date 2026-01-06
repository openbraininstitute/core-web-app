import { Fragment } from 'react';
import { LoadingOutlined } from '@ant-design/icons';

import { Config } from './components';
import { useApiUrl, useValidateSchema } from './hooks';

import { config as appConfig } from '@/config';
import authFetch from '@/auth-fetch';
import { Section } from '@/features/scan-config/_components/section';
import { assertErrorMessage, classNames } from '@/util/utils';
import { AtomsMap, ConfigSchema, isType, TabType } from '@/features/scan-config/types';
import { useAppNotification } from '@/components/notification';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';

import styles from '@/features/scan-config/scan-config.module.css';

export default function Left({
  virtualLabId,
  projectId,
  schema,
  atomsMap,
  setAtomsMap,
  selectedRootElement,
  setSelectedRootElement,
  config,
  campaignId,
  loading,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  setSelectedBlock,
  readOnly,
  setCampaignId,
  setLoading,
  model,
  initialConfig,
  setTab,
  allEntries,
  newKey,
  setNewKey,
  isEditingKey,
  setIsEditingKey,
}: {
  virtualLabId: string;
  projectId: string;
  schema: ConfigSchema;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  selectedRootElement: string;
  setSelectedRootElement: (rootElement: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedBlock: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  setCampaignId: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTab: React.Dispatch<React.SetStateAction<TabType>>;
  model: ICircuit | IMEModel;
  initialConfig?: Config;
  allEntries: Set<string>;
  newKey: string;
  setNewKey: (k: string) => void;
  isEditingKey: boolean;
  setIsEditingKey: (k: boolean) => void;
}) {
  const notification = useAppNotification();
  const apiUrl = useApiUrl({ model });
  const errors = useValidateSchema({ initialConfig, config, schema });

  return (
    <div className={styles.scrollable}>
      <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
        {schema.group_order.map((group) => {
          return (
            <Fragment key={group}>
              <div className="self-start text-gray-500 uppercase">{group}</div>
              {schema.properties &&
                Object.entries(schema.properties)
                  .filter(
                    ([_, root_element]) => 'group' in root_element && root_element.group === group
                  )
                  .sort(([_, a], [__, b]) => {
                    if (isType(a) || isType(b)) return 0;

                    return a.group_order - b.group_order;
                  })
                  .map(([k, root_element]) => {
                    if (isType(root_element)) return null;
                    return (
                      <Section
                        key={k}
                        k={k}
                        schema={schema}
                        sectionSchema={root_element}
                        atomsMap={atomsMap}
                        setAtomsMap={setAtomsMap}
                        selectedRootElement={selectedRootElement}
                        setSelectedRootElement={setSelectedRootElement}
                        config={config}
                        campaignId={campaignId}
                        loading={loading}
                        errors={errors}
                        selectedEntry={selectedEntry}
                        setSelectedEntry={setSelectedEntry}
                        setEditing={setEditing}
                        setSelectedBlock={setSelectedBlock}
                        readOnly={readOnly}
                        allEntries={allEntries}
                        newKey={newKey}
                        setNewKey={setNewKey}
                        isEditingKey={isEditingKey}
                        setIsEditingKey={setIsEditingKey}
                      />
                    );
                  })}
            </Fragment>
          );
        })}
      </div>

      {!readOnly && (
        <button
          type="button"
          className={classNames(
            'flex min-h-[50px] w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
            (errors && errors.length > 0) || loading
              ? 'bg-gray-300 text-gray-500'
              : 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white'
          )}
          onClick={async () => {
            if (loading) return;
            if (campaignId) {
              setCampaignId('');
              return;
            }

            setLoading(true);
            try {
              const configCopy = { ...config };
              configCopy.type = 'CircuitSimulationScanConfig';

              const coordinateCountRes = await authFetch(
                `${appConfig.OBI_ONE_URL}/declared/scan_config/grid-scan-coordinate-count`,
                {
                  method: 'POST',
                  body: JSON.stringify(config),
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'virtual-lab-id': virtualLabId,
                    'project-id': projectId,
                  },
                }
              );

              if (coordinateCountRes.status !== 200) {
                const message = await coordinateCountRes.json();
                notification.error({
                  message: 'An error ocurred generating the simulation campaign',
                  description: message.detail,
                });
                return;
              }

              const res = await authFetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify(config),
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  'virtual-lab-id': virtualLabId,
                  'project-id': projectId,
                },
              });

              if (res.status !== 200) {
                const errorRes = await res.json();

                const details =
                  res.status === 500 ? errorRes.detail : (errorRes?.details?.[0].msg ?? '');

                notification.error({
                  message: 'An error ocurred generating the simulation campaign',
                  description: details,
                });
                return;
              }

              const returnedCampaignId = (await res.json()) as string;
              if (returnedCampaignId === '') {
                notification.error({
                  message: 'An error ocurred generating the simulation campaign',
                });
                return;
              }

              setCampaignId(returnedCampaignId);
              setTab('simulations');
            } catch (e) {
              notification.error({ message: assertErrorMessage(e) });
              return;
            } finally {
              setLoading(false);
            }
          }}
          disabled={!!(errors && errors.length > 0) || loading || readOnly}
        >
          <div className="flex justify-between gap-5">
            {!campaignId ? 'Generate simulations' : 'New simulation campaign'}
            {loading && <LoadingOutlined />}
          </div>
        </button>
      )}
    </div>
  );
}
