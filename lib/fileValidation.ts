import { prisma } from "@/lib/prisma"

/**
 * Get max file size from database settings with .env fallback
 * @returns Max file size in bytes
 */
export async function getMaxFileSize(): Promise<number> {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: "maxFileSize" }
  })

  const maxSizeMB = setting?.value
    ? parseFloat(setting.value)
    : parseFloat(process.env.MAX_FILE_SIZE_MB || "5")

  return maxSizeMB * 1024 * 1024 // Convert MB to bytes
}

/**
 * Validate file size against system settings
 * @param fileSize - File size in bytes
 * @returns Object with isValid boolean and error message if invalid
 */
export async function validateFileSize(fileSize: number): Promise<{
  isValid: boolean
  error?: string
  maxSizeMB?: number
}> {
  const maxSize = await getMaxFileSize()
  const maxSizeMB = maxSize / (1024 * 1024)

  if (fileSize > maxSize) {
    return {
      isValid: false,
      error: `Bestand is te groot (max ${maxSizeMB}MB)`,
      maxSizeMB
    }
  }

  return { isValid: true, maxSizeMB }
}

/**
 * Client-side: Get max file size for frontend validation
 * Calls API endpoint to get current setting
 */
export async function getMaxFileSizeClient(): Promise<number> {
  try {
    const response = await fetch("/api/settings/max-file-size")
    if (response.ok) {
      const data = await response.json()
      return data.maxSizeBytes
    }
  } catch (error) {
    console.error("Failed to fetch max file size:", error)
  }

  // Fallback to 5MB
  return 5 * 1024 * 1024
}
