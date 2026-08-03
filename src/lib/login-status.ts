import { useCallback, useEffect, useState } from 'react'

export interface LoginStatus {
  showLogin: boolean
  loginResolved: boolean
  dismissLogin: () => void
}

const STORAGE_KEY = 'lastLoginDate'

/** Decide whether the PIN screen should be shown based on app settings + localStorage. */
export function useLoginStatus(): LoginStatus {
  const [showLogin, setShowLogin] = useState(true)
  const [loginResolved, setLoginResolved] = useState(false)

  const dismissLogin = useCallback(() => setShowLogin(false), [])

  useEffect(() => {
    const checkLoginRequired = async () => {
      try {
        const defaults = await window.electronAPI.db.getAppSettingsDefaults()
        if (defaults.pinSet !== 1) {
          setShowLogin(false)
          setLoginResolved(true)
          return
        }
        const today = new Date().toDateString()
        const lastLogin = localStorage.getItem(STORAGE_KEY)
        setShowLogin(lastLogin !== today)
      } catch {
        setShowLogin(false)
      }
      setLoginResolved(true)
    }
    checkLoginRequired()
  }, [])

  return { showLogin, loginResolved, dismissLogin }
}

export const LOGIN_DATE_STORAGE_KEY = STORAGE_KEY
