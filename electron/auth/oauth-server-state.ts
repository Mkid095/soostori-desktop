/**
 * oauth-server-state.ts — OAuth callback server module state + helpers.
 * Part of oauth-callback-server split per ANPAS.
 */

import type { Server } from 'node:net'

let _serverPort: number | null = null
let _codeVerifier: string | null = null
let _oauthState: string | null = null
let _pendingResolve: ((result: { code: string; state: string }) => void) | null = null
let _server: Server | null = null

export function setServer(server: Server, port: number): void { _server = server; _serverPort = port }
export function getServerPort(): number | null { return _serverPort }
export function setCodeVerifier(v: string): void { _codeVerifier = v }
export function getCodeVerifier(): string | null { return _codeVerifier }
export function setOAuthState(v: string): void { _oauthState = v }
export function getOAuthState(): string | null { return _oauthState }
export function setPendingResolve(r: ((result: { code: string; state: string }) => void) | null): void { _pendingResolve = r }
export function getPendingResolve(): ((result: { code: string; state: string }) => void) | null { return _pendingResolve }
export function clearServer(): void { _server = null; _serverPort = null; _codeVerifier = null; _oauthState = null; _pendingResolve = null }
