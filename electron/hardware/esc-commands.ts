// ESC/POS Commands
export const ESC = 0x1b
export const GS = 0x1d

export const ESC_POS = {
  // Initialization
  INIT: [ESC, 0x40],

  // Text formatting
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Font size
  NORMAL: [ESC, 0x21, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],

  // Line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_SET: [ESC, 0x33],

  // Paper handling
  CUT_PAPER: [GS, 0x56, 0x00],
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01],

  // Cash drawer
  OPEN_CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa],
}

export function textToBytes(text: string): number[] {
  return Array.from(Buffer.from(text, 'utf8'))
}

export function centerText(text: string, width: number = 48): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

export function formatLine(left: string, right: string, width: number = 48): string {
  const maxLeft = width - right.length
  const leftStr = left.length > maxLeft ? left.substring(0, maxLeft - 3) + '...' : left
  return leftStr.padEnd(maxLeft) + right
}
