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
  IncompatibleModels:
    'The selected M-model and E-model are not compatible. Please select a different combination.',
};
