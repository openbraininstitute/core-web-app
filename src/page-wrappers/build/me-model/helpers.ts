// NOTE: hardcoded emodel that are not compatible with any other morphology

import { IEModel } from '@/api/entitycore/types';

export const EmodelBlackList = [
  'EM__CBXgr_GrC_cNAC',
  'EM__CBXmo_StC_cNAC',
  'EM__CBXpu_PuC_cNAC',
  'EM__CBXgr_GoC_cAC',
  'EM__MOBmi_MC_cNAC',
  'EM__MOBgr_sGC_dNAC',
];

export function checkSelectedEmodelBlackList(e: IEModel) {
  return EmodelBlackList.includes(e.name);
}
