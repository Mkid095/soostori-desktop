/**
 * cloud-handlers.ts — Cloud IPC handler registration.
 * Split per ANPAS: connectivity → cloud-connectivity-handlers.ts,
 * data → cloud-data-handlers.ts.
 */

import { registerCloudConnectivityHandlers } from './cloud-connectivity-handlers'
import { registerCloudDataHandlers } from './cloud-data-handlers'

export function registerCloudHandlers(): void {
  registerCloudConnectivityHandlers()
  registerCloudDataHandlers()
}
