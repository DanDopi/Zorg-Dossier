// Preset color palette for caregivers
// 20 highly distinguishable colors for optimal visibility
export const CAREGIVER_COLORS = [
  { name: "Rood", hex: "#EF4444", rgb: "239, 68, 68" },
  { name: "Oranje", hex: "#F97316", rgb: "249, 115, 22" },
  { name: "Amber", hex: "#F59E0B", rgb: "245, 158, 11" },
  { name: "Geel", hex: "#EAB308", rgb: "234, 179, 8" },
  { name: "Limoen", hex: "#84CC16", rgb: "132, 204, 22" },
  { name: "Groen", hex: "#22C55E", rgb: "34, 197, 94" },
  { name: "Smaragd", hex: "#10B981", rgb: "16, 185, 129" },
  { name: "Turquoise", hex: "#14B8A6", rgb: "20, 184, 166" },
  { name: "Cyaan", hex: "#06B6D4", rgb: "6, 182, 212" },
  { name: "Hemelsblauw", hex: "#0EA5E9", rgb: "14, 165, 233" },
  { name: "Blauw", hex: "#3B82F6", rgb: "59, 130, 246" },
  { name: "Indigo", hex: "#6366F1", rgb: "99, 102, 241" },
  { name: "Violet", hex: "#8B5CF6", rgb: "139, 92, 246" },
  { name: "Paars", hex: "#A855F7", rgb: "168, 85, 247" },
  { name: "Fuchsia", hex: "#D946EF", rgb: "217, 70, 239" },
  { name: "Roze", hex: "#EC4899", rgb: "236, 72, 153" },
  { name: "Koraal", hex: "#FB7185", rgb: "251, 113, 133" },
  { name: "Bruin", hex: "#A16207", rgb: "161, 98, 7" },
  { name: "Leisteen", hex: "#64748B", rgb: "100, 116, 139" },
  { name: "Zink", hex: "#71717A", rgb: "113, 113, 122" },
]

// Get a color by index (for auto-assignment)
export function getColorByIndex(index: number) {
  return CAREGIVER_COLORS[index % CAREGIVER_COLORS.length]
}

// Get next available color for a team (avoid duplicates)
export function getNextAvailableColor(usedColors: string[]): string {
  const availableColor = CAREGIVER_COLORS.find(
    (color) => !usedColors.includes(color.hex)
  )
  return availableColor?.hex || CAREGIVER_COLORS[0].hex
}

// Check if two colors are too similar
export function colorsAreSimilar(color1: string, color2: string): boolean {
  // For now, just check exact match
  // Could implement RGB distance calculation if needed
  return color1.toLowerCase() === color2.toLowerCase()
}

// Get contrasting text color (white or black) based on background
export function getContrastingTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "")

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, black for light
  return luminance > 0.5 ? "#000000" : "#FFFFFF"
}
