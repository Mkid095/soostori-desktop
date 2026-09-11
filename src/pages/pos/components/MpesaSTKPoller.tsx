/**
 * MpesaSTKPoller.tsx — STK status polling state machine.
 *
 * Handles the polling lifecycle: idle → polling → completed/failed/timeout.
 * Calls back to parent on each state transition.
 */

import { useEffect, useRef } from 'react'
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'

export type PollerPhase = 'idle' | 'polling' | 'completed' | 'failed'

interface Props {
  stkId: string
  checkoutRequestId: string
  phase: PollerPhase
  errorMsg: string
  total: number
  mpesaConfirmed: boolean
  onPhaseChange: (phase: PollerPhase, errorMsg?: string) => void
  onCompleted: () => void
}

const POLL_INTERVAL_MS = 3_000
const MAX_POLL_ATTEMPTS = 20

const MpesaSTKPoller: React.FC<Props> = ({
  stkId,
  checkoutRequestId,
  phase,
  errorMsg,
  total,
  mpesaConfirmed,
  onPhaseChange,
  onCompleted,
}) => {
  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  // Start polling when both ids are ready
  useEffect(() => {
    if (!stkId || !checkoutRequestId || phase !== 'polling') return
    pollCountRef.current = 0
    pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stkId, checkoutRequestId, phase])

  async function pollOnce(): Promise<void> {
    pollCountRef.current++
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      stopPolling('failed', 'Payment request timed out.')
      return
    }
    try {
      const result = await window.electronAPI.db.mpesaPollSTK(stkId, checkoutRequestId)
      if (!result.success) {
        stopPolling('failed', result.error ?? 'Poll failed')
        return
      }
      if (result.status === 'completed') {
        stopPolling('completed')
        onCompleted()
      } else if (result.status === 'failed' || result.status === 'timeout') {
        stopPolling('failed', result.status === 'timeout' ? 'Payment request timed out.' : 'Payment request failed.')
      }
      // else pending — continue polling
    } catch (err) {
      stopPolling('failed', String(err))
    }
  }

  function stopPolling(finalPhase: PollerPhase, errMsg = ''): void {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    onPhaseChange(finalPhase, errMsg)
  }

  function handleCancel(): void {
    stopPolling('failed', 'Cancelled')
  }

  if (phase === 'idle') return null

  if (phase === 'polling') {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Waiting for payment...</span>
        </div>
        <p className="text-xs text-slate-500">Check your phone and approve the M-Pesa prompt</p>
        <button onClick={handleCancel} className="text-xs text-slate-400 hover:text-slate-600 underline">
          Cancel
        </button>
      </div>
    )
  }

  if (phase === 'completed') {
    return (
      <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-center border-2 border-emerald-300 dark:border-emerald-700">
        <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(total)} received via M-Pesa</p>
      </div>
    )
  }

  if (phase === 'failed' && !mpesaConfirmed) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{errorMsg || 'Payment request failed.'}</p>
        </div>
        <p className="text-xs text-center text-slate-500">Or confirm manually if customer paid:</p>
      </div>
    )
  }

  return null
}

export default MpesaSTKPoller
