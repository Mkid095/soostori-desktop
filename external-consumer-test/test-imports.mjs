// Minimal ESM import test — only verifies package resolution, not specific exports
import * as core from '@soostori/core'
import * as events from '@soostori/events'
import * as schema from '@soostori/schema'
import * as business from '@soostori/business'
import * as inventory from '@soostori/inventory'

console.log('=== Soostori SDK Alpha Consumer Test ===')
console.log(`@soostori/core: ${Object.keys(core).length} exports`)
console.log(`@soostori/events: ${Object.keys(events).length} exports`)
console.log(`@soostori/schema: ${Object.keys(schema).length} exports`)
console.log(`@soostori/business: ${Object.keys(business).length} exports`)
console.log(`@soostori/inventory: ${Object.keys(inventory).length} exports`)

// Verify a specific re-exported item
console.log(`core.SALE_PENDING via events:`, events.SALE_PENDING)
console.log('=== All ESM imports succeeded ===')
