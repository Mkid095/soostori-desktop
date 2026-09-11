/**
 * callback-server.ts — Local HTTP server for PayHero M-Pesa webhooks.
 *
 * Runs in the Electron main process on port 18793 (configurable).
 * Receives PayHero STK callback and delegates to mpesa-stk-push.onSTKCallback().
 *
 * Endpoints:
 *   GET  /api/mpesa/callback?token=...&id=...  — PayHero verification handshake
 *   POST /api/mpesa/callback                   — STK result notification
 */

import http from 'http'
import { URL } from 'url'
import log from 'electron-log'
import { onSTKCallback, type STKCallbackPayload } from './mpesa-stk-push'

const PORT = Number(process.env.PAYHERO_CALLBACK_PORT) || 18793

let _server: http.Server | null = null

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function startCallbackServer(): void {
  if (_server) return

  _server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      res.end()
      return
    }

    const pathname = req.url?.split('?')[0] ?? ''

    // GET  /api/mpesa/callback — PayHero verification (just acknowledges)
    if (req.method === 'GET' && pathname === '/api/mpesa/callback') {
      log.info('[Callback] PayHero verification received')
      jsonResponse(res, 200, { status: 'ok' })
      return
    }

    // POST /api/mpesa/callback — STK result
    if (req.method === 'POST' && pathname === '/api/mpesa/callback') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as STKCallbackPayload
          log.info('[Callback] STK callback received:', JSON.stringify(payload))
          onSTKCallback(payload)
          jsonResponse(res, 200, { status: 'received' })
        } catch (err) {
          log.error('[Callback] Failed to parse callback body:', err)
          jsonResponse(res, 400, { error: 'Invalid JSON' })
        }
      })
      return
    }

    jsonResponse(res, 404, { error: 'Not found' })
  })

  _server.on('error', (err) => {
    log.error('[Callback] Server error:', err)
  })

  _server.listen(PORT, '127.0.0.1', () => {
    log.info(`[Callback] M-Pesa callback server listening on port ${PORT}`)
  })
}

export function stopCallbackServer(): void {
  _server?.close(() => {
    _server = null
    log.info('[Callback] M-Pesa callback server stopped')
  })
}
