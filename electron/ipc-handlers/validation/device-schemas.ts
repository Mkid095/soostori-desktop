import { z } from 'zod'

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1),
  shopId: z.string().min(1),
  deviceName: z.string().min(1).max(100).optional(),
  deviceType: z.string().max(50).optional(),
  capabilities: z.string().optional(),
  employeeId: z.string().optional(),
})

export const requestPairingSchema = z.object({
  shopId: z.string().min(1),
  deviceId: z.string().min(1),
  requestedBy: z.string().min(1),
  deviceName: z.string().max(100).optional(),
})

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>
export type RequestPairingInput = z.infer<typeof requestPairingSchema>
