import $RefParser from '@apidevtools/json-schema-ref-parser';
import { NotificationInstance } from 'antd/es/notification/interface';
import { atom } from 'jotai';
import React, { useState } from 'react';
import { match } from 'ts-pattern';
import { useSchemaName } from '.';

import { EntityTypeDict, IMEModel } from '@/api/entitycore/types';
import { CircuitScaleDictionary, ICircuit } from '@/api/entitycore/types/entities/circuit';

import { config } from '@/config';

import { Config, ConfigValue } from '@/features/scan-config/_components/components';
import { isAtom, isPlainObject } from '@/features/scan-config/_components/utils';

import { AtomsMap, ConfigSchema } from '@/features/scan-config/types';

import { assertErrorMessage } from '@/util/utils';

export function useObioneJsonSchema(
  model: ICircuit | IMEModel,
  notification: NotificationInstance,
  setAtomsMap: (atomsMap: AtomsMap) => void,
  initialConfig?: Config
) {
  const [schema, setSchema] = useState<ConfigSchema | null>(null);
  const schemaName = useSchemaName({ model });

  React.useEffect(() => {
    async function fetchSpec() {
      try {
        const res = await fetch(`${config.OBI_ONE_URL}/openapi.json`);

        const json = await res.json();

        const dereferenced = await $RefParser.dereference(json);

        // @ts-ignore
        const theSchema = dereferenced.components.schemas[schemaName] as ConfigSchema;
        if (!theSchema.properties) return;

        setSchema(theSchema);

        const map: {
          [key: string]:
            | ReturnType<typeof atom<Record<string, ConfigValue>>>
            | Record<string, ReturnType<typeof atom<Record<string, ConfigValue>>>>;
        } = {};

        if (initialConfig) {
          Object.entries(initialConfig)
            .filter(([k]) => {
              return isRootCategory(theSchema, k);
            })
            .forEach(([k, v]) => {
              if (isPlainObject(v)) map[k] = atom<Record<string, ConfigValue>>(v);
            });

          Object.entries(initialConfig)
            .filter(([k]) => {
              return !isRootCategory(theSchema, k);
            })
            .forEach(([k, v]) => {
              map[k] = {};

              Object.entries(v).forEach(([subK, subV]) => {
                if (!isPlainObject(subV) || isAtom(map[k])) return;
                map[k][subK] = atom<Record<string, ConfigValue>>(subV);
              });
            });
        } else {
          // Setting up initial values and constants.
          Object.entries(theSchema.properties).forEach(([k, v]) => {
            if (v.ui_element === 'root_block') {
              const initial: Record<string, ConfigValue> = {};

              Object.entries(v.properties).forEach(([subkey, subValue]) => {
                initial[subkey] = subValue.default ?? null;
              });

              const formModelType = match(model)
                .with({ type: EntityTypeDict.Memodel }, () => 'MEModelFromID')
                .with(
                  { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single },
                  () => 'MEModelWithSynapsesCircuitFromID'
                )
                .with({ type: EntityTypeDict.Circuit }, () => 'CircuitFromID')

                .otherwise(() => {
                  throw new Error(`Unsupported entity type: ${model.type}`);
                });

              if (k === 'initialize') {
                initial.circuit = {
                  type: formModelType,
                  id_str: model.id,
                };
              }

              map[k] = atom<Record<string, ConfigValue>>(initial);
            } else map[k] = {};
          });
        }

        setAtomsMap(map);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(assertErrorMessage(e));
        notification.error({ message: assertErrorMessage(e) });
      }
    }

    fetchSpec();
  }, [model, notification, setAtomsMap, setSchema, initialConfig, schemaName]);

  // const referenceTypesToConfigKeys: Record<string, string> = {};
  // const referenceTypesToTitles: Record<string, string> = {};

  // if (schema?.properties) {
  //   Object.entries(schema?.properties).forEach(([k, v]) => {
  //     if (v.reference_type) {
  //       referenceTypesToConfigKeys[v.reference_type] = k;
  //       referenceTypesToTitles[v.reference_type] = v.singular_name ?? '';
  //     }
  //   });
  // }

  // return {
  //   schema,
  //   refLabels: schema?.default_block_reference_labels,
  //   referenceTypesToConfigKeys,
  //   referenceTypesToTitles,
  // };

  return schema as ConfigSchema;
}

export function isRootCategory(schema: ConfigSchema, key: string) {
  return schema.properties?.[key] && schema.properties[key].ui_element === 'root_block';
}
