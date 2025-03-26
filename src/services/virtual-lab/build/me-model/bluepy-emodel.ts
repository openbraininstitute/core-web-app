import Ws, { BluePyEModelCmd, Cmd } from './websocket';

import { meModelAnalysisSvc } from '@/config';

interface BluePyEModelConfig {
  onInit?: () => void;
  onAnalysisDone?: () => void;
  onAnalysisError?: () => void;
}

export default class BluePyEModelCls {
  private config: BluePyEModelConfig;

  private ws: Ws;

  constructor(modelSelfUrl: string, token: string, config: BluePyEModelConfig = {}) {
    this.config = config;
    this.ws = new Ws(meModelAnalysisSvc.wsUrl, token, { onMessage: this.onMessage });
    this.ws.send(BluePyEModelCmd.SET_MODEL, { model_self_url: modelSelfUrl });
  }

  runAnalysis() {
    this.ws.send(BluePyEModelCmd.RUN_ANALYSIS, {});
  }

  private onMessage = (cmd: Cmd) => {
    switch (cmd) {
      case 'set_model_done':
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
