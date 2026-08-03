import React from 'react'
import Toast, { type ToastVariant } from './Toast'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

export default ToastContainer
