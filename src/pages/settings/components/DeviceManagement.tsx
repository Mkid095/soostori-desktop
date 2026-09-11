import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff, Check, X, Monitor, Smartphone, Crown, ArrowRight, XCircle } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import type { Device, DevicePairing } from '../../../../electron/preload/types'

interface PrimaryStatus {
  primaryId: string | null
  primaryName: string | null
  electedAt: string | null
  lastHeartbeatAt: string | null
  stalenessMs: number
  status: 'online' | 'stale' | 'lost'
  electionPending: boolean
}

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  stale: 'Stale',
  lost: 'Lost',
}

export default function DeviceManagement() {
  const { can, user: authUser } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [pairings, setPairings] = useState<DevicePairing[]>([])
  const [primaryStatus, setPrimaryStatus] = useState<PrimaryStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  const canView = can('devices.view')
  const canManage = can('devices.manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const shop = await window.electronAPI.db.getShop()
      if (shop) {
        const [d, p] = await Promise.all([
          window.electronAPI.db.listDevices(shop.id) as Promise<Device[]>,
          window.electronAPI.db.getPairings(shop.id) as Promise<DevicePairing[]>,
        ])
        const ps = await window.electronAPI.db.getPrimaryStatus(shop.id) as PrimaryStatus
        setDevices(d ?? [])
        setPairings(p ?? [])
        setPrimaryStatus(ps)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (canView) load() }, [canView, load])

  const approve = async (id: string) => {
    await window.electronAPI.db.approvePairing(id, authUser?.id ?? '')
    load()
  }

  const reject = async (id: string) => {
    await window.electronAPI.db.rejectPairing(id)
    load()
  }

  const transferPrimary = async () => {
    if (!transferTarget) return
    const shop = await window.electronAPI.db.getShop()
    if (!shop) return
    setTransferring(true)
    try {
      await window.electronAPI.db.transferPrimaryDevice(transferTarget, shop.id)
      setTransferOpen(false)
      setTransferTarget(null)
      load()
    } finally { setTransferring(false) }
  }

  const pending = pairings.filter(p => p.status === 'pending')
  const otherDevices = devices.filter(d => d.id !== primaryStatus?.primaryId)

  const primaryBadge = (status: string) => {
    const color = status === 'online' ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
      : status === 'stale'  ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
      : 'text-red-600 bg-red-50 dark:bg-red-900/20'
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${color}`}>{STATUS_LABELS[status] ?? status}</span>
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-slate-400">
        You do not have permission to view devices.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Devices</h2>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Primary Device Section */}
      {primaryStatus && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={13} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Primary Device</span>
            {primaryBadge(primaryStatus.status)}
          </div>
          {primaryStatus.primaryId ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{primaryStatus.primaryName ?? primaryStatus.primaryId.slice(0, 8)}</p>
                <p className="text-[10px] text-slate-400">
                  {primaryStatus.lastHeartbeatAt
                    ? `Last seen ${new Date(primaryStatus.lastHeartbeatAt).toLocaleTimeString()}`
                    : 'No heartbeat'}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => setTransferOpen(true)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  <ArrowRight size={10} />
                  Transfer
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No primary device elected</p>
          )}
        </div>
      )}

      {/* Transfer Primary Modal */}
      {transferOpen && (
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Transfer Primary To</p>
            <button onClick={() => { setTransferOpen(false); setTransferTarget(null) }}>
              <XCircle size={13} className="text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {otherDevices.map(d => (
              <button
                key={d.id}
                onClick={() => setTransferTarget(d.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-colors ${
                  transferTarget === d.id
                    ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {d.device_type === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                <span className="flex-1 truncate font-medium">{d.device_name}</span>
                {d.is_online ? (
                  <Wifi size={10} className="text-green-500" />
                ) : (
                  <WifiOff size={10} className="text-slate-300" />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setTransferOpen(false); setTransferTarget(null) }}
              className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={transferPrimary}
              disabled={!transferTarget || transferring}
              className="flex-1 text-xs py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {transferring ? 'Transferring…' : 'Confirm Transfer'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pending.length > 0 && canManage && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-600">Pending Approvals</p>
          {pending.map(p => (
            <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-xs">
              <WifiOff size={13} className="text-amber-500" />
              <span className="flex-1 truncate text-amber-700 dark:text-amber-300">{p.device_id.slice(0, 8)}</span>
              <button onClick={() => approve(p.id)} className="p-1 rounded-lg hover:bg-amber-100"><Check size={13} className="text-green-600" /></button>
              <button onClick={() => reject(p.id)} className="p-1 rounded-lg hover:bg-amber-100"><X size={13} className="text-red-500" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Device List */}
      {devices.map(d => {
        const isPrimary = d.id === primaryStatus?.primaryId
        return (
          <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            {d.device_type === 'mobile' ? (
              <Smartphone size={13} className="text-slate-400" />
            ) : (
              <Monitor size={13} className="text-slate-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{d.device_name}</p>
              <p className="text-slate-400">{d.device_type}</p>
            </div>
            {d.is_online ? (
              <Wifi size={13} className="text-green-500" />
            ) : (
              <WifiOff size={13} className="text-slate-300" />
            )}
            {isPrimary && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-bold">
                <Crown size={10} />HOST
              </span>
            )}
          </div>
        )
      })}

      {devices.length === 0 && !loading && (
        <p className="text-xs text-slate-400 text-center py-4">No devices enrolled</p>
      )}
    </div>
  )
}
