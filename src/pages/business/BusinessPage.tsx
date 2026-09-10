/**
 * BusinessPage.tsx — Phase 07: Business management page.
 *
 * Shows BusinessListPage with an "Add Business" button.
 * Owner or business.admin can create a new business.
 * Opens BusinessSetupPage in a modal on "Add Business".
 */

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import BusinessListPage from './BusinessListPage'
import BusinessSetupPage from './BusinessSetupPage'
import { useAuth } from '../../lib/auth-context'

const BusinessPage: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false)
  const { can, user } = useAuth()
  const isOwner = user?.role === 'owner'
  const canCreate = isOwner || can('business.admin')

  return (
    <div className="h-full bg-bg-primary flex flex-col overflow-hidden relative">
      {/* Add Business FAB — only for owners/admins */}
      {canCreate && !showSetup && (
        <div className="absolute bottom-6 right-6 z-10">
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-orange text-white font-semibold shadow-lg hover:bg-orange-600 active:scale-95 transition-all text-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Business
          </button>
        </div>
      )}

      {/* Business list / switcher */}
      <BusinessListPage />

      {/* Setup modal overlay */}
      {showSetup && (
        <div className="absolute inset-0 z-50 flex items-stretch bg-black/40 backdrop-blur-sm">
          <div className="ml-auto w-full max-w-md bg-bg-primary shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-700">
            <BusinessSetupPage
              onClose={() => setShowSetup(false)}
              onSuccess={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessPage
