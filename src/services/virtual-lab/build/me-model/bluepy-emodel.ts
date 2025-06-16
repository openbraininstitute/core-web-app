import { WorkspaceContext } from '@/types/common';
import Ws, { BluePyEModelCmd, Cmd, ModelOrigin } from './websocket';

import { meModelAnalysisSvc } from '@/config';

interface BluePyEModelConfig {
  onInit?: () => void;
  onAnalysisDone?: () => void;
  onAnalysisError?: () => void;
}

export default class BluePyEModelCls {
  private meModelId: string;

  private access_token: string;

  private config: BluePyEModelConfig;

  private ctx: WorkspaceContext;

  private ws: Ws;

  constructor(
    ctx: WorkspaceContext,
    meModelId: string,
    token: string,
    config: BluePyEModelConfig = {}
  ) {
    this.meModelId = meModelId;
    this.access_token = token;
    this.config = config;
    this.ctx = ctx;
    this.ws = new Ws(meModelAnalysisSvc.wsUrl, token, { onMessage: this.onMessage });

    this.ws.send(BluePyEModelCmd.RUN_ANALYSIS, {
      access_token: this.access_token,
      config: {
        model_origin: ModelOrigin.ENTITYCORE,
        model_id: this.meModelId,
        project_context: {
          virtual_lab_id: this.ctx.virtualLabId,
          project_id: this.ctx.projectId,
        },
      },
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
