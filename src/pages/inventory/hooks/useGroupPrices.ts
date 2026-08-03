import { useState, useCallback } from 'react'

export function useGroupPrices(initial?: { quantity: number; price: number }[]) {
  const [groupPrices, setGroupPrices] = useState(initial || [])

  const addGroupPrice = useCallback(() => setGroupPrices(gp => [...gp, { quantity: 1, price: 0 }]), [])
  const updateGroupPrice = useCallback((i: number, field: 'quantity' | 'price', val: string) => {
    setGroupPrices(gp => gp.map((item, idx) =>
      idx === i ? { ...item, [field]: field === 'quantity' ? parseInt(val) || 1 : parseFloat(val) || 0 } : item
    ))
  }, [])
  const removeGroupPrice = useCallback((i: number) => setGroupPrices(gp => gp.filter((_, idx) => idx !== i)), [])

  return { groupPrices, addGroupPrice, updateGroupPrice, removeGroupPrice }
}
