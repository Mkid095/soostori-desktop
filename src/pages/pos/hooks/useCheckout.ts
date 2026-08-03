import { useState, useCallback, useEffect, useMemo } from 'react'
import { useCustomers, useCreateCustomer } from '../../../hooks/useDatabase'
import type { CartItem, Customer, ShopSettings } from '../../../lib/types'

export type PaymentMethod = 'cash' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi' | 'debt'

export interface CheckoutPayload {
  method: 'cash' | 'mpesa' | 'debt'
  paidAmount?: number
  customerId?: string
  customerName?: string
  customerPhone?: string
  note?: string
}

export function useCheckout(cart: CartItem[], shopSettings: ShopSettings | null | undefined, isProcessing: boolean, onPay: (data: CheckoutPayload) => void) {
  const { data: customers = [] } = useCustomers()
  const createCustomer = useCreateCustomer()

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [given, setGiven] = useState('')
  const [note, setNote] = useState('')
  const [mpesaConfirmed, setMpesaConfirmed] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [debtCustomerId, setDebtCustomerId] = useState('')
  const [debtCustomerName, setDebtCustomerName] = useState('')
  const [debtCustomerPhone, setDebtCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const paidRef = { current: false }

  const total = cart.reduce((s, i) => s + i.totalPrice, 0)
  const givenAmt = parseFloat(given) || 0

  const paymentMethods = useMemo(() => {
    const t = shopSettings
    const m: { v: PaymentMethod; label: string }[] = [{ v: 'cash', label: 'Cash' }, { v: 'debt', label: 'Debt' }]
    if (t?.mpesaSendMoneyPhone) m.push({ v: 'sendMoney', label: 'Send Money' })
    if (t?.mpesaPaybillNumber) m.push({ v: 'mpesaPaybill', label: 'M-Pesa Paybill' })
    if (t?.bankPaybillNumber) m.push({ v: 'bankPaybill', label: 'Bank Paybill' })
    if (t?.mpesaPochiPhone) m.push({ v: 'pochi', label: 'Pochi La Biashara' })
    return m
  }, [shopSettings])

  // Default to the first non-cash/debt method when M-Pesa is configured.
  // Side effect in render (useMemo) is forbidden — do it in an effect.
  useEffect(() => {
    if (paymentMethods.length > 2) {
      const preferred = paymentMethods[2]?.v
      if (preferred && preferred !== 'cash') setMethod(preferred)
    }
  }, [paymentMethods])

  const quickAmounts = useMemo(() => { const t = Math.ceil(total / 100) * 100; return [t, t + 50, t + 100, t + 200].filter((a, i, arr) => arr.indexOf(a) === i && a >= t) }, [total])

  const canConfirm = useMemo(() => {
    if (isProcessing) return false
    if (method === 'cash') return givenAmt >= total
    if (['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method)) return mpesaConfirmed
    if (method === 'debt') return showNewCustomer ? debtCustomerName.trim().length > 0 && debtCustomerPhone.trim().length > 0 : debtCustomerId.length > 0 || (debtCustomerName.trim().length > 0 && debtCustomerPhone.trim().length > 0)
    return true
  }, [method, givenAmt, total, mpesaConfirmed, debtCustomerId, debtCustomerName, debtCustomerPhone, showNewCustomer, isProcessing])

  const handleDebtCustomerSelect = useCallback((id: string) => {
    setDebtCustomerId(id)
    const cust = customers.find(c => c.id === id)
    if (cust) { setDebtCustomerName(cust.name); setDebtCustomerPhone(cust.phone || '') }
    setShowNewCustomer(false)
  }, [customers])

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return
    if (method === 'debt' && showNewCustomer && debtCustomerName && debtCustomerPhone) {
      createCustomer.mutateAsync({ name: debtCustomerName.trim(), phone: debtCustomerPhone.trim() })
        .then((c: Customer) => onPay({ method: 'debt', customerId: c?.id || debtCustomerName, customerName: debtCustomerName.trim(), customerPhone: debtCustomerPhone.trim(), note: note.trim() }))
      return
    }
    const coreMethod: 'cash' | 'mpesa' | 'debt' = method === 'debt' ? 'debt' : method === 'cash' ? 'cash' : 'mpesa'
    onPay({ method: coreMethod, paidAmount: method === 'cash' ? givenAmt : total, customerId: debtCustomerId || undefined, customerName: debtCustomerName || undefined, customerPhone: debtCustomerPhone || undefined, note: note.trim() || undefined })
  }, [canConfirm, method, givenAmt, total, debtCustomerId, debtCustomerName, debtCustomerPhone, note, showNewCustomer, createCustomer, onPay])

  useEffect(() => {
    if (!isProcessing && cart.length === 0 && paidRef.current) setShowThankYou(true)
    if (total > 0) paidRef.current = true
  }, [isProcessing, cart.length, total])

  const onMethodChange = useCallback((m: PaymentMethod) => {
    setMethod(m)
  }, [])

  return { method, given, note, mpesaConfirmed, showThankYou, debtCustomerId, debtCustomerName, debtCustomerPhone, showNewCustomer,
    total, givenAmt, quickAmounts, canConfirm, paymentMethods, setGiven, setNote, setMpesaConfirmed,
    setDebtCustomerId, setDebtCustomerName, setDebtCustomerPhone, setShowNewCustomer, handleDebtCustomerSelect, handleConfirm, setMethod, onMethodChange }
}
