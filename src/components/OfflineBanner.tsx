import React from 'react'
import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '../lib/network-status'
import { useTranslation } from '../lib/useTranslation'

const OfflineBanner: React.FC = () => {
  const { t } = useTranslation()
  const { isOnline } = useNetworkStatus()
  if (isOnline) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 dark:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200">
      <WifiOff size={14} aria-hidden="true" />
      <span>{t('app.workingOffline')}</span>
    </div>
  )
}

export default OfflineBanner
