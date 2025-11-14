const { execSync } = require('child_process');

export function getVersion() {
  return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim();
}
