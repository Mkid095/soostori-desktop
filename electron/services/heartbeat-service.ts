/**
 * HeartbeatService — fires device heartbeat + subscription verification while app is running.
 * Runs in the main process. Periodically reports to cloud and checks subscription status.
 */

import { getDatabase } from '../database'
import { getSyncStore } from './store'
import { reportHeartbeat, verifySubscription } from './cloud-service'
import { isCloudReachable } from './cloud-sync-service'
import log from 'electron-log'

let _timer: ReturnType<typeof setInterval> | null = null
let _lastBeat = 0

function getDeviceInfo(): { deviceId: string; shopId: string } | null {
  try {
    const store = getSyncStore()
    const deviceId = store.get('deviceId') as string | undefined
    const shopId = store.get('shopId') as string | undefined
    if (!deviceId) return null
    return { deviceId: store.get('deviceId') as string, shopId: shopId ?? 'default' }
  } catch { return null }
}

async function tick(): Promise<void> {
  const now = Date.now()
  if (now - _lastBeat < 5 * 60 * 1000) return  // throttle: once per 5 min
  _lastBeat = now

  const info = getDeviceInfo()
  if (!info) return

  const db = getDatabase()
  const device = db.prepare('SELECT last_sale_at FROM devices WHERE id = ?').get(info.deviceId) as { last_sale_at: string | null } | undefined

  try {
    const reachable = await isCloudReachable()
    if (reachable) {
      await reportHeartbeat({
        deviceId: info.deviceId,
        shopId: info.shopId,
        timestamp: new Date().toISOString(),
        mode: 'online',
        lastSaleAt: device?.last_sale_at ?? null,
      })
    }
    // Verify subscription on every 12th tick (~once per hour)
    if (_lastBeat % (5 * 60 * 1000 * 12) === 0) {
      await verifySubscription()
    }
  } catch (err) {
    log.warn('HeartbeatService: tick failed', err)
  }
}

export function startHeartbeatService(): void {
  if (_timer) return
  _timer = setInterval(() => { tick().catch(() => {}) }, 5 * 60 * 1000)
  _lastBeat = 0
  log.info('HeartbeatService: started')
}

export function stopHeartbeatService(): void {
  if (_timer) { clearInterval(_timer); _timer = null }
  log.info('HeartbeatService: stopped')
}
