import type { RJSFSchema, UiSchema } from '@rjsf/utils';

export const makeHiddenTypeUiSchema = (rootSchema?: RJSFSchema): UiSchema => {
  const result: UiSchema = {};

  const assignDeep = (target: UiSchema, path: string[], value: UiSchema) => {
    let cursor: UiSchema = target;
    for (let i = 0; i < path.length; i += 1) {
      const key = path[i];
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {} as UiSchema;
      cursor = cursor[key] as UiSchema;
    }
    Object.assign(cursor, value);
  };

  const walk = (node: any, path: string[]) => {
    if (!node || typeof node !== 'object') return;

    if (node.properties && typeof node.properties === 'object') {
      const typeProp = node.properties.type;

      if (
        typeProp &&
        typeof typeProp === 'object' &&
        typeProp.type === 'string' &&
        Object.hasOwn(typeProp, 'const')
      ) {
        assignDeep(result, [...path, 'type'], {
          'ui:widget': 'hidden',
          'ui:options': { label: false },
        } as UiSchema);
      }
      for (const [propName, propSchema] of Object.entries(node.properties)) {
        walk(propSchema, [...path, propName]);
      }
    }

    if (node.items && typeof node.items === 'object') {
      walk(node.items, [...path, 'items']);
    }
    if (Array.isArray(node.prefixItems)) {
      // RJSF uiSchema targets array item schema via `items`, not `prefixItems`
      node.prefixItems.forEach((it: any) => walk(it, [...path, 'items']));
    }
    ['oneOf', 'anyOf', 'allOf'].forEach((key) => {
      if (Array.isArray(node[key])) {
        node[key].forEach((sub: any, idx: number) => walk(sub, [...path, key, String(idx)]));
      }
    });
  };

  walk(rootSchema, []);
  return result;
};
