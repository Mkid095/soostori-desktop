import { X, Image } from 'lucide-react'

interface ProductFormImageProps {
  imagePreview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

export const ProductFormImage: React.FC<ProductFormImageProps> = ({
  imagePreview, fileInputRef, onSelect, onClear
}) => {
  return (
    <div>
      <label className="block text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider mb-1">
        Product Image
      </label>
      <div className="flex items-center gap-3">
        {imagePreview ? (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border-color dark:border-slate-600 shrink-0">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button type="button" onClick={onClear}
              className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white
                rounded-bl-lg flex items-center justify-center">
              <X size={10} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border-color
              dark:border-slate-600 flex flex-col items-center justify-center
              text-text-muted dark:text-slate-400 hover:border-brand-orange
              hover:text-brand-orange transition-colors shrink-0">
            <Image size={20} />
            <span className="text-[9px] mt-0.5">Add</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onSelect} className="hidden" />
        <div className="flex-1">
          <p className="text-xs text-text-muted dark:text-slate-400">Tap the icon to upload a product image</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-500 mt-0.5">JPG, PNG, WebP up to 2MB</p>
        </div>
      </div>
    </div>
  )
}
