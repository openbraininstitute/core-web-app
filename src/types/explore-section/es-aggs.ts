interface Bucket {
  key: string;
  doc_count: number;
}

export interface BucketAggregation {
  buckets: Bucket[];
  excludeOwnFilter: { buckets: Bucket[] };
}

interface NestedBucketAggregation {
  [key: string]: { [key: string]: BucketAggregation };
}

interface NestedStatsAggregation {
  [key: string]: { [key: string]: Statistics };
}

interface Statistics {
  avg?: number;
  count: number;
  max?: number;
  min?: number;
  sum: number;
  doc_count?: number;
}

type StatsAggregation = NestedStatsAggregation | Statistics;

export default interface Aggregations {
  [key: string]: BucketAggregation | NestedBucketAggregation | StatsAggregation;
}
