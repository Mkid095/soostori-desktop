/**
 * CloudLoginScreen.tsx — Cloud authentication onboarding UI.
 *
 * Two steps: (1) email magic code → (2) device registration.
 * Falls back to local setup wizard if cloud is unavailable.
 *
 * All step sub-components extracted to cloud-login-steps.tsx per ANPAS.
 */

import React from 'react'
import { useCloudLogin } from '../hooks/useCloudLogin'
import { CloudLoginSuccess, CloudLoginError, EmailStep, CodeStep, CloudLoginHeader } from './cloud-login-steps'

interface CloudLoginScreenProps {
  onComplete: (shopId: string, userId: string, deviceId: string) => void
  fallbackToSetup: () => void
}

export default function CloudLoginScreen({ onComplete, fallbackToSetup }: CloudLoginScreenProps): React.ReactElement {
  const { step, email, code, loading, errorMsg, setEmail, setCode, requestCode, verifyCode, reset } =
    useCloudLogin({ onComplete, fallbackToSetup })

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <CloudLoginHeader />
          {step === 'success' && <CloudLoginSuccess />}
          {step === 'error' && <CloudLoginError message={errorMsg} onRetry={reset} onOffline={fallbackToSetup} />}
          {step === 'email' && <EmailStep email={email} loading={loading} onEmailChange={setEmail} onSend={requestCode} onOffline={fallbackToSetup} />}
          {step === 'code' && <CodeStep email={email} code={code} loading={loading} onCodeChange={setCode} onVerify={verifyCode} onBack={reset} />}
        </div>
      </div>
    </div>
  )
}
