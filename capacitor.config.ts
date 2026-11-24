import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.dpdns.solace.commonplace',
  appName: 'Commonplace',
  webDir: 'public',
  server: {
    url: 'https://pioneer.tail652169.ts.net',
    cleartext: false,
    allowNavigation: ['*.tail652169.ts.net', 'pioneer.tail652169.ts.net', '*.solace.dpdns.org', 'solace.dpdns.org'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
}

export default config
