import { useCallback, useMemo } from 'react'
import type { ProductFormState } from './useProductForm'

export function useProductFormPricing(
  mode: 'loose' | 'bulk',
  form: Pick<ProductFormState,
    'boxBuyingPrice' | 'unitsPerPackage' | 'costPrice'>,
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>
) {
  const costPerUnit = useMemo(() => {
    if (mode !== 'bulk') return null
    if (!form.boxBuyingPrice || !form.unitsPerPackage) return null
    return parseFloat(form.boxBuyingPrice) / parseInt(form.unitsPerPackage)
  }, [mode, form.boxBuyingPrice, form.unitsPerPackage])

  const handleBulkPriceChange = useCallback((
    field: 'unitsPerPackage' | 'boxBuyingPrice',
    value: string
  ) => {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'unitsPerPackage' && next.boxBuyingPrice && value) {
        next.costPrice = (parseFloat(next.boxBuyingPrice) / parseInt(value)).toFixed(2)
      } else if (field === 'boxBuyingPrice' && next.unitsPerPackage) {
        next.costPrice = (parseFloat(value) / parseInt(next.unitsPerPackage)).toFixed(2)
      }
      return next
    })
  }, [setForm])

  return { costPerUnit, handleBulkPriceChange }
}
