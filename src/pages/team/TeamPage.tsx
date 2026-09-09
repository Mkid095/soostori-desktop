import React from 'react'
import TeamSettings from '../settings/components/TeamSettings'
import InvitationPanel from '../settings/components/InvitationPanel'

const TeamPage: React.FC = () => {
  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <TeamSettings />
        <InvitationPanel />
      </div>
    </div>
  )
}

export default TeamPage
