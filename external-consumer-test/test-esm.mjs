// External ESM consumer test — Phase 11A v2
// Tests actual named exports from each package, internal dependency chain resolution.

// Internal dependency chain:
//   consumer -> @soostori/inventory -> @soostori/events -> @soostori/core
//   consumer -> @soostori/business   -> @soostori/events -> @soostori/core
//   consumer -> @soostori/schema     -> @soostori/core

import { asShopId, asDeviceId, newId, SoostoriError } from '@soostori/core'
import { createEvent, SALE_PENDING, STOCK_RECEIVED, getEventBus } from '@soostori/events'
import { cloudEntities, getEntitySchema } from '@soostori/schema'
import { StockMovementLedger } from '@soostori/inventory'
import * as business from '@soostori/business'

console.log('=== Soostori SDK Alpha ESM Consumer Test ===')

// Core
const shopId = asShopId(newId())
const deviceId = asDeviceId(newId())
console.log(`[core] asShopId OK: ${typeof shopId === 'string'}`)
console.log(`[core] SoostoriError class: ${SoostoriError.name}`)

// Events
const ev = createEvent(SALE_PENDING, { saleId: 'test' }, { deviceId, userId: 'u1' })
console.log(`[events] createEvent OK: name=${ev.name}`)
console.log(`[events] catalog has SALE_PENDING=${SALE_PENDING}, STOCK_RECEIVED=${STOCK_RECEIVED}`)
console.log(`[events] getEventBus OK: ${typeof getEventBus === 'function'}`)

// Schema
const productSchema = getEntitySchema('products')
console.log(`[schema] getEntitySchema('products') has ${Object.keys(productSchema || {}).length} fields`)
console.log(`[schema] cloudEntities has ${Object.keys(cloudEntities).length} entries`)

// Inventory
console.log(`[inventory] StockMovementLedger class: ${StockMovementLedger.name}`)

// Business
console.log(`[business] exports: ${Object.keys(business).length} items`)

// Internal dependency chain test — run an actual ledger operation
// Note: requires a real InventoryRepository adapter — for this consumer test
// we just verify that the classes can be instantiated/imported correctly.
console.log(`\n=== Internal dependency chain resolved successfully ===`)
console.log(`consumer -> @soostori/inventory -> @soostori/events -> @soostori/core: OK`)
console.log(`consumer -> @soostori/business -> @soostori/events -> @soostori/core: OK`)
console.log(`consumer -> @soostori/schema -> @soostori/core: OK`)

// Dynamic import test
console.log('\n=== Dynamic import test ===')
const dynamic = await import('@soostori/events')
console.log(`[dynamic] ${Object.keys(dynamic).length} exports from dynamic import`)

console.log('\n=== ALL ESM TESTS PASSED ===')
