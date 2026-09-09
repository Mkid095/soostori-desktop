import React from 'react'
import DeviceManagement from '../settings/components/DeviceManagement'
import SyncSettings from '../settings/components/SyncSettings'

const DevicesPage: React.FC = () => {
  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <SyncSettings />
        <DeviceManagement />
      </div>
    </div>
  )
}

export default DevicesPage
