// `summarizeFilter` is renderer-agnostic and now lives in `core` (so the react-ring
// active-filters popover can share it). Re-exported here to keep the header's import
// path stable.
export { summarizeFilter } from '../../../core';
