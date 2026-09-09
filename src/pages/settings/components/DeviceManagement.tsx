import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff, Check, X } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import type { Device, DevicePairing } from '../../../../electron/preload/types'

export default function DeviceManagement() {
  const { can, user: authUser } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [pairings, setPairings] = useState<DevicePairing[]>([])
  const [loading, setLoading] = useState(false)

  const isOwner = can('team')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const shop = await window.electronAPI.db.getShop()
      if (shop) {
        const [d, p] = await Promise.all([
          window.electronAPI.db.listDevices(shop.id),
          window.electronAPI.db.getPairings(shop.id),
        ])
        setDevices((d as Device[]) ?? [])
        setPairings((p as DevicePairing[]) ?? [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    await window.electronAPI.db.approvePairing(id, authUser?.id ?? '')
    load()
  }

  const reject = async (id: string) => {
    await window.electronAPI.db.rejectPairing(id)
    load()
  }

  const pending = pairings.filter(p => p.status === 'pending')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Devices</h2>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {pending.length > 0 && (
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

      {devices.map(d => (
        <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          {d.is_online ? (
            <Wifi size={13} className="text-green-500" />
          ) : (
            <WifiOff size={13} className="text-slate-300" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{d.device_name}</p>
            <p className="text-slate-400">{d.is_host ? 'Host' : d.device_type}</p>
          </div>
          {d.is_host ? (
            <span className="text-xs text-green-600 font-semibold">HOST</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
