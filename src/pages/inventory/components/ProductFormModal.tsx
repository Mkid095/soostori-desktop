import React, { useState } from 'react'
import { X, Plus, Edit } from 'lucide-react'
import { useProductForm } from '../hooks/useProductForm'
import { TypeStep } from './TypeStep'
import { DetailsStep } from './DetailsStep'
import { PricingStep } from './PricingStep'
import { StockStep } from './StockStep'
import { StepIndicator } from '../../../components/shared/StepIndicator'
import { FormNavigationFooter } from './FormNavigationFooter'
import type { Product, Category } from '../../../lib/types'

interface ProductFormModalProps {
  product?: Product | null
  categories: Category[]
  onSave: (data: Partial<Product>) => void
  onClose: () => void
  isSaving: boolean
  onAddCategory: (name: string, color: string) => void
  initialBarcode?: string
}

const STEPS = [
  { number: 0, label: 'Type', labelSw: 'Aina' },
  { number: 1, label: 'Details', labelSw: 'Maelezo' },
  { number: 2, label: 'Pricing', labelSw: 'Bei' },
  { number: 3, label: 'Stock', labelSw: 'Hisa' },
]

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product, categories, onSave, onClose, isSaving, onAddCategory, initialBarcode
}) => {
  const [step, setStep] = useState(product ? 1 : 0)
  const form = useProductForm(product ?? null, initialBarcode)
  const isEditing = !!product?.id

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form.buildProductData())
  }

  const canGoNext = () => {
    if (step === 0) return !!form.mode
    if (step === 1) return !!form.form.name
    return true
  }

  const handleNext = () => { if (step < STEPS.length - 1 && canGoNext()) setStep(s => s + 1) }
  const handleBack = () => { if (step > 0) setStep(s => s - 1) }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isEditing ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-brand-orange text-white'
            }`}>
              {isEditing ? <Edit size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {isEditing ? 'Edit Product' : 'Register New Product'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {isEditing ? 'Update details' : 'Fill in the details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* Step indicator */}
        {!isEditing && <StepIndicator steps={STEPS} currentStep={step} />}

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            {step === 0 && <TypeStep mode={form.mode} onModeChange={form.setMode} />}

            {step === 1 && (
              <DetailsStep
                form={form.form} categories={categories}
                imagePreview={form.imagePreview} fileInputRef={form.fileInputRef}
                barcodeInputRef={form.barcodeInputRef}
                showAddCategory={form.showAddCategory}
                newCategoryName={form.newCategoryName} newCategoryColor={form.newCategoryColor}
                addingCategory={form.addingCategory}
                onFieldChange={form.updateField}
                onImageSelect={form.handleImageSelect} onClearImage={form.clearImage}
                onGenerateBarcode={form.generateBarcode}
                onShowAddCategory={form.setShowAddCategory}
                onNewCategoryName={form.setNewCategoryName}
                onNewCategoryColor={form.setNewCategoryColor}
                onAddCategory={() => form.handleAddCategory(onAddCategory)}
              />
            )}

            {step === 2 && (
              <PricingStep
                mode={form.mode} form={form.form} costPerUnit={form.costPerUnit}
                groupPrices={form.groupPrices}
                onFieldChange={form.updateField as (field: string, value: string) => void}
                onBulkPriceChange={form.handleBulkPriceChange}
                onAllowSingleUnitSaleToggle={() => form.updateField('allowSingleUnitSale', !form.form.allowSingleUnitSale)}
                onAddGroupPrice={form.addGroupPrice}
                onUpdateGroupPrice={form.updateGroupPrice}
                onRemoveGroupPrice={form.removeGroupPrice}
              />
            )}

            {step === 3 && <StockStep form={form.form} onFieldChange={form.updateField} />}
          </div>

          <FormNavigationFooter
            step={step} totalSteps={STEPS.length}
            isSaving={isSaving} isValid={form.isValid()}
            isEditing={isEditing} canGoNext={canGoNext()}
            onBack={handleBack} onCancel={onClose} onNext={handleNext}
          />
        </form>
      </div>
    </div>
  )
}
