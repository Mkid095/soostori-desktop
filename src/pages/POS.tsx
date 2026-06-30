import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Search, ShoppingCart, Trash2, Plus, Minus, RotateCcw,
  X, Check, CreditCard, Banknote, Loader2, Pause, Clock,
  CheckCircle, Clipboard, Zap, Tag, Package, Wifi, AlertCircle,
  ChevronRight, User, Phone, CheckSquare,
} from 'lucide-react'
import {
  useProducts, useCategories, useCreateSale, useHeldSales,
  useCreateHeldSale, useDeleteHeldSale, useCreateDebt,
  useCustomers, useCreateCustomer, useShopSettings,
} from '../hooks/useDatabase'
import { useScanner } from '../hooks/useScanner'
import { formatCurrency } from '../lib/utils'
import type { Product, CartItem, Customer } from '../lib/types'

const CART_KEY = 'soostori_pos_cart'
function loadCart(): CartItem[] { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] } }
function saveCart(cart: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }

// ========== CHECKOUT SHEET (FULL PAGE) ==========
const CheckoutSheet: React.FC<{
  cart: CartItem[],
  onPay: (data: {
    method: 'cash' | 'mpesa' | 'debt'
    paidAmount?: number
    customerId?: string
    customerName?: string
    customerPhone?: string
    note?: string
  }) => void,
  onClose: () => void,
  onHold: () => void,
  isProcessing: boolean,
  shopSettings?: any,
  saleAmount?: number,
}> = ({ cart, onPay, onClose, onHold, isProcessing, shopSettings, saleAmount = 0 }) => {
  const [method, setMethod] = useState<'cash' | 'debt' | 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi'>('cash')
  const [given, setGiven] = useState('')
  const [note, setNote] = useState('')
  const [mpesaConfirmed, setMpesaConfirmed] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  // Debt: customer selection
  const { data: customers = [] } = useCustomers()
  const [debtCustomerId, setDebtCustomerId] = useState('')
  const [debtCustomerName, setDebtCustomerName] = useState('')
  const [debtCustomerPhone, setDebtCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const createCustomer = useCreateCustomer()

  const total = cart.reduce((s, i) => s + i.totalPrice, 0)
  const givenAmt = parseFloat(given) || 0
  const change = givenAmt - total

  // Determine which M-Pesa type is configured (only one should be active)
  const activeMpesaType = useMemo(() => {
    if (shopSettings?.mpesaSendMoneyPhone) return 'sendMoney'
    if (shopSettings?.mpesaPaybillNumber) return 'mpesaPaybill'
    if (shopSettings?.bankPaybillNumber) return 'bankPaybill'
    if (shopSettings?.mpesaPochiPhone) return 'pochi'
    return null
  }, [shopSettings])

  // All available payment methods based on configuration
  const paymentMethods = useMemo(() => {
    const methods = [
      { v: 'cash', label: 'Cash', icon: Banknote },
      { v: 'debt', label: 'Debt', icon: Clock },
    ]
    if (activeMpesaType === 'sendMoney') methods.push({ v: 'sendMoney', label: 'Send Money', icon: Wifi })
    if (activeMpesaType === 'mpesaPaybill') methods.push({ v: 'mpesaPaybill', label: 'M-Pesa Paybill', icon: CreditCard })
    if (activeMpesaType === 'bankPaybill') methods.push({ v: 'bankPaybill', label: 'Bank Paybill', icon: CreditCard })
    if (activeMpesaType === 'pochi') methods.push({ v: 'pochi', label: 'Pochi La Biashara', icon: Phone })
    return methods
  }, [activeMpesaType])

  // Set default method to first M-Pesa type if configured, otherwise cash
  useEffect(() => {
    if (activeMpesaType) {
      setMethod(activeMpesaType as any)
    }
  }, [activeMpesaType])

  // Quick cash amounts
  const quickAmounts = useMemo(() => {
    const t = Math.ceil(total / 100) * 100
    return [t, t + 50, t + 100, t + 200].filter((a, i, arr) => arr.indexOf(a) === i && a >= t)
  }, [total])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showThankYou) {
          onClose()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showThankYou, onClose])

  const handleDebtCustomerSelect = (id: string) => {
    setDebtCustomerId(id)
    const cust = customers.find(c => c.id === id)
    if (cust) {
      setDebtCustomerName(cust.name)
      setDebtCustomerPhone(cust.phone || '')
    }
    setShowNewCustomer(false)
  }

  const canConfirm = useMemo(() => {
    if (isProcessing) return false
    if (method === 'cash') return givenAmt >= total
    if (['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method)) return mpesaConfirmed
    if (method === 'debt') {
      if (showNewCustomer) return debtCustomerName.trim().length > 0 && debtCustomerPhone.trim().length > 0
      return debtCustomerId.length > 0 || (debtCustomerName.trim().length > 0 && debtCustomerPhone.trim().length > 0)
    }
    return true
  }, [method, givenAmt, total, mpesaConfirmed, debtCustomerId, debtCustomerName, debtCustomerPhone, showNewCustomer, isProcessing])

  const handleConfirm = () => {
    if (!canConfirm) return

    if (method === 'debt' && showNewCustomer && debtCustomerName && debtCustomerPhone) {
      createCustomer.mutateAsync({
        name: debtCustomerName.trim(),
        phone: debtCustomerPhone.trim(),
      }).then(c => {
        onPay({
          method: 'debt',
          customerId: (c as any)?.id || debtCustomerName,
          customerName: debtCustomerName.trim(),
          customerPhone: debtCustomerPhone.trim(),
          note: note.trim(),
        })
      })
      return
    }

    onPay({
      method,
      paidAmount: method === 'cash' ? givenAmt : total,
      customerId: debtCustomerId || undefined,
      customerName: debtCustomerName || undefined,
      customerPhone: debtCustomerPhone || undefined,
      note: note.trim() || undefined,
    })
  }

  // Show thank you screen after payment is processed
  useEffect(() => {
    if (!isProcessing && cart.length === 0) {
      setShowThankYou(true)
    }
  }, [isProcessing, cart.length])

  // Thank You screen
  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center animate-fade-in p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Thank you for visiting!</h2>
          <p className="text-slate-500 mb-8">Your payment has been received.</p>
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-center border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Amount Paid</p>
            <p className="text-4xl font-black text-emerald-600">{formatCurrency(saleAmount)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-lg hover:bg-orange-600 shadow-lg shadow-orange-200 flex items-center justify-center gap-2">
            <CheckCircle size={20} />
            Done — Next Customer
          </button>
          <p className="text-xs text-slate-400 mt-4">Press Escape to close</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <h2 className="font-black text-slate-800 text-xl">Checkout</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onHold}
            className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5">
            <Pause size={16} />
            Hold
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main content - two column layout on larger screens, stacked on mobile */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left column - Cart & Amount */}
          <div className="space-y-6">
            {/* Total */}
            <div className="text-center py-5 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">Amount Due</p>
              <p className="text-4xl font-black text-brand-orange">{formatCurrency(total)}</p>
            </div>

            {/* Cart items summary */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100">
              {cart.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Payment options */}
          <div className="space-y-5">

            {/* Payment method buttons */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(({ v, label, icon: Icon }) => {
                const isMpesa = ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(v as string)
                const colors = method === v
                  ? isMpesa ? 'bg-green-50 border-green-500 text-green-700'
                    : v === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-amber-50 border-amber-500 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
                return (
                  <button key={v} onClick={() => { setMethod(v as any); setMpesaConfirmed(false) }}
                    className={`py-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${colors}`}>
                    <Icon size={20} />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* === CASH === */}
            {method === 'cash' && (
              <div className="space-y-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount Given</p>
                <input type="number" placeholder="0.00"
                  value={given} onChange={e => setGiven(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-4 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none text-center text-2xl"
                  autoFocus />
                <div className="flex gap-2 flex-wrap">
                  {quickAmounts.map(a => (
                    <button key={a} onClick={() => setGiven(String(a))}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        givenAmt === a ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                      }`}>
                      {formatCurrency(a)}
                    </button>
                  ))}
                  <button onClick={() => setGiven(String(Math.ceil(total)))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${givenAmt === Math.ceil(total) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}>
                    Exact
                  </button>
                </div>
                {givenAmt > 0 && givenAmt < total && (
                  <div className="p-3 bg-red-50 rounded-xl text-center border border-red-100">
                    <p className="text-sm text-red-600 font-bold">Insufficient — customer still owes {formatCurrency(total - givenAmt)}</p>
                  </div>
                )}
                {givenAmt >= total && (
                  <div className="p-4 bg-emerald-50 rounded-xl text-center border-2 border-emerald-200">
                    <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Change Due</p>
                    <p className="text-3xl font-black text-emerald-700">{formatCurrency(change)}</p>
                  </div>
                )}
              </div>
            )}

            {/* === M-PESA TYPES === */}
            {['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method) && (
              <div className="space-y-4 p-5 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-sm font-bold text-green-700 text-center">
                  {method === 'sendMoney' ? 'Send Money to' :
                   method === 'mpesaPaybill' ? 'M-Pesa Paybill' :
                   method === 'bankPaybill' ? 'Bank Paybill' : 'Pochi La Biashara'}
                </p>

                {/* Credentials display */}
                {method === 'sendMoney' && shopSettings?.mpesaSendMoneyPhone && (
                  <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Phone Number</p>
                    <p className="text-2xl font-black text-green-800">{shopSettings.mpesaSendMoneyPhone}</p>
                  </div>
                )}

                {method === 'mpesaPaybill' && (
                  <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Paybill Number</p>
                    <p className="text-2xl font-black text-green-800">{shopSettings.mpesaPaybillNumber}</p>
                    {shopSettings?.mpesaPaybillAccount && (
                      <>
                        <p className="text-xs text-green-600 font-semibold mb-1 mt-2">Account</p>
                        <p className="text-xl font-black text-green-800">{shopSettings.mpesaPaybillAccount}</p>
                      </>
                    )}
                  </div>
                )}

                {method === 'bankPaybill' && (
                  <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Paybill Number</p>
                    <p className="text-2xl font-black text-green-800">{shopSettings.bankPaybillNumber}</p>
                    {shopSettings?.bankPaybillAccount && (
                      <>
                        <p className="text-xs text-green-600 font-semibold mb-1 mt-2">Account</p>
                        <p className="text-xl font-black text-green-800">{shopSettings.bankPaybillAccount}</p>
                      </>
                    )}
                  </div>
                )}

                {method === 'pochi' && shopSettings?.mpesaPochiPhone && (
                  <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Phone Number</p>
                    <p className="text-2xl font-black text-green-800">{shopSettings.mpesaPochiPhone}</p>
                  </div>
                )}

                {/* Amount */}
                <div className="bg-white rounded-xl p-4 text-center border border-green-200">
                  <p className="text-xs text-green-600 font-semibold mb-1">Customer Pays</p>
                  <p className="text-2xl font-black text-green-700">{formatCurrency(total)}</p>
                </div>

                {!mpesaConfirmed && (
                  <button
                    onClick={() => setMpesaConfirmed(true)}
                    className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-base hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                    <CheckSquare size={20} />
                    I've Received the Payment
                  </button>
                )}

                {mpesaConfirmed && (
                  <div className="p-4 bg-emerald-100 rounded-xl text-center border-2 border-emerald-300">
                    <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-700">Payment Confirmed!</p>
                    <p className="text-xs text-emerald-600 mt-1">{formatCurrency(total)} received</p>
                  </div>
                )}
              </div>
            )}

            {/* === DEBT === */}
            {method === 'debt' && (
              <div className="space-y-3 p-5 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-700 font-semibold">Record debt — customer will owe {formatCurrency(total)}</p>

                {!showNewCustomer ? (
                  <>
                    <select value={debtCustomerId} onChange={e => handleDebtCustomerSelect(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl py-3 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400">
                      <option value="">— Select returning customer —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                    </select>
                    <button onClick={() => { setShowNewCustomer(true); setDebtCustomerId('') }}
                      className="w-full py-2.5 text-brand-orange font-bold text-sm border-2 border-dashed border-brand-orange rounded-xl hover:bg-orange-50">
                      + New Customer
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 p-3 bg-white rounded-xl border border-amber-200">
                    <p className="text-xs font-bold text-amber-700">New Customer</p>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-amber-600 shrink-0" />
                      <input type="text" placeholder="Customer name *"
                        value={debtCustomerName} onChange={e => setDebtCustomerName(e.target.value)}
                        className="flex-1 bg-slate-50 border border-amber-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400"
                        autoFocus />
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-amber-600 shrink-0" />
                      <input type="tel" placeholder="Phone number *"
                        value={debtCustomerPhone} onChange={e => setDebtCustomerPhone(e.target.value)}
                        className="flex-1 bg-slate-50 border border-amber-200 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-400" />
                    </div>
                    <button onClick={() => setShowNewCustomer(false)}
                      className="w-full text-xs text-slate-500 font-semibold hover:text-slate-700">
                      ← Back to existing customers
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            {(method === 'debt' || ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method)) && (
              <textarea placeholder="Add a note (optional)..."
                value={note} onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-orange resize-none" />
            )}
          </div>
        </div>
      </div>

      {/* Confirm button — fixed at bottom */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
        <button onClick={handleConfirm} disabled={!canConfirm}
          className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-lg hover:bg-orange-600 disabled:opacity-40 shadow-lg shadow-orange-200 flex items-center justify-center gap-2">
          {isProcessing || createCustomer.isPending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : !mpesaConfirmed && ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method) ? (
            <Wifi size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          {isProcessing || createCustomer.isPending ? 'Processing...' :
            method === 'cash' ? `Receive ${formatCurrency(total)}` :
            ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method) ? (mpesaConfirmed ? 'Complete Sale' : 'Confirm Payment') :
            'Record Debt'}
        </button>
      </div>
    </div>
  )
}

// ========== HELD SALES SHEET ==========
const HeldSalesSheet: React.FC<{
  heldSales: any[],
  onRecall: (s: any) => void, onDelete: (id: string) => void, onClose: () => void
}> = ({ heldSales, onRecall, onDelete, onClose }) => (
  <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end justify-center animate-fade-in">
    <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl animate-slide-up">
      <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h2 className="font-black text-slate-800">Held Orders ({heldSales.length})</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full"><X size={18} className="text-slate-400" /></button>
      </div>
      <div className="px-5 py-3 max-h-80 overflow-y-auto space-y-2">
        {heldSales.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No held orders</p>
            <p className="text-xs mt-0.5">Hold an order to resume later</p>
          </div>
        ) : heldSales.map(s => {
          const items = s.cartItems || []
          const total = items.reduce((sum: number, i: CartItem) => sum + (i.totalPrice || 0), 0)
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-700 truncate">{s.name || 'Held Order'}</p>
                <p className="text-xs text-slate-400">{items.length} items • {formatCurrency(total)} • {new Date(s.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => { onRecall(s); onClose() }}
                className="px-3 py-1.5 bg-brand-orange text-white rounded-lg font-bold text-xs flex items-center gap-1 hover:bg-orange-600">
                <RotateCcw size={10} /> Recall
              </button>
              <button onClick={() => onDelete(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  </div>
)

// ========== PRODUCT CARD (compact) ==========
const ProductCard: React.FC<{ product: Product; onTap: () => void }> = ({ product, onTap }) => {
  const out = product.trackInventory && product.stockQuantity <= 0
  const low = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
  return (
    <button onClick={onTap} disabled={out}
      className={`p-2.5 rounded-xl border text-left transition-all ${out
        ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
        : 'bg-white border-orange-100 hover:border-brand-orange hover:shadow-sm active:scale-95'
      }`}>
      <div className="flex justify-between items-start gap-1">
        <span className={`font-semibold text-xs leading-tight flex-1 truncate ${out ? 'text-slate-400' : 'text-slate-700'}`}>
          {product.name}
        </span>
        <span className={`font-black text-xs whitespace-nowrap ${out ? 'text-slate-400' : 'text-brand-orange'}`}>
          {formatCurrency(product.sellingPrice)}
        </span>
      </div>
      {product.trackInventory && (
        <div className="mt-1">
          {out ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Out</span>
          ) : low ? (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{product.stockQuantity} left</span>
          ) : (
            <span className="text-[10px] text-slate-400 font-semibold">{product.stockQuantity} in stock</span>
          )}
        </div>
      )}
    </button>
  )
}

// ========== CART ITEM (compact row) ==========
const CartRow: React.FC<{
  item: CartItem; onInc: () => void; onDec: () => void; onRm: () => void
}> = ({ item, onInc, onDec, onRm }) => (
  <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-700 truncate">{item.productName}</p>
      <p className="text-[10px] text-slate-400">{formatCurrency(item.unitPrice)}</p>
    </div>
    <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-1">
      <button onClick={onDec} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-brand-orange rounded">
        <Minus size={10} />
      </button>
      <span className="w-5 text-center font-black text-xs">{item.quantity}</span>
      <button onClick={onInc} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-brand-orange rounded">
        <Plus size={10} />
      </button>
    </div>
    <p className="text-xs font-black text-slate-800 w-16 text-right">{formatCurrency(item.totalPrice)}</p>
    <button onClick={onRm} className="p-1 text-red-400 hover:text-red-600">
      <Trash2 size={11} />
    </button>
  </div>
)

// ========== MAIN POS ==========
const POS: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: allProducts = [] } = useProducts()
  const { data: categories = [] } = useCategories()
  const { data: shopSettings } = useShopSettings()
  const createSale = useCreateSale()
  const { data: heldSales = [] } = useHeldSales()
  const createHeldSale = useCreateHeldSale()
  const deleteHeldSale = useDeleteHeldSale()

  const [cart, setCart] = useState<CartItem[]>(loadCart)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showHeld, setShowHeld] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanFlash, setScanFlash] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lastSaleAmount, setLastSaleAmount] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { saveCart(cart) }, [cart])

  const products = useMemo(() => {
    return allProducts.filter(p => {
      if (!p.isActive) return false
      const mS = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      const mC = !selectedCategory || p.categoryId === selectedCategory
      return mS && mC
    })
  }, [allProducts, search, selectedCategory])

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === product.id && !i.isCombo)
      if (ex) return prev.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i)
      return [...prev, { productId: product.id, productName: product.name, quantity: 1,
        unitPrice: product.sellingPrice, discount: 0, totalPrice: product.sellingPrice }]
    })
  }, [])

  const inc = useCallback((id: string) => setCart(prev => prev.map(i =>
    i.productId === id ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i)), [])
  const dec = useCallback((id: string) => setCart(prev => prev.map(i =>
    i.productId === id && i.quantity > 1
      ? { ...i, quantity: i.quantity - 1, totalPrice: (i.quantity - 1) * i.unitPrice } : i)
    .filter(i => !(i.productId === id && i.quantity < 1))), [])
  const rm = useCallback((id: string) => setCart(prev => prev.filter(i => i.productId !== id)), [])
  const clearCart = useCallback(() => setCart([]), [])

  const handleScan = useCallback((barcode: string) => {
    const p = allProducts.find(prod => prod.barcode?.toUpperCase() === barcode.toUpperCase())
    if (p) {
      addToCart(p)
      setScanFlash(true)
      setScanError(null)
      setTimeout(() => setScanFlash(false), 400)
    } else {
      setScanError(`"${barcode}" not found in store`)
      setTimeout(() => setScanError(null), 3000)
    }
  }, [allProducts, addToCart])

  useScanner(handleScan)

  const handlePay = async (data: {
    method: 'cash' | 'mpesa' | 'debt'
    paidAmount?: number
    customerId?: string
    customerName?: string
    customerPhone?: string
    note?: string
  }) => {
    if (!cart.length) return
    const amountPaid = data.paidAmount || subtotal
    setLastSaleAmount(amountPaid)
    setIsProcessing(true)
    try {
      await createSale.mutateAsync({
        items: cart,
        subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paidAmount: amountPaid,
        paymentMethod: data.method,
        note: data.note,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      })
      setCart([])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckoutOpen = () => {
    queryClient.invalidateQueries({ queryKey: ['shopSettings'] })
    setShowCheckout(true)
    setLastSaleAmount(0)
  }

  const handleHold = async () => {
    if (!cart.length) return
    await createHeldSale.mutateAsync({
      name: `Order ${new Date().toLocaleString()}`,
      cartItems: cart,
      paymentMethod: 'cash',
    })
    setCart([])
    setShowCheckout(false)
  }

  const handleCheckoutClose = () => {
    setShowCheckout(false)
    setCart([])
  }

  const handleRecall = (s: any) => {
    const items = s.cartItems || []
    setCart(items)
    // Remove from held sales after restoring
    deleteHeldSale.mutate(s.id)
  }

  const COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#06B6D4', '#F59E0B']

  return (
    <div className="h-full bg-soft-yellow flex">
      {/* LEFT: Categories */}
      <div className="w-44 bg-white border-r border-slate-100 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
          <button onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 flex items-center gap-2 transition-all ${
              selectedCategory === null ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}>
            <Package size={13} className="shrink-0" />
            <span className="text-xs font-semibold truncate">All</span>
          </button>
          {categories.map((cat, i) => {
            const col = cat.color || COLORS[i % COLORS.length]
            const cnt = allProducts.filter(p => p.categoryId === cat.id && p.isActive).length
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 flex items-center gap-2 transition-all ${
                  selectedCategory === cat.id ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: col } : {}}>
                <Tag size={13} className="shrink-0" style={selectedCategory !== cat.id ? { color: col } : {}} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold truncate block">{cat.name}</span>
                  <span className="text-[10px] opacity-60">{cnt}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* CENTER: Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar */}
        <div className="px-3 py-2 bg-white border-b border-slate-100 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} type="text" placeholder="Search or scan barcode..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold focus:border-brand-orange outline-none placeholder:text-slate-400" />
          </div>
          {scanFlash && <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shrink-0" title="Item added!" />}
          {scanError && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg animate-fade-in shrink-0">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">{scanError}</span>
            </div>
          )}
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <Package size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-1.5">
              {products.map(p => <ProductCard key={p.id} product={p} onTap={() => addToCart(p)} />)}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-72 bg-white border-l border-slate-100 flex flex-col shrink-0">
        {/* Cart header */}
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-brand-orange" />
            <span className="text-xs font-black text-slate-700">Cart</span>
            {itemCount > 0 && <span className="px-1.5 py-0.5 bg-brand-orange text-white rounded-full text-[10px] font-bold">{itemCount}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHeld(true)}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Held sales">
              <Clipboard size={13} />
            </button>
            <button onClick={clearCart} disabled={!cart.length}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <ShoppingCart size={28} className="mb-1 opacity-30" />
              <p className="text-xs font-semibold">Tap items to add</p>
            </div>
          ) : cart.map((item, i) => (
            <CartRow key={i} item={item}
              onInc={() => inc(item.productId)} onDec={() => dec(item.productId)} onRm={() => rm(item.productId)} />
          ))}
        </div>

        {/* Totals + actions */}
        <div className="px-3 py-2 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500 font-semibold">Total</span>
            <span className="text-lg font-black text-brand-orange">{formatCurrency(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={handleHold} disabled={!cart.length}
              className="py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center gap-1">
              <Pause size={12} /> Hold
            </button>
            <button onClick={handleCheckoutOpen} disabled={!cart.length}
              className="py-2 bg-brand-orange text-white rounded-xl font-bold text-xs hover:bg-orange-600 disabled:opacity-40 shadow-sm shadow-orange-200 flex items-center justify-center gap-1">
              <CheckCircle size={12} /> Pay
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCheckout && (
        <CheckoutSheet
          cart={cart}
          onPay={handlePay}
          onClose={handleCheckoutClose}
          onHold={handleHold}
          isProcessing={isProcessing}
          shopSettings={shopSettings}
          saleAmount={lastSaleAmount}
        />
      )}
      {showHeld && (
        <HeldSalesSheet heldSales={heldSales} onRecall={handleRecall} onDelete={id => deleteHeldSale.mutate(id)} onClose={() => setShowHeld(false)} />
      )}
    </div>
  )
}

export default POS
