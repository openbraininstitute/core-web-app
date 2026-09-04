export const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';

export const messages = {
  DefaultErrorMsg: 'Something went wrong while creating the ME-model, please try again later',
  LowFundsError:
    'The project does not have sufficient credits to build the requested model. Please purchase or transfer additional credits and try again.',
  LowFundsErrorNonAdmin:
    'The project does not have sufficient credits to build the requested model. Please contact your project administrator to request additional credits.',
  RunAnalysisError: 'Something went wrong while launching model calibration and validation',
  ValidationError: 'Validation failed. Please check the data and try again.',
  CreationModelSucceed: 'The me-model has been successfully created.',
  CheckingCompatibility: 'Model compatibility check in progress...',
  IncompatibleModels: 'Incompatible M-model and E-model, please select a different combination.',
  CompatibilityCheckFailed:
    "We couldn't complete the compatibility check, so this combination can't be verified yet. Try again before building.",
  CompatibilityDetailsShow: 'Show details',
  CompatibilityDetailsHide: 'Hide details',
  CompatibilityDetailsCopy: 'Copy details',
  CompatibilityRetry: 'Try again',
  CompatibilityBlockedTooltip: "We couldn't verify this combination. Try the check again.",
};
