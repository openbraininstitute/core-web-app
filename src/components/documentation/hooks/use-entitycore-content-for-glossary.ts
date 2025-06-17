import { useEffect, useState } from 'react';

import { ContentForGlossaryItem } from '../type';

import { logError } from '@/util/logger';
import { assertType, TypeDef } from '@/util/type-guards';

export function useEntityCoreContentForGlossary(): ContentForGlossaryItem[] | null {
  const [data, setData] = useState<ContentForGlossaryItem[] | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          'https://staging.openbraininstitute.org/api/entitycore/mtype',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (isContentForGlossary(result)) {
          setData(result);
        } else {
          throw new Error('Invalid data format received from entityCore');
        }
      } catch (error) {
        logError(error);
        setData(null);
      }
    }

    fetchData();
  }, []);

  return data ?? [];
}

function isContentForGlossary(data: unknown): data is ContentForGlossaryItem[] {
  const typeStringOrNull: TypeDef = ['|', 'string', 'null'];
  try {
    assertType(
      data,
      [
        'array',
        {
          Name: typeStringOrNull,
          New_suggested_name: typeStringOrNull,
          Description: typeStringOrNull,
          Data_Type: typeStringOrNull,
          Scale: typeStringOrNull,
          Status: typeStringOrNull,
        },
      ],
      'ContentForGlossary'
    );
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}
