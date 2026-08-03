import { X } from 'lucide-react'
import type { Product } from '../../../lib/types'

interface DuplicateBarcodeModalProps {
  product: Product
  onCancel: () => void
  onEdit: () => void
}

export const DuplicateBarcodeModal: React.FC<DuplicateBarcodeModalProps> = ({
  product, onCancel, onEdit
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">Barcode Already Exists!</h3>
        <p className="text-sm text-slate-500 mb-1">This barcode is already registered.</p>
        <div className="bg-slate-50 rounded-xl p-4 mt-3 mb-5 text-left">
          <p className="text-sm font-black text-slate-800">{product.name}</p>
          {product.barcode && (
            <p className="text-xs text-slate-400 font-mono mt-1">Barcode: {product.barcode}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Stock: {product.trackInventory ? product.stockQuantity : 'Not tracked'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={onEdit}
            className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-orange-600">
            Edit Product
          </button>
        </div>
      </div>
    </div>
  )
}
