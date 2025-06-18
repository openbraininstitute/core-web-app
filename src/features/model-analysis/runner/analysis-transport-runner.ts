import Ws, {
  TransportRunnerCommandsPrefix,
  TransportRunnerCommands,
  ModelOrigin,
} from '@/features/model-analysis/runner/websocket';
import { meModelAnalysisSvc } from '@/config';

import type { WorkspaceContext } from '@/types/common';

interface TransportRunnerConfig {
  onInit?: () => void;
  onAnalysisDone?: () => void;
  onAnalysisError?: () => void;
}

export default class AnalysisTransportRunner {
  private modelId: string;

  private access_token: string;

  private config: TransportRunnerConfig;

  private ctx: WorkspaceContext;

  private ws: Ws;

  constructor(
    ctx: WorkspaceContext,
    meModelId: string,
    token: string,
    config: TransportRunnerConfig = {}
  ) {
    this.modelId = meModelId;
    this.access_token = token;
    this.config = config;
    this.ctx = ctx;
    this.ws = new Ws(meModelAnalysisSvc.wsUrl, token, { onMessage: this.onMessage });

    this.ws.send(TransportRunnerCommandsPrefix.RUN_ANALYSIS, {
      access_token: this.access_token,
      config: {
        model_origin: ModelOrigin.ENTITYCORE,
        model_id: this.modelId,
        project_context: {
          virtual_lab_id: this.ctx.virtualLabId,
          project_id: this.ctx.projectId,
        },
      },
    });
  }

  private onMessage = (cmd: TransportRunnerCommands) => {
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
