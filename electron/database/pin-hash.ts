/**
 * @deprecated PIN operations are now handled by @soostori/auth/pin-node.
 * This file must not be imported anywhere. It is kept only to prevent
 * broken imports during the transition period.
 *
 * Canonical PIN storage:
 *   - Verifier: device-local EncryptedStorage only (NEVER in FIDScript)
 *   - Salt: device-local EncryptedStorage + server-side Redis (enroll salt)
 *   - hasPin / pinSetupAt: FIDScript devices.hasPin / devices.pinSetupAt
 *
 * Use:
 *   import { hashPin, verifyPin } from '@soostori/auth/pin-node'
 */

// Intentional compile error to prevent any accidental usage
const PIN_MODULE_REMOVED = true
;(PIN_MODULE_REMOVED as boolean) // eslint-disable-line @typescript-eslint/no-unused-expressions
