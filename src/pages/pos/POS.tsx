import React, { useEffect, useRef } from 'react'
import { Search, ShoppingCart, X, Package, AlertCircle } from 'lucide-react'
import { useCategories, useShopSettings } from '../../hooks/useDatabase'
import { useCartState } from './hooks/useCartState'
import { useScanner } from '../../hooks/useScanner'
import { subscribeHeaderActions } from '../../lib/header-controls-bus'
import ProductCard from './components/ProductCard'
import CheckoutSheet from './components/CheckoutSheet'
import HeldSalesSheet from './components/HeldSalesSheet'
import POSCategories from './components/POSCategories'
import POSCart from './components/POSCart'

const POS: React.FC = () => {
  const { data: categories = [] } = useCategories()
  const { data: shopSettings } = useShopSettings()

  const {
    cart, allProducts, products, subtotal, itemCount,
    selectedCategory, setSelectedCategory, search, setSearch,
    showCheckout, showHeld, setShowHeld, isProcessing,
    lastSaleAmount, scanFlash, scanError, heldSales,
    addToCart, inc, dec, rm, clearCart, handleScan, handlePay,
    handleCheckoutOpen, handleHold, handleCheckoutClose, handleRecall,
    handleDeleteHeldSale,
  } = useCartState()

  const searchRef = useRef<HTMLInputElement>(null)
  useScanner(handleScan)

  useEffect(() => subscribeHeaderActions((action) => {
    if (action.type === 'pos:showHeld') setShowHeld(true)
  }), [setShowHeld])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent<number>('soostori:pos:held-count', { detail: heldSales.length }))
  }, [heldSales.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showCheckout) return
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        if (cart.length === 0) return
        e.preventDefault()
        handleHold()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cart.length, handleHold, showCheckout])

  return (
    <div className="h-full bg-soft-yellow flex">
      <POSCategories categories={categories} allProducts={allProducts}
        selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      <div className="flex-1 flex flex-col min-w-0">
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
          {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>

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

      <POSCart cart={cart} subtotal={subtotal} itemCount={itemCount}
        onInc={inc} onDec={dec} onRm={rm} onClear={clearCart}
        onHold={handleHold} onCheckoutOpen={handleCheckoutOpen} onShowHeld={() => setShowHeld(true)} />

      {showCheckout && (
        <CheckoutSheet cart={cart} onPay={handlePay} onClose={handleCheckoutClose} onHold={handleHold}
          isProcessing={isProcessing} shopSettings={shopSettings} saleAmount={lastSaleAmount} />
      )}
      {showHeld && (
        <HeldSalesSheet heldSales={heldSales} onRecall={handleRecall}
          onDelete={handleDeleteHeldSale} onClose={() => setShowHeld(false)} />
      )}
    </div>
  )
}

export default POS
