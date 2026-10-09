/**
 * subscription-enforcer-messages.ts — User-facing messages for each blocked state.
 *
 * Extracted from subscription-enforcer.ts to keep that file under the
 * ANPAS 150-line limit. All copy is owned here so the UI / i18n layer
 * can later swap to a translation key without touching the enforcer.
 */

export function buildExpiredMessage(expiresAt: string | null): string {
  if (expiresAt) {
    return `Subscription expired on ${new Date(expiresAt).toLocaleDateString()}. Please renew to continue.`
  }
  return 'Subscription has expired. Please renew to continue.'
}

export function buildDeactivatedMessage(): string {
  return 'Subscription is deactivated. Please contact support to reactivate.'
}

export function buildUnknownStateMessage(state: string): string {
  return `Subscription is in an unknown state (${state}). Please check your subscription status.`
}
