import Ws, { BluePyEModelCmd, Cmd, ModelOrigin } from './websocket';

import { meModelAnalysisSvc } from '@/config';

interface BluePyEModelConfig {
  onInit?: () => void;
  onAnalysisDone?: () => void;
  onAnalysisError?: () => void;
}

export default class BluePyEModelCls {
  private modelSelfUrl: string;

  private access_token: string;

  private config: BluePyEModelConfig;

  private ws: Ws;

  constructor(modelSelfUrl: string, token: string, config: BluePyEModelConfig = {}) {
    this.modelSelfUrl = modelSelfUrl;
    this.access_token = token;
    this.config = config;

    this.ws = new Ws(meModelAnalysisSvc.wsUrl, token, { onMessage: this.onMessage });

    this.ws.send(BluePyEModelCmd.RUN_ANALYSIS, {
      access_token: this.access_token,
      config: {
        model_origin: ModelOrigin.NEXUS,
        self_url: this.modelSelfUrl,
      },
      // For Entitycore required params are:
      // access_token: this.access_token,
      // config: {
      // model_origin: ModelOrigin.ENTITYCORE,
      // model_id: '<model_id>',
      // project_context: {
      //   project_id: '<project_id>'
      //   virtual_lab_id: '<virtual_lab_id>',
      // }
      // },
    });
  }

  private onMessage = (cmd: Cmd) => {
    switch (cmd) {
      case 'run_analysis_processing':
        this.config.onInit?.();
        break;
      case 'run_analysis_done':
        this.config.onAnalysisDone?.();
        break;
      case 'run_analysis_error':
        this.config.onAnalysisError?.();
        break;
      default:
        break;
    }
  };

  destroy() {
    this.ws.destroy();
  }
}
