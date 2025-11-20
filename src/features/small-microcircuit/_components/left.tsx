import { Fragment } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Config } from './components';
import { useApiUrl, useValidateSchema } from './hooks';
import authFetch from '@/authFetch';
import { isNonEmptyCategory } from '@/features/small-microcircuit/_components/hooks/schema';
import { Section } from '@/features/small-microcircuit/_components/section';
import { CATEGORIES, ORDERING } from '@/features/small-microcircuit/_components/utils';
import { assertErrorMessage, classNames } from '@/util/utils';
import { AtomsMap, JSONSchema, TabType } from '@/features/small-microcircuit/types';
import { useAppNotification } from '@/components/notification';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { IMEModel } from '@/api/entitycore/types';
import styles from '@/features/small-microcircuit/small-microcircuit.module.css';

export default function Left({
  virtualLabId,
  projectId,
  schema,
  atomsMap,
  setAtomsMap,
  configTab,
  setConfigTab,
  config,
  campaignId,
  loading,
  selectedEntry,
  setSelectedEntry,
  setEditing,
  setSelectedCategory,
  readOnly,
  setCampaignId,
  setLoading,
  model,
  initialConfig,
  setTab,
  allEntries,
}: {
  virtualLabId: string;
  projectId: string;
  schema: JSONSchema;
  atomsMap: AtomsMap;
  setAtomsMap: React.Dispatch<React.SetStateAction<AtomsMap>>;
  configTab: string; // Key for selected section
  setConfigTab: (configTab: string) => void;
  config: Config;
  campaignId: string;
  loading: boolean;
  selectedEntry: string;
  setSelectedEntry: (selectedEntry: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  setCampaignId: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTab: React.Dispatch<React.SetStateAction<TabType>>;
  model: ICircuit | IMEModel;
  initialConfig?: Config;
  allEntries: Set<string>;
}) {
  const notification = useAppNotification();
  const apiUrl = useApiUrl({ model });
  const errors = useValidateSchema({ initialConfig, config, schema });

  return (
    <div className={styles.scrollable}>
      <div className="flex flex-grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
        {CATEGORIES.map((c) => {
          return (
            isNonEmptyCategory(c, schema) && (
              <Fragment key={c}>
                <div className="self-start text-gray-500 uppercase">{c}</div>
                {schema.properties &&
                  Object.entries(schema.properties)
                    .filter(([k]) => k !== 'type' && ORDERING[k]?.category === c)
                    .sort((a, b) => {
                      const order = (k: string) => ORDERING[k]?.order ?? 999;
                      return order(a[0]) - order(b[0]);
                    })
                    .map(([k, v]) => {
                      return (
                        <Section
                          key={k}
                          k={k}
                          schema={schema}
                          sectionSchema={v}
                          atomsMap={atomsMap}
                          setAtomsMap={setAtomsMap}
                          configTab={configTab}
                          setConfigTab={setConfigTab}
                          config={config}
                          campaignId={campaignId}
                          loading={loading}
                          errors={errors}
                          selectedEntry={selectedEntry}
                          setSelectedEntry={setSelectedEntry}
                          setEditing={setEditing}
                          setSelectedCategory={setSelectedCategory}
                          readOnly={readOnly}
                          allEntries={allEntries}
                        />
                      );
                    })}
              </Fragment>
            )
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
                `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/declared/scan_config/grid-scan-coordinate-count`,
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
