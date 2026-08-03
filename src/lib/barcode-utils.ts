export function normalizeBarcode(barcode: string | null | undefined): string {
  if (!barcode) return ''
  return barcode.trim().replace(/\s+/g, '').toUpperCase()
}

export function barcodesMatch(barcode1: string | null | undefined, barcode2: string | null | undefined): boolean {
  return normalizeBarcode(barcode1) === normalizeBarcode(barcode2)
}
