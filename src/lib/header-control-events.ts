import { useEffect, useState } from 'react'

export interface HeaderControlEvents {
  heldSalesCount: number
  inventorySearch: string
  debtSearch: string
  reportsDateFilter: string
}

/** Subscribe to header control events dispatched by the title bar buttons. */
export function useHeaderControlEvents(): HeaderControlEvents {
  const [heldSalesCount, setHeldSalesCount] = useState(0)
  const [inventorySearch, setInventorySearch] = useState('')
  const [debtSearch, setDebtSearch] = useState('')
  const [reportsDateFilter, setReportsDateFilter] = useState('today')

  useEffect(() => {
    const onHeldCount = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail
      if (typeof detail === 'number') setHeldSalesCount(detail)
    }
    const onInventorySearch = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setInventorySearch(detail.value)
    }
    const onDebtSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setDebtSearch(detail.value)
    }
    const onReportsDate = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      if (detail) setReportsDateFilter(detail.value)
    }

    window.addEventListener('soostori:pos:held-count', onHeldCount)
    window.addEventListener('soostori:app:inventorySearch', onInventorySearch)
    window.addEventListener('soostori:app:debtSearch', onDebtSearch)
    window.addEventListener('soostori:app:reportsDate', onReportsDate)

    return () => {
      window.removeEventListener('soostori:pos:held-count', onHeldCount)
      window.removeEventListener('soostori:app:inventorySearch', onInventorySearch)
      window.removeEventListener('soostori:app:debtSearch', onDebtSearch)
      window.removeEventListener('soostori:app:reportsDate', onReportsDate)
    }
  }, [])

  return { heldSalesCount, inventorySearch, debtSearch, reportsDateFilter }
}
