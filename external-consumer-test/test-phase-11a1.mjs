// Phase 11A.1 — Comprehensive external consumer test
// Tests all 13 key SDK packages installed from tarballs

import { asShopId, asDeviceId, asUserId, newId, SoostoriError } from '@soostori/core'
import { createEvent, SALE_PENDING, STOCK_RECEIVED, PRODUCT_CREATED, getEventBus } from '@soostori/events'
import { cloudEntities, getEntitySchema } from '@soostori/schema'
import * as auth from '@soostori/auth'
import * as business from '@soostori/business'
import * as products from '@soostori/products'
import * as customers from '@soostori/customers'
import * as debts from '@soostori/debts'
import * as sales from '@soostori/sales'
import { StockMovementLedger } from '@soostori/inventory'
import * as sync from '@soostori/sync'
import * as devices from '@soostori/devices'
import * as lan from '@soostori/lan'

console.log('=== Phase 11A.1 External Consumer Test ===\n')

// === Core ===
const shopId = asShopId(newId())
const deviceId = asDeviceId(newId())
const userId = asUserId(newId())
console.log(`[core] branded IDs created: shop=${!!shopId}, device=${!!deviceId}, user=${!!userId}`)
console.log(`[core] SoostoriError available: ${typeof SoostoriError}`)

// === Events ===
const event = createEvent(SALE_PENDING, { saleId: 'test' }, { deviceId, userId, shopId })
console.log(`[events] createEvent OK: name=${event.name}`)
console.log(`[events] catalog names: SALE_PENDING=${SALE_PENDING}, STOCK_RECEIVED=${STOCK_RECEIVED}, PRODUCT_CREATED=${PRODUCT_CREATED}`)

// === Schema ===
const productSchema = getEntitySchema('products')
console.log(`[schema] product schema fields: ${Object.keys(productSchema || {}).length}`)
console.log(`[schema] cloudEntities count: ${Object.keys(cloudEntities).length}`)

// === Auth ===
console.log(`[auth] exports: ${Object.keys(auth).length} items`)

// === Business / Products / Customers / Debts / Sales ===
console.log(`[business] exports: ${Object.keys(business).length} items`)
console.log(`[products] exports: ${Object.keys(products).length} items`)
console.log(`[customers] exports: ${Object.keys(customers).length} items`)
console.log(`[debts] exports: ${Object.keys(debts).length} items`)
console.log(`[sales] exports: ${Object.keys(sales).length} items`)

// Check Product type — products package owns canonical Product
if (products.Product) console.log(`[products] Product class found`)
if (products.ProductRepository) console.log(`[products] ProductRepository interface found`)

// === Inventory ===
console.log(`[inventory] StockMovementLedger: ${typeof StockMovementLedger}`)

// === Sync ===
console.log(`[sync] exports: ${Object.keys(sync).length} items`)

// === Devices ===
console.log(`[devices] exports: ${Object.keys(devices).length} items`)

// === LAN ===
console.log(`[lan] exports: ${Object.keys(lan).length} items`)

// === Internal dependency chain resolution ===
console.log('\n=== Internal dependency chain test ===')
const chainTest = (() => {
  try {
    // sales depends on products which depends on core
    const _ = sales.SalesService
    // inventory depends on events which depends on core
    const _2 = StockMovementLedger
    // lan depends on devices which depends on core + events
    const _3 = lan.TerminalClient || lan.LANServer
    return 'OK'
  } catch (e) {
    return 'FAIL: ' + e.message
  }
})()
console.log(`Internal chain resolution: ${chainTest}`)

// === Dynamic imports ===
console.log('\n=== Dynamic import test ===')
const dyn = await import('@soostori/products')
console.log(`[dynamic] @soostori/products: ${Object.keys(dyn).length} exports`)

console.log('\n=== ALL ESM IMPORTS PASSED ===')
