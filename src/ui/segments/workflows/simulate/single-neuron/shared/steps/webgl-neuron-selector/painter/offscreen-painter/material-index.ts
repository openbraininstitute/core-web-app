import { tgdCodeFunction_float01ToVec3, TgdMaterial } from '@tolokoban/tgd';

export class MaterialIndex extends TgdMaterial {
  constructor() {
    super({
      varyings: {
        varColor: 'vec3',
      },
      extraVertexShaderFunctions: {
        ...tgdCodeFunction_float01ToVec3(),
      },
      vertexShaderCode: ['varColor = float01ToVec3(attUV1.y);'],
      fragmentShaderCode: ['return vec4(varColor, 1);'],
    });
  }
}
