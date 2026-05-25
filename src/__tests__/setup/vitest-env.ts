import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

process.env.APP_VERSION ??= 'test';
process.env.DEPLOYMENT_ENV ??= 'local';
process.env.API_ORIGIN ??= 'https://api.test';
process.env.ROOT_ROUTE ??= '/';
process.env.STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
process.env.SANITY_PROJECT_ID ??= 'sanity-project';
process.env.SANITY_DATASET ??= 'staging';
process.env.ENTITY_CORE_PUBLIC_PROJECT_ID ??= 'project-id';
process.env.ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID ??= 'virtual-lab-id';
process.env.APP_DEFAULT__BRAIN_REGION_HIERARCHY_ID ??= 'brain-region-hierarchy-id';
process.env.MOUSE_ATLAS__ID ??= 'mouse-atlas-id';
process.env.MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID ??= 'mouse-brain-region-id';
process.env.HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID ??= 'human-brain-region-id';
process.env.RAT_DEFAULT__SELECTED_BRAIN_REGION_ID ??= 'rat-brain-region-id';
process.env.EXCLUDED_HIERARCHY_IDS ??= '';
process.env.LEGACY_DEFAULT_CIRCUIT_ID ??= 'https://entity.test/circuit';
process.env.NOTEBOOK_REPO_URL ??= 'https://notebooks.test/repo';
process.env.OBI_ONE_URL ??= 'https://obi-one.test';
