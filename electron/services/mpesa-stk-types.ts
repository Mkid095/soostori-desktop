/**
 * mpesa-stk-types.ts — Shared types for PayHero STK Push integration.
 */

export type STKStatus = 'pending' | 'completed' | 'failed' | 'timeout'

export interface STKPushResult {
  id: string
  checkoutRequestId: string
  status: STKStatus
}

export interface STKCallbackPayload {
  checkout_request_id: string
  status: 'completed' | 'failed'
  amount?: number
  receipt?: string
  phone?: string
  transaction_id?: string
  error_code?: string
  error_message?: string
}
