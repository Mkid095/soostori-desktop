// CJS import test
const core = require('@soostori/core')
const events = require('@soostori/events')
console.log('=== Soostori SDK Alpha CJS Consumer Test ===')
console.log(`@soostori/core (CJS): ${Object.keys(core).length} exports`)
console.log(`@soostori/events (CJS): ${Object.keys(events).length} exports`)
console.log('=== CJS imports succeeded ===')
