/**
 * cloud-entity-commission.ts — Pull enrolled businesses + packages for a salesperson.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface SalespersonPackage {
  id: string
  businessId: string
  businessName: string
  packageName: string
  amount: number
  salespersonId: string
  isActive: boolean
  createdAt: string
}

/** Pull all packages where the given salesperson is the enrollee. */
export async function pullCommissions(salespersonProfileId: string): Promise<SalespersonPackage[]> {
  if (!APP_ID || !salespersonProfileId) return []
  try {
    const result = await instant.instaqQuery(APP_ID, {
      packages: {
        $: {
          where: { salespersonId: salespersonProfileId },
          fields: {
            id: true,
            businessId: true,
            packageName: true,
            amount: true,
            salespersonId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      businesses: {
        $: {
          fields: {
            id: true,
            name: true,
          },
        },
      },
    })

    const rawPackages = (result as { packages?: Record<string, unknown>[] }).packages ?? []
    const rawBusinesses = (result as { businesses?: Record<string, unknown>[] }).businesses ?? []

    // Build business name lookup
    const businessMap = new Map<string, string>()
    for (const b of rawBusinesses) {
      const biz = b as Record<string, unknown>
      businessMap.set(String(biz.id ?? ''), String(biz.name ?? ''))
    }

    const packages: SalespersonPackage[] = []
    for (const p of rawPackages) {
      const pkg = p as Record<string, unknown>
      const businessId = String(pkg.businessId ?? '')
      packages.push({
        id: String(pkg.id ?? ''),
        businessId,
        businessName: businessMap.get(businessId) ?? businessId,
        packageName: String(pkg.packageName ?? 'Standard'),
        amount: Number(pkg.amount ?? 0),
        salespersonId: String(pkg.salespersonId ?? ''),
        isActive: Boolean(pkg.isActive ?? false),
        createdAt: String(pkg.createdAt ?? new Date().toISOString()),
      })
    }
    log.debug(`pullCommissions: found ${packages.length} packages for salesperson ${salespersonProfileId}`)
    return packages
  } catch (err) {
    log.warn('pullCommissions failed:', err)
    return []
  }
}
