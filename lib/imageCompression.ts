"use client"

export interface CompressImageOptions {
  maxDimension?: number
  quality?: number
}

export interface CompressedImageResult {
  base64: string
  file: File
  originalSize: number
  compressedSize: number
}

/**
 * Comprimeert een afbeelding client-side via de Canvas API.
 * Verkleint naar maxDimension en hercodert als JPEG.
 */
export async function compressImage(
  file: File,
  options?: CompressImageOptions
): Promise<CompressedImageResult> {
  const { maxDimension = 1920, quality = 0.82 } = options || {}

  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Kon afbeelding niet laden"))
      image.src = objectUrl
    })

    // Calculate scaled dimensions
    let { width, height } = img
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height / width) * maxDimension)
        width = maxDimension
      } else {
        width = Math.round((width / height) * maxDimension)
        height = maxDimension
      }
    }

    // Draw on canvas
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, width, height)

    // Export as JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas export mislukt"))),
        "image/jpeg",
        quality
      )
    })

    // If compressed is larger than original, return original as-is
    if (blob.size >= file.size) {
      const originalBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      return {
        base64: originalBase64,
        file,
        originalSize: file.size,
        compressedSize: file.size,
      }
    }

    // Create File object with .jpg extension
    const baseName = file.name.replace(/\.[^.]+$/, "")
    const compressedFile = new File([blob], baseName + ".jpg", {
      type: "image/jpeg",
    })

    // Create base64 data URL
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    console.log(
      `Afbeelding gecomprimeerd: ${(file.size / 1024).toFixed(0)}KB → ${(blob.size / 1024).toFixed(0)}KB (${((1 - blob.size / file.size) * 100).toFixed(0)}% kleiner)`
    )

    return {
      base64,
      file: compressedFile,
      originalSize: file.size,
      compressedSize: blob.size,
    }
  } catch {
    // Fallback: return original file if compression fails
    const originalBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return {
      base64: originalBase64,
      file,
      originalSize: file.size,
      compressedSize: file.size,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
