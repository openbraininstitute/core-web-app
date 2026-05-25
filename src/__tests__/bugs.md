# Bugs Discovered

- `resolveModelIdentifierFieldStorageMode` and workflow schema selection detect tuple/grouped schema shapes by `JSON.stringify` string matching. A cyclic or otherwise non-serializable schema fragment can throw before scan-config can fall back to a safe selection mode.
- `isWorkflowSessionId` validates only prefix and total length. Values such as `wf_!!!!!!!!!!` are accepted even though generated workflow session IDs use lowercase alphanumeric characters.
