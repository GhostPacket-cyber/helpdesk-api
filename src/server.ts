const appName: string = 'Help Desk API';

function buildStartupMessage(name: string, nodeVersion: string): string {
  return `${name} — ambiente configurado (Node ${nodeVersion})`;
}

console.log(buildStartupMessage(appName, process.version));
