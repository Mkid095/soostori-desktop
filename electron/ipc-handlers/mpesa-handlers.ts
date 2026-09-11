/**
 * mpesa-handlers.ts — IPC handlers for M-Pesa STK Push.
 *
 * Handlers:
 *   mpesa:stkPush   — initiate STK push, return checkoutRequestId
 *   mpesa:pollSTK   — poll status of a pending push
 *   mpesa:onCallback — receive PayHero webhook (called by renderer relay)
 */

import { ipcMain } from 'electron'
import { initiateSTKPush, pollSTKStatus, type STKCallbackPayload } from '../services/mpesa-stk-push'
import log from 'electron-log'

export function registerMpesaHandlers(): void {
  // mpesa:stkPush(phone, amount, accountRef) → { id, checkoutRequestId, status }
  ipcMain.handle('mpesa:stkPush', async (_event, phone: string, amount: number, accountRef: string) => {
    try {
      const result = await initiateSTKPush(phone, amount, accountRef)
      return { success: true, ...result }
    } catch (err) {
      log.error('[MpesaHandlers] stkPush error:', err)
      return { success: false, error: String(err) }
    }
  })

  // mpesa:pollSTK(id, checkoutRequestId) → 'pending' | 'completed' | 'failed' | 'timeout'
  ipcMain.handle('mpesa:pollSTK', async (_event, id: string, checkoutRequestId: string) => {
    try {
      const status = await pollSTKStatus(id, checkoutRequestId)
      return { success: true, status }
    } catch (err) {
      log.error('[MpesaHandlers] pollSTK error:', err)
      return { success: false, error: String(err) }
    }
  })

  // mpesa:onCallback(payload) — called when PayHero POSTs to our callback endpoint
  ipcMain.on('mpesa:onCallback', (_event, payload: STKCallbackPayload) => {
    const { onSTKCallback } = require('../services/mpesa-stk-push')
    onSTKCallback(payload)
  })

  log.info('Mpesa handlers registered')
}
