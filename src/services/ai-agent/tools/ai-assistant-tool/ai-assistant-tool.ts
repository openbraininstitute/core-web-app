import { IconDefault, IconLiteratureSearchTool, IconWebSearchTool } from './icons';

export class AIAssistantTool {
  /**
   * The icon that represents this tool.
   * It is expected to have a size of 1.5em x 1.5em.
   * And use a fill color of `currentColor`.
   */
  public readonly icon: React.FC<{}>;

  constructor(
    /**
     * The ID is used as a unique identifier in the service.
     * It is defined in the AI agent and we just match it here.
     */
    public readonly id: string,

    /**
     * A human friendly name to display in the UI
     */
    public readonly name: string,

    /**
     * A human friendly description to display in the UI
     */
    public readonly description: string
  ) {
    this.icon = getIcon(id);
  }

  docURL(currentPath: string) {
    const [vlab, project] = currentPath.split('/').slice(3, 5);
    return `/app/virtual-lab/${vlab}/${project}/help?section=ai-tools&tool=${this.id}`;
  }
}

function getIcon(toolId: string): React.FC<{}> {
  switch (toolId) {
    case 'literature-search-tool':
      return IconLiteratureSearchTool;
    case 'web-search-tool':
      return IconWebSearchTool;
    default:
      return IconDefault;
  }
}
