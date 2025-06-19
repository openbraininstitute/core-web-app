import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { unwrap } from 'jotai/utils';
import { Spin } from 'antd';
import findKey from 'lodash/findKey';
import replace from 'lodash/replace';
import get from 'lodash/get';

import EXPLORE_FIELDS_CONFIG from '@/constants/explore-section/fields-config';
import { cellTypesByLabelAtom } from '@/state/build-section/cell-types';
import { FieldType } from '@/constants/explore-section/fields-config/types';
import { ClassNexus } from '@/api/ontologies/types';

// NOTE: this due nexus es aggregation and the resource it self are having different keys name
// one with underscore, and the other with hyphen
const getClassByLabel = (label: string, classes: Record<string, ClassNexus>) => {
  const normalizedLabel = replace(label, /[_-]/g, '');
  const matchedKey = findKey(classes, (_, key) => replace(key, /[_-]/g, '') === normalizedLabel);
  return get(classes, matchedKey ?? '', null);
};

export function CheckListDescription({
  label,
  filterField,
}: {
  label: string;
  filterField: string;
}) {
  const { fieldType } = EXPLORE_FIELDS_CONFIG[filterField];
  if (fieldType === FieldType.CellType) {
    return <ClassDescription label={label} />;
  }
  return null;
}

function ClassDescription({ label }: { label: string }) {
  const classes = useAtomValue(useMemo(() => unwrap(cellTypesByLabelAtom), []));

  if (!classes) {
    return <Spin />;
  }
  const classObj = getClassByLabel(label, classes);
  return <span className="text-primary-1">{classObj?.definition}</span>;
}
