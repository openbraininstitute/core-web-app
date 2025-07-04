const serverErrors = {
  CIRCUIT_NOT_BUILT_ERROR: 'The circuit is not built',
  BRAIN_REGION_DOES_NOT_EXIST: 'The brain region does not exist',
};

export const messages = {
  CIRCUIT_NOT_BUILT_ERROR:
    'We can’t show the cell positions yet—the brain model hasn’t been built.',
  BRAIN_REGION_DOES_NOT_EXIST: 'We’re unable to display the selected brain region at the moment.',
  brainRegionMeshLoadingError:
    'Something went wrong on our end while loading the brain region mesh.',
  default: 'An error occurred while attempting to visualize the brain region.',
};
