# Migrating hard-coded e-models to optimisation campaigns (prod run)

Creates, for each matching public e-model, a public optimisation campaign chain (extraction result
→ campaign config → generated config → execution activity) so the e-model's Configuration/Workflow
tab can resolve it. The old hard-coded fallback (`public/emodel-channels-location/<name>.json` and
the code that read it) has been removed from the frontend; an e-model with no campaign chain now
shows "No configuration found" instead. Script: `~/code/EMODELS/migrate_emodels.py`.

## Requirements

- Run with the obi-one venv: `~/code/obi-one/.venv/bin/python` (provides `obi_one`, `entitysdk`,
  `bluepyemodel`).
- The source bundles in `~/code/EMODELS/` (`SSCx`, `Hippocampus`, `Thalamus`, `Canonical_SSCX`,
  `Canonical_Thalamus`; `Cerebellum`/`Olfactory_Bulb`/`Striatum` are not migrated, see below).
- A token with write access to prod's public e-models project.

## Before running against prod

The script's constants are currently staging values and must be swapped:
- `STAGING_ENTITYCORE` → prod's entitycore API URL.
- `PUBLIC_VIRTUAL_LAB_ID` / `PUBLIC_PROJECT_ID` → prod's "OBI public" vlab / "Public" project ids
  (not yet confirmed; prod wasn't checked).
- `token()`'s `obi-auth get-token -e staging` → prod's environment name.
- `STATE_FILE` (`migration_state.json`) is staging's resume state. Point it at a fresh file for
  prod, or the script will think everything is already migrated.

## Run it

```
~/code/obi-one/.venv/bin/python migrate_emodels.py --check                          # build + validate every form, no writes
~/code/obi-one/.venv/bin/python migrate_emodels.py --only EM__sscxrat__bAC_L23BTC__0 # migrate a single e-model
~/code/obi-one/.venv/bin/python migrate_emodels.py                                  # everything left (resumable via migration_state.json)
~/code/obi-one/.venv/bin/python migrate_emodels.py --delete                         # delete every chain the script created
```

Always run `--check` first and confirm `N forms valid, 0 failed` before writing anything.
`--check` validates every form against `EModelOptimizationScanConfig` and compiles it with
BluePyEModel's `build_optimization_artifacts`; re-run it against whatever obi-one schema prod is
actually running, the forms were last validated against a local checkout
(`emodel-opt-distribution-params`, commit `785cf3b6`).

## What gets migrated and what doesn't

- Matching is driven by the public e-models, not the local files: for each public e-model, it
  finds the bundle with the same name, or (for the 4 `GEN_etype_*`/`GIN_etype_*` aliases) parses
  `(Alias for ...)` out of the e-model's own name and uses the aliased e-model's bundle instead,
  while keeping the alias's own identity (id, ion channel models, morphology).
- 134 e-models migrate on staging: 130 BBP e-models + the 4 aliases. Skipped: Cerebellum,
  Olfactory Bulb, Striatum (23, no bounds; some use section lists or axon modifiers the schema
  can't express) and 12 hard-coded files with no matching public e-model. `not_migrated.csv` lists
  why, per e-model.
- Mechanism-region parameter keys are the mechanism-qualified NMODL name (`gNaTgbar_NaTg`), not the
  bare variable, matching what obi-one and the frontend expect.
- `max_ngen` clamped to 50, `offspring_size` to 20 (schema caps); original runs used 100–1000 /
  10–100.
- Not created: the config-generation activity, the generated config's asset, or `final.json`. The
  Optimizations/results view stays unpopulated for migrated e-models; only Configuration/Workflow
  resolves.

## Still open (same for staging and prod)

1. Target e-features for the 23 non-BBP e-models (no FCC file): currently left unset, so their
   config is not schema-valid if ever re-submitted.
2. Cerebellum (custom section lists + axon modifier) and Olfactory Bulb (initialseg/node/myelin)
   aren't expressible in the current schema.
