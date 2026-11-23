const seeds = new Set<string>();
export const markSeed = (logId: string): void => void seeds.add(logId);
export const takeSeed = (logId: string): boolean => seeds.delete(logId);
