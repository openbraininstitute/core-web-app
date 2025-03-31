import { ENTITY_CORE_FIELDS_CONFIG } from '@/constants/explore-section/fields-config';

export function getFieldEsConfig(field: string) {
  return ENTITY_CORE_FIELDS_CONFIG[field]?.esTerms;
}

export function getFieldLabel(field: string) {
  return field in ENTITY_CORE_FIELDS_CONFIG ? ENTITY_CORE_FIELDS_CONFIG[field].title : field;
}

export function getFieldUnit(field: string) {
  return field in ENTITY_CORE_FIELDS_CONFIG && ENTITY_CORE_FIELDS_CONFIG[field].unit;
}
