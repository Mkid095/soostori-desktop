import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Product, CartItem } from '../../../lib/types'
import { useProducts, useHeldSales, useCreateSale, useCreateHeldSale, useDeleteHeldSale, useShopSettings } from '../../../hooks/useDatabase'
import { useToast } from '../../../hooks/useToast'
import { buildReceiptData } from './build-receipt-data'
import type { CheckoutPayload } from './useCheckout'

const CART_KEY = 'soostori_pos_cart'
export const loadCart = (): CartItem[] => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] } }
export const saveCart = (cart: CartItem[]) => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }

export function useCartState() {
  const queryClient = useQueryClient()
  const { data: allProducts = [] } = useProducts()
  const { data: heldSales = [] } = useHeldSales()
  const { data: shopSettings } = useShopSettings()
  const createSale = useCreateSale()
  const createHeldSale = useCreateHeldSale()
  const deleteHeldSale = useDeleteHeldSale()
  const { showToast } = useToast()

  const [cart, setCart] = useState<CartItem[]>(loadCart)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showHeld, setShowHeld] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastSaleAmount, setLastSaleAmount] = useState(0)
  const [scanFlash, setScanFlash] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [priceSelectionProduct, setPriceSelectionProduct] = useState<Product | null>(null)

  useEffect(() => { saveCart(cart) }, [cart])

  const products = useMemo(() =>
    allProducts.filter(p => {
      if (!p.isActive) return false
      const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      return ms && (!selectedCategory || p.categoryId === selectedCategory)
    }), [allProducts, search, selectedCategory])

  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const addToCart = useCallback((product: Product) => {
    if (product.trackInventory && product.stockQuantity <= 0) {
      setScanError('Out of stock')
      return
    }
    if (product.groupPrices?.length && product.allowSingleUnitSale) {
      setPriceSelectionProduct(product)
      return
    }
    setCart(prev => {
      const ex = prev.find(i => i.productId === product.id && !i.isCombo)
      if (ex) return prev.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i)
      return [...prev, { productId: product.id, productName: product.name, quantity: 1,
        unitPrice: product.sellingPrice, discount: 0, totalPrice: product.sellingPrice }]
    })
  }, [])

  const addToCartWithPrice = useCallback((product: Product, unitPrice: number, quantity: number) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === product.id && !i.isCombo)
      if (ex) return prev.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + quantity, totalPrice: (i.quantity + quantity) * unitPrice } : i)
      return [...prev, { productId: product.id, productName: product.name, quantity,
        unitPrice, discount: 0, totalPrice: quantity * unitPrice }]
    })
    setPriceSelectionProduct(null)
  }, [])

  const cancelPriceSelection = useCallback(() => setPriceSelectionProduct(null), [])

  const inc = useCallback((id: string) => setCart(prev => {
    const item = prev.find(i => i.productId === id)
    if (!item) return prev
    const product = allProducts.find(p => p.id === id)
    if (product?.trackInventory && item.quantity >= product.stockQuantity) return prev
    return prev.map(i => i.productId === id
      ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i)
  }), [allProducts])
  const dec = useCallback((id: string) => setCart(prev => prev.map(i =>
    i.productId === id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1, totalPrice: (i.quantity - 1) * i.unitPrice } : i)
    .filter(i => !(i.productId === id && i.quantity < 1))), [])
  const rm = useCallback((id: string) => setCart(prev => prev.filter(i => i.productId !== id)), [])
  const clearCart = useCallback(() => setCart([]), [])

  const handleScan = useCallback((barcode: string) => {
    const p = allProducts.find(prod => prod.barcode?.toUpperCase() === barcode.toUpperCase())
    if (p) { addToCart(p); setScanFlash(true); setScanError(null); setTimeout(() => setScanFlash(false), 400) }
    else { setScanError(`"${barcode}" not found in store`); setTimeout(() => setScanError(null), 3000) }
  }, [allProducts, addToCart])

  const handlePay = useCallback(async (data: CheckoutPayload) => {
    if (!cart.length) return
    setLastSaleAmount(data.paidAmount || subtotal); setIsProcessing(true)
    try {
      const created = await createSale.mutateAsync({ items: cart, subtotal, discountAmount: 0, totalAmount: subtotal,
        paidAmount: data.paidAmount || subtotal, paymentMethod: data.method, note: data.note,
        customerId: data.customerId, customerName: data.customerName, customerPhone: data.customerPhone, customerIdNumber: data.customerIdNumber })
      setCart([])
      showToast('Sale completed', 'success')
      // Fire-and-forget: print receipt after the sale is recorded.
      // The IPC handler throws if the printer isn't connected; toast instead of bubbling.
      if (window.electronAPI?.hw?.printReceipt) {
        const saleId = (created && typeof created === 'object' && 'id' in created) ? String((created as { id: unknown }).id) : undefined
        const receiptData = buildReceiptData({
          cart,
          shopSettings,
          paymentMethod: data.method,
          receiptNumber: saleId,
        })
        window.electronAPI.hw.printReceipt(receiptData).catch((err: unknown) => {
          console.warn('Receipt print skipped:', err)
        })
      }
    } catch (err) {
      console.error('Payment failed:', err)
      showToast(err instanceof Error ? err.message : 'Payment failed', 'error')
    } finally { setIsProcessing(false) }
  }, [cart, subtotal, createSale, showToast, shopSettings])

  const handleCheckoutOpen = useCallback(() => { queryClient.invalidateQueries({ queryKey: ['shopSettings'] }); setShowCheckout(true); setLastSaleAmount(0) }, [queryClient])
  const handleHold = useCallback(async () => {
    if (!cart.length) return
    await createHeldSale.mutateAsync({ name: `Order ${new Date().toLocaleString()}`, cartItems: cart, paymentMethod: 'cash' })
    setCart([]); setShowCheckout(false)
  }, [cart, createHeldSale])
  const handleCheckoutClose = useCallback(() => { setShowCheckout(false) }, [])
  const handleDeleteHeldSale = useCallback((id: string) => { deleteHeldSale.mutate(id) }, [deleteHeldSale])
  const handleRecall = useCallback((s: { id: string; cartItems?: CartItem[] }) => { setCart(s.cartItems || []); deleteHeldSale.mutate(s.id) }, [deleteHeldSale])

  return { cart, allProducts, products, subtotal, itemCount, selectedCategory, setSelectedCategory, search, setSearch,
    showCheckout, showHeld, setShowHeld, isProcessing, lastSaleAmount, scanFlash, scanError, heldSales,
    priceSelectionProduct,
    addToCart, addToCartWithPrice, cancelPriceSelection, inc, dec, rm, clearCart, handleScan, handlePay,
    handleCheckoutOpen, handleHold, handleCheckoutClose, handleRecall, handleDeleteHeldSale }
}
