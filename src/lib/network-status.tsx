import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface NetworkStatusValue {
  isOnline: boolean
}

const NetworkStatusContext = createContext<NetworkStatusValue>({ isOnline: true })

const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)

  const checkOnline = useCallback(() => {
    // Use navigator.onLine as first signal
    if (!navigator.onLine) {
      setIsOnline(false)
      return
    }
    // Optionally poll a lightweight endpoint to confirm actual connectivity
    // For now, trust navigator.onLine after initial check
    setIsOnline(true)
  }, [])

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true) }
    const handleOffline = () => { setIsOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    // Periodic health check
    const interval = setInterval(checkOnline, HEALTH_CHECK_INTERVAL)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkOnline])

  return (
    <NetworkStatusContext.Provider value={{ isOnline }}>
      {children}
    </NetworkStatusContext.Provider>
  )
}

export function useNetworkStatus(): NetworkStatusValue {
  return useContext(NetworkStatusContext)
}
