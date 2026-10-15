## Investigation: migrating hard-coded e-models

Checked read-only against staging and production entitycore (GET only, via `obi-auth` tokens), and against the original BluePyEModel exports in `~/code/EMODELS`.

### Current state
- `public/emodel-channels-location/` has 169 files, each mapping section list → mechanism names (no parameters).
- 153 match an e-model by name in both staging and prod. Each has an e-type, an exemplar morphology, linked ion channel models, and two assets:
  - `emodel_optimization_output` (JSON): final parameter values, fitness, scores, model feature values, validation scores, seed
  - `neuron_hoc` (`model.hoc`): mechanisms per section list, all fixed values (`cm`, `ena`, `ek`, `vshift*`, ...), `v_init`/`celsius`, and distance-dependent distributions as formulas
- The 3 mechanisms that matched no linked ion channel model (`Nap_Et2`, `StochKv3`, `KdShu2007`) are errors in the hard-coded files, not in entitycore. The source config, the hoc and the shipped `.mod` files agree with each other, and every mechanism in the source config is linked on the staging e-model. Wrong hard-coded files:
  - `EM__2f92aa0__cNAC__16`: lists `KdShu2007`, which the model does not use
  - `EM__2f92aa0__cAC__12`: lists `Nap_Et2` on axonal, which the model does not use
  - `EM__2f92aa0__cADpyr__15`: lists `StochKv3`, the model actually has `Nap_Et2` on axonal
  - `EM__442283f__bSTUT__24`: misses `StochKv3` on somatic and axonal
- Old e-models (and their ME-models) have 9 generic single-cell validation results (AIS spiking, bPAP, depolarization block, FI curve, hyperpolarization, input resistance, IV curve, spiking, thumbnail). They do not have the optimization analysis figures that new runs publish.
- 16 files have no matching e-model in staging or prod. Two are probably renamed: "GEN/GIN_etype detailed neuron (Alias for ...)". No match for the other 14: 10 × `EModel_*`, 2 placeholders, MICrONS, Webinar. Searched without virtual lab or project headers, so e-models private to a project would not show up. `~/code/EMODELS` has nothing for any of the 16.

### Source bundles (`~/code/EMODELS`)
153 zips, exactly the 153 matched e-models. The bundle name maps to the entitycore name as `EM__{iteration}__{emodel}__{seed}`, or `EM__{emodel}` when there is no iteration. Thalamus bundles say `thalamusrat` where entitycore says `thalamoreticular`.

| Bundles | Files |
|---|---|
| 130 BBP pipeline: SSCx 40, Hippocampus 53, Thalamus 5, Canonical_SSCX 22, Canonical_Thalamus 10 | EMC, FCC, EMPS, EMW, EMS, EM, hoc, mods, morphology; ETC in all but Thalamus (125) |
| 23 others: Cerebellum 5, Striatum 15, Olfactory_Bulb 3 | EMC, EMS, EM, hoc, mods, morphology |

What each file gives:
- **EMC (153)**: the original optimization config. Every parameter has its location, its mechanism, and either a fixed value or the original `[lo, hi]` bounds (3448 bounded parameters). It also has the distribution formulas and the morphology's Nexus id.
  - The final EM parameters match the EMC bounded parameters exactly in all 153, so original bounds are recoverable.
  - Every mechanism name equals the staging ion channel model's `nmodl_suffix`, and every parameter resolves against its `neuron_block` (152/153). The exception is one Olfactory Bulb e-model: 6 `ks` globals (`tp_ks`, `a0q_ks`, `kp_ks`, `vhalfp_ks`, `vhalfq_ks`, `tvh_ks`) are not declared by the staging `ks` model.
  - EMC's morphology id equals the staging `exemplar_morphology.legacy_id` in all 153.
  - The 23 non-BBP bundles have no bounds: all their parameters are fixed.
- **FCC (130)**: BluePyEModel `FitnessCalculatorConfiguration` (`{efeatures, protocols}`), the same format and keys task1 uploads as `efeature_extraction_features` (`extracted_features.json`). All 130 load with the BluePyEModel class. Hippocampus EM score names use an older naming scheme, but they cover the same features.
- **EMPS (130)**: maps onto `OptimizationSettings`. 45 of 48 fields share the name; `offspring_size` comes from `optimisation_params`, `seed` from EMS, `name_Rin_protocol` becomes `name_rin_protocol`. Extraction-only keys are dropped. Values vary, so defaults would misrepresent the runs: IBEA 93 / MO-CMA 37, `max_ngen` 100, 400, 600 or 1000, offspring size 100, 10 or 20.
- **ETC (125)**: extraction inputs by recording cell name. 300 of 302 names exist as electrical cell recordings on staging; 143 of those have 2 matches each. Only useful for optional provenance (derivations).
- **EMS**: seed (25 distinct values, some null). **EMW**: Nexus workflow ids only, not useful.
- **EM, hoc, mods**: use the staging copies, not the bundles.
  - EM is byte-identical to the staging asset for 130; the other 23 have an empty local `parameter` list while staging has the values.
  - 80 hoc files differ from staging only because they were regenerated (newer BluePyOpt, added `getCell`).
  - 114 bundled `.mod` files across 87 e-models differ in code from the staging ion channel models (for example `Nav1_6`, `HCN1`). Not a migration issue, but the staging channels are not byte-identical to the ones the models were optimized with.

### What the new page needs
Per e-model, in creation order:

| # | Entity | Content |
|---|---|---|
| 1 | Extraction `TaskResult` (`efeature_extraction__result`), asset `efeature_extraction_features` | The FCC file as `extracted_features.json`. Target of the campaign's `target_efeatures` |
| 2 | Campaign `TaskConfig` (`emodel_optimization__campaign`), asset `task_config` | `obi_one_scan.json` with the `form`. `meta: {"scan_parameters": {}}`. `inputs`: extraction result, morphology, ion channel models. What the Configuration tab renders |
| 3 | Generated `TaskConfig` (`emodel_optimization__config`, `task_config_generator_id` = campaign), asset `task_config` | `obi_one_coordinate.json` (same form flattened, `type: EModelOptimizationSingleConfig`, `idx: 0`). Exactly one per campaign: this flow has no scannable parameters (10 of 10 sampled campaigns). Optimizations tab input row |
| 4 | Optional `TaskResult` (`emodel_optimization__result`), asset `emodel_analysis_summary` | `final.json` derived from the EM asset. Optimizations tab summary row |
| 5 | Config-generation `TaskActivity` (`emodel_optimization__config_generation`, `done`) | `used`: campaign; `generated`: generated config. Without it the Optimizations tab lists no runs |
| 6 | Execution `TaskActivity` (`emodel_optimization__execution`, `done`) | `used`: generated config; `generated`: e-model, ME-model, optional result. The only link from the e-model to its run |

Activities go last because `used` / `generated` take ids that must already exist. Not needed: validation results, calibration result, checkpoint (the tab hides it). The real L5PC run in "Shared results + tests" has the same shape, plus validation and calibration results in the execution's `generated`.

Links: the e-model and ME-model have no field pointing to a config. The only foreign key is generated config → campaign (`task_config_generator_id`). Everything else is `usage` / `generation` rows from the activities. The ME-model links to the e-model through its own foreign key.

No activity on staging uses or generates any of these e-models or ME-models today, so the migrated execution would be the only generating activity.

### What can be recovered for the `form`
| Part | Source | Status |
|---|---|---|
| `info` | e-model `name` / `description` | yes (copied; they describe the e-model, not a campaign) |
| `initialize.emodel`, `etype` | e-model `etypes[0]` | yes |
| `target_efeatures` | extraction result from FCC | yes for 130, none for the 23 non-BBP |
| `morphology` | `exemplar_morphology.id` | yes |
| `mechanisms.ion_channel_models` | e-model `ion_channel_models` | yes |
| `mechanisms.mechanism_regions` | EMC mechanisms + parameters | yes |
| Mechanism `parameters` | EMC | original bounds for 130, fixed values for the 23 |
| `base_parameters` | EMC | yes |
| `global_parameters` | EMC | yes |
| Distance-dependent distributions | EMC formulas | yes, no hoc parsing needed |
| `morphology_settings.axon_modifier` | hoc `replace_axon` (EMC and EMPS sometimes disagree) | yes, except Cerebellum |
| `optimization_settings` | EMPS + EMS | yes for 130, defaults for the 23 |
| `optimization_params` | none beyond offspring size | defaults |

Mapping details:
- Parameter keys in the form are the bare NMODL variable (`gNaTgbar`, not `gNaTgbar_NaTg`). EMC gives the mechanism explicitly, so no name splitting is needed.
- EMC often inserts a mechanism on a coarse list (`somaxon`) but sets its parameters on finer ones (`axonal`, `somatic`). The form keys parameters by row, so those become per-section rows; the compiled placement is unchanged.
- Axon modifier from the hoc:
  - SSCx and Canonical with a myelinated hoc: `replace_axon_with_taper`
  - Canonical with no `replace_axon` in the hoc (16): `none`
  - Hippocampus: `replace_axon_legacy`, except 3 where EMC says bluepyopt and EMPS says legacy
  - Thalamus and Striatum: `bluepyopt_replace_axon`
  - Olfactory Bulb: `replace_axon_olfactory_bulb` (2), `none` (1)
  - Cerebellum: custom hoc, not in the allowed list
- Distributions: `linear_hdpas` has the same formula as `linear_hd_apic`. `decay` and `step` (uses `int` where the standard uses `float`) need custom distributions. SSCx `distribution_decay` (10 e-models) is the `constant` parameter of `decay`, bounds `[-0.1, 0]`. The rest match standard ones apart from float literals.

Verified for `EM__sscxrat__bAC_L23BTC__0`: the generated form passes `EModelOptimizationScanConfig` validation, and compiling it with BluePyEModel's `build_optimization_artifacts` gives the same 37 parameters, mechanism placement and `exp` distribution as the original EMC.

### Optimizations tab outputs
- E-model row: the e-model, listed in the execution's `generated`.
- ME-model row: an existing ME-model on the e-model (seen for `EM__117407f__bAC__14` and `EM__sscxrat__bAC_L23BTC__0`, not checked for all).
- `final.json`: derivable from `emodel_optimization_output`. A real one is `{"<emodel>__<seed>": {emodel, etype, mtype, species, brain_region, iteration, seed, fitness, parameters: {"gNaTgbar_NaTg.somatic": ...}, score, features, validated, ...}}`; EM's `parameter` list becomes the `parameters` dict and `passedValidation` becomes `validated`.
- Analysis figures: produced by the run (the task result's `analysis_figures` directory, also published as validation results on new e-models: score/trace plots, parameter distribution, currentscape). Old e-models only have the 9 generic validation results, not these; not recoverable without re-running the analysis.

### Access and visibility
- The public e-models live in vlab `a98b7abc-fc46-4700-9e3d-37137812c730` ("OBI public") and project `0dbced5f-cc3d-488a-8c7f-cfb8ea039dc6` ("Public"), system containers from the Nexus import. The same ids appear in prod Keycloak groups; prod entitycore was not checked.
- Write gate: the Keycloak group `/proj/<vlab>/<project>/admin` or `/member`, checked by entitycore against `/userinfo` on every request. The project is not special-cased in entitycore code (it only appears in two alembic migrations and `.env.run-local`).
- Linking: a new entity or activity may reference entities that are public or in its own project. An execution in any project can therefore claim a public e-model in `generated`.
- Reads return entities that are public or in the request's header project (not every project the user belongs to). This applies to lists, single GETs and assets.
- `authorized_project_id` cannot be changed through the API. A chain created in a test project stays there; the real migration must be created with the public project's headers.
- Deletion: public entities, and assets of public entities, cannot be deleted on the regular routes, except by `/service/entitycore/maintainer` within their projects. `/admin` routes (`/service/entitycore/admin`) skip the check. Project members can still add assets to public entities.
- `created_by` / `updated_by` are single foreign keys set from the token's user on create and update; the API ignores any value sent. Only another identity or a direct DB write changes them.
- Current creators of the 153 on staging (dates copied from Nexus at import; most predate entitycore):

| created_by | Count | Bundles | creation_date | updated_by |
|---|---|---|---|---|
| Aurélien Jaquier | 54 | Canonical_SSCX 22, Canonical_Thalamus 9, Cerebellum 5, Olfactory_Bulb 3, Striatum 15 | 2024-02 to 2024-11 | uploader service account (2025-04) |
| `service-account-obp-singlecell-uploader-sa` | 45 | SSCx 40, Thalamus 5 | 2025-05 | Gianluca Ficarelli (40, 2026-05-11), service account (5) |
| Ilkan Kilic | 40 | Hippocampus 39, Canonical_Thalamus 1 | 2024-03 to 2024-04 | Gianluca Ficarelli (39, 2026-05-11), service account (1) |
| Darshan Mandge | 14 | Hippocampus 14 | 2024-04 | service account (2025-04) |

- The service account shows as "service-account-obp-singlecell-uploader-sa service-account-obp-singlecell-uploader-sa" because its Keycloak first and last name are both set to that string; entitycore stores Keycloak's `name` as `pref_label`. Not a frontend bug.

### Resolver (`emodel-detail-page` branch)
- `configuration.tsx` checks `hasHardcodedMechanisms(emodel.name)` first and renders the old view if a file exists. Migrated e-models need their hard-coded file removed.
- Otherwise `Task.campaignIdOf`: execution activity with `generated__id` = e-model → first `used` task config → its `task_config_generator_id`, else the config-generation activity → campaign → `EModelOptimizationCampaign.resolve`. Any null or error shows "No configuration found for this e-model."
- A chain in a private project shows only on the e-model page opened under that project. This is how the migration will be tested first, in a dedicated project.
- Planned rule after the test: accept an execution only if it is in the same project as the e-model, and apply the same check to the config and campaign. Otherwise any project could attach a public execution to a public e-model and replace the configuration it shows. Also decide how to pick between several valid executions (sort by creation date or fail).

### Open decisions
1. **Optimizations tab for migrated e-models: show it, grey it out, or hide it.** Showing it needs the full chain above. Greying it out or hiding it means the migration can skip:
   - the config-generation activity
   - the generated config's `task_config` asset
   - the optional `TaskResult` / `final.json`

   The generated `TaskConfig` and the execution activity are still needed, because they're how the e-model is traced to its campaign. The alternative is to let the resolver accept an execution that used the campaign directly.

   Greying it out needs a small frontend change: the tab is only disabled when there's no campaign, and a migrated e-model has one. It could instead be disabled when the campaign has no generated runs.
2. Target e-features (schema-required) for the 23 non-BBP e-models: leave unset (config not schema-valid) or add a placeholder extraction result.
3. Settings caps: `MAX_NGEN` is 50 and `MAX_OFFSPRING_SIZE` is 20. All 130 settings exceed the `max_ngen` cap and 93 exceed the offspring cap. Raise or bypass the caps for migrated configs, or store clamped values.
4. E-models the schema cannot express: Cerebellum (5, custom section lists such as AIS, hillock, myelin0 to 3, rn0 to 2, and a custom axon modifier) and Olfactory Bulb (2, initialseg / node / myelin). The Striatum CHIN model's `soma` maps to `somatic`.
5. The 16 unmatched files: map the 2 aliases, drop or locate the rest.
6. If the tab stays: whether to create the optional `TaskResult` with `final.json`.
7. Which identity writes the chain (`created_by`): your own account or the uploader service account. Neither matches the current e-model creators for every bundle.
