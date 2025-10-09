# Ion Channel Electrophysiology

## [entity-link-count.tsx](src/ui/segments/explore/entity-link-count.tsx)

List of items to be taken from `ExperimentalEntitiesTileTypes`
coming from [helpers.ts](src/ui/segments/explore/helpers.ts).

The _count_ is computed like this:

```ts
get(allData, value.extendedType, null)
```

## [helpers.ts](src/ui/segments/explore/helpers.ts)

We clone `ElectricalCellRecording` from [electrical-cell-recording.ts](src/entity-configuration/domain/experimental/electrical-cell-recording.ts) to create our Ion Channel Electrophysiology.

## [Page that display tables](src/app/app/virtual-lab/[virtualLabId]/[projectId]/data/(browse)/browse/entity/[type]/page.tsx)
