export function generateLabUrl(virtualLabId: string) {
  return `/app/virtual-lab/lab/${virtualLabId}`;
}

export function generateVlProjectUrl(virtualLabId: string, projectId: string) {
  return `/app/virtual-lab/lab/${virtualLabId}/project/${projectId}`;
}
