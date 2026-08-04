# README

Date: ${ date }
Downloaded by: ${ username }
Copyright (c) ${ year } Open Brain Institute

## Description

These task results were downloaded from the Open Brain Platform: https://www.openbraininstitute.org/. A task result holds the artifacts a workflow run produced, so the files under `data/` differ per result type — an intracellular e-feature extraction, for example, contains the extracted features as JSON alongside a `figures/` folder of plots.

## Contents

- `data/<n>/` — the assets of the n-th selected result, folder assets kept as folders
- `metadata.json` — the full record of each result, including its `task_result_type` and `data_payload`
- `metadata.csv` — the same records as a table, one row per result
