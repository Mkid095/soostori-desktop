// ============================================================
// HEADER CONTROLS BRIDGE
//
// Pages own their internal state (open dialog, search term, etc.).
// The SoostoriHeader renders page-specific controls and needs to
// invoke page-owned handlers from outside the page tree. We use
// thin window events as a bridge — pages subscribe and App/Header
// dispatch. No business logic lives here.
// ============================================================

export const HEADER_EVENT = 'soostori:header:action' as const

export type HeaderAction =
  | { type: 'pos:showHeld' }
  | { type: 'inventory:addProduct'; search: string }
  | { type: 'debts:addCustomer'; search: string }

export function dispatchHeaderAction(action: HeaderAction): void {
  window.dispatchEvent(new CustomEvent(HEADER_EVENT, { detail: action }))
}

export function subscribeHeaderActions(handler: (action: HeaderAction) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<HeaderAction>).detail
    if (detail) handler(detail)
  }
  window.addEventListener(HEADER_EVENT, listener)
  return () => window.removeEventListener(HEADER_EVENT, listener)
}
