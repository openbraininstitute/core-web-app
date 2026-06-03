# How to add a new scan-config workflow

This guide is for when you add a **new workflow** that uses the scan-config editor (the form where users set up a simulation, extraction, build, or process run).

You do **not** need to touch URL maps, schema name maps, or entity-type maps in other files.  
Everything important lives in the **workflow registry**.

---

## What the user does (big picture)

1. User opens **Workflows** and picks an activity (Simulate, Extract, Build, Process).
2. User picks a model type and **browses** entities in a table.
3. User selects one (or more) entities and goes to **Configure**.
4. The configure page opens with the scan-config form (ObiOne schema).

Your job is to wire step 2 → step 4 correctly.

---

## The 3 files you usually edit

Think of it like this:

| Part | File | What it is |
|------|------|------------|
| **1. Definition** | `definitions/your-workflow.ts` | How this page loads campaigns and which activity it is |
| **2. Binding** | `ui/segments/workflows/config/scan-config-binding.ts` | How browse types map to API, schema, and FromID |
| **3. Registry** | `ui/segments/workflows/config/activities/{simulate,extract,build,process}.ts` | The list entry users see on the workflows page |

The app finds your workflow by **`definition.id`**. That id must match between the definition file and the registry.

---

## Step 1 — Create the definition file

**Folder:** `src/features/scan-config/workflow/definitions/`

Create something like `simulate-my-new-workflow.ts`.

### Option A — Circuit-style simulate (user picks entity on `/new`, then configure with session id)

Use the helper if your flow is like microcircuit / paired neuron / region circuit:

```ts
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/...';
import { defineSimulateCircuitScanConfigWorkflow } from '@/features/scan-config/workflow/definitions';

export const simulateMyNewWorkflow = defineSimulateCircuitScanConfigWorkflow({
  id: 'simulate-my-new-workflow', // unique string — remember this id
  resolve: resolveSimulationByCampaignId,
});
```

### Option B — Other activities (extract, process, build) or custom setup

Use `defineScanConfigWorkflow` directly. Copy an existing file that is close to yours:

- Extract → `definitions/extract-circuit.ts`
- Process → `definitions/process-em-cell-mesh.ts`
- Build → `definitions/build-em-synapse-mapping.ts`
- Static entity (no browse session) → `definitions/simulate-ion-channel.ts`

**Entity mode:**

- **`Session`** — user came from browse; URL has `wf_…` session id. Most workflows use this.
- **`StaticType`** — entity type is fixed on the page (rare, e.g. ion channel standalone page).

### Export your definition

Add one line in `definitions/index.ts`:

```ts
export { simulateMyNewWorkflow } from '@/features/scan-config/workflow/definitions/simulate-my-new-workflow';
```

---

## Step 2 — Add or reuse a configure binding

**File:** `src/ui/segments/workflows/config/scan-config-binding.ts`

The binding answers five questions:

1. **browseType** — what type is stored when user picks from the browse table?
2. **scanConfigEntityType** — what type does the scan-config API / entity config use?
3. **fromIdTypeByBrowseType** — what ObiOne `FromID` goes into `initialize` in the form?
4. **generatedApiPath** — which ObiOne “generate grid” endpoint?
5. **schemaMappingKey** (optional) — which key under schema `property_endpoints` to load circuit / ion-channel mapping?

### Reuse a helper when you can

| Your case | Helper |
|-----------|--------|
| Simulate circuit family (microcircuit, paired neuron, brain region, …) | `circuitSimulationConfigureBinding(browseType)` |
| ME-model with synapses single-neuron circuit | `circuitSimulationConfigureBinding(MEModelWithSynapses)` |
| ME-model circuit simulate | `memodelCircuitSimulationConfigureBinding()` |
| Ion channel simulate | `ionChannelSimulationConfigureBinding()` |
| Circuit extraction | `extractCircuitConfigureBinding()` |
| EM mesh skeletonization | `processEmCellMeshConfigureBinding()` |
| EM synapse mapping build | `buildEmSynapseMappingConfigureBinding()` |

Example — paired neuron circuit:

```ts
circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.PairedNeuronCircuit)
```

Browse type = `paired_neuron_circuit`, API entity type = `circuit`, FromID = `CircuitFromID`.

### New helper (only when nothing fits)

1. Add a path in `ScanConfigGeneratedApiPath` if ObiOne gave you a new endpoint name.
2. Add a function at the bottom of `scan-config-binding.ts`:

```ts
export function myNewWorkflowConfigureBinding(): TScanConfigConfigureBinding {
  return {
    browseType: ExtendedEntitiesTypeDict.YourBrowseType,
    scanConfigEntityType: ExtendedEntitiesTypeDict.YourApiEntityType,
    fromIdTypeByBrowseType: {
      [ExtendedEntitiesTypeDict.YourBrowseType]: ScanConfigFromIdType.CircuitFromID,
    },
    generatedApiPath: ScanConfigGeneratedApiPath.YourNewPath,
  };
}
```

**Tip:** Open the ObiOne JSON schema and check which `FromID` types appear under `initialize` (e.g. `CircuitFromID`, `MEModelFromID`). The binding must match the schema.

If the schema name is new, add it to `SchemaNameDict` in `src/features/scan-config/types.ts`.

---

## Step 3 — Register the workflow in the activity list

**File:** pick the right activity file:

- `ui/segments/workflows/config/activities/simulate.ts`
- `ui/segments/workflows/config/activities/extract.ts`
- `ui/segments/workflows/config/activities/build.ts`
- `ui/segments/workflows/config/activities/process.ts`

Add a new object to the array. For scan-config workflows use `WorkflowStagePresets.ScanConfig` and fill `scanConfig`:

```ts
{
  ...WorkflowBrowseDefaults,
  ...WorkflowStagePresets.ScanConfig,
  sourceType: ExtendedEntitiesTypeDict.YourBrowseType,
  targetType: ExtendedEntitiesTypeDict.YourSimulationOrCampaignType,
  scanConfig: {
    definition: simulateMyNewWorkflow,
    schemaName: SchemaNameDict.YourScanConfigSchemaName,
    configureBinding: circuitSimulationConfigureBinding(
      ExtendedEntitiesTypeDict.YourBrowseType
    ),
  },
  configurationInputs: [{ type: ExtendedEntitiesTypeDict.YourBrowseType }],
  order: 10,
  disabled: false,
},
```

**Important checks:**

- `configurationInputs[0].type` should match `configureBinding.browseType`.
- `sourceType` / `targetType` are what the workflows hub uses for labels and routing.
- `definition.id` in step 1 must be unique across all workflows.

---

## Step 4 — Route page (often nothing to do)

Most simulate / extract / build / process configure URLs already use a **catch-all** page:

```
/workflows/{activity}/configure/[type]/[id]/page.tsx
```

That page reads `targetType` from the URL, finds your registry entry, and opens configure.

**You only need a new page file** if your route is special (legacy static URL, no session id, custom layout). Examples today:

- `simulate/configure/ion-channel-model-simulation/page.tsx` — static type, no session

For a normal browse → configure flow, **skip this step**.

---

## Where things live (reference)

```
src/features/scan-config/workflow/
  definitions/          ← step 1: page behavior (campaign resolve, activity)
  components.tsx        ← editor shell (you rarely edit this)
  create-page.tsx       ← route factories (catch-all pages)

src/ui/segments/workflows/config/
  scan-config-binding.ts   ← step 2: API + schema + FromID mapping
  activities/simulate.ts   ← step 3: registry (and extract/build/process)
  helpers.ts               ← findScanConfigRegistryByDefinition()
```

---

## Do not do this

- Do **not** add new maps in `types.ts` for entity type / schema / URL. That old pattern was removed.
- Do **not** put `schemaName` or `configureEntityType` inside the definition file. Registry is the source of truth.
- Do **not** duplicate binding data in `workflow-schema-selection.ts` or `use-scan-configuration.ts`.

If configure breaks, fix the **registry binding**, not scattered fallbacks.

---

## Need a similar example?

| Workflow | Definition | Binding |
|----------|------------|---------|
| Paired neuron simulate | `simulate-paired-neuron-circuit.ts` | `circuitSimulationConfigureBinding(PairedNeuronCircuit)` |
| Circuit extract | `extract-circuit.ts` | `extractCircuitConfigureBinding()` |
| EM synapse build (multi input) | `build-em-synapse-mapping.ts` | `buildEmSynapseMappingConfigureBinding()` |


