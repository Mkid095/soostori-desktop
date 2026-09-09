/**
 * oauth-callback-server.ts — Creates a short-lived local HTTP server to catch Google's OAuth 2.0 PKCE redirect.
 *
 * Flow:
 *   1. startOAuthServer() → starts HTTP server on a random available port
 *   2. Browser opens Google OAuth URL with redirect_uri = http://localhost:{PORT}/oauth2callback
 *   3. Google redirects to that URL with code + state
 *   4. Server parses code+state, IPC-notifies main process, sends 200 to browser, closes
 *   5. Renderer calls CloudAuth.handleOAuthCallback({ code, state }, codeVerifier, redirectUri)
 *
 * Uses Node `net` module — no external dependencies, works in Electron main process.
 */

import { BrowserWindow } from 'electron'
import net from 'node:net'
import type { Socket } from 'node:net'
import log from 'electron-log'
import {
  setServer, getServerPort, setCodeVerifier, setOAuthState,
  setPendingResolve, getPendingResolve, clearServer,
} from './oauth-server-state'

const CALLBACK_PATH = '/oauth2callback'

function handleRequest(socket: Socket, body: string): void {
  const requestLine = body.split('\r\n')[0] ?? ''
  const match = requestLine.match(/GET ([^\s]+)/)
  if (!match) { socket.end('HTTP/1.1 400\r\n\r\n'); return }

  const urlStr = match[1]
  const url = new URL(urlStr, `http://localhost:${getServerPort()}`)
  if (url.pathname !== CALLBACK_PATH) return

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  log.info(`[OAuth callback] received code=${!!code} state=${!!state} error=${error}`)

  const html = `<!DOCTYPE html><html><head><title>Soostori POS</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb"><div style="text-align:center"><p style="font-size:16px;color:#374151">Sign-in complete. You can close this window.</p></div></body></html>`
  socket.write([
    'HTTP/1.1 200 OK', 'Content-Type: text/html; charset=utf-8',
    `Content-Length: ${Buffer.byteLength(html)}`, 'Connection: close', '', html,
  ].join('\r\n'))
  socket.end()

  if (code && state) { const r = getPendingResolve(); if (r) r({ code, state }) }
  if (error) BrowserWindow.getAllWindows().forEach(w => w.webContents.send('oauth:callback:error', error))
  setTimeout(() => { shutdownServer() }, 500)
}

export function startOAuthServer(codeVerifier: string, state: string): string {
  return new Promise<string>(resolvePort => {
    setCodeVerifier(codeVerifier); setOAuthState(state)
    const server = net.createServer((socket: Socket) => {
      let body = ''
      socket.on('data', (chunk: Buffer) => { body += chunk.toString(); if (body.includes(CALLBACK_PATH)) handleRequest(socket, body) })
      socket.on('error', (err: NodeJS.ErrnoException) => { if (err.code !== 'ECONNRESET') log.warn('[OAuth callback] socket error:', err.code) })
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') { log.error('[OAuth callback] could not get port'); server.close(); return }
      setServer(server, addr.port)
      log.info(`[OAuth callback] server listening on http://localhost:${addr.port}${CALLBACK_PATH}`)
      resolvePort(`http://localhost:${addr.port}${CALLBACK_PATH}`)
    })
    server.on('error', (err: NodeJS.ErrnoException) => { log.error('[OAuth callback] server error:', err.code) })
  }) as unknown as string
}

export function shutdownServer(): void {
  try { (getServerPort() as unknown as { close: () => void })?.close() } catch { /* ignore */ }
  clearServer()
}

export function notifyOAuthCallback(code: string, state: string): void {
  const r = getPendingResolve(); if (r) { r({ code, state }); setPendingResolve(null) }
}

export function waitForOAuthCallback(timeoutMs = 120_000): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    setPendingResolve(resolve)
    setTimeout(() => {
      if (getPendingResolve() === resolve) { setPendingResolve(null); reject(new Error('OAuth callback timed out')); shutdownServer() }
    }, timeoutMs)
  })
}
