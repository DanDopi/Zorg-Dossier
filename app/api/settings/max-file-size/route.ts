import { NextResponse } from "next/server"
import { getMaxFileSize } from "@/lib/fileValidation"

export async function GET() {
  try {
    const maxSizeBytes = await getMaxFileSize()
    const maxSizeMB = maxSizeBytes / (1024 * 1024)

    return NextResponse.json({
      maxSizeBytes,
      maxSizeMB
    })
  } catch (error) {
    console.error("Error fetching max file size:", error)
    return NextResponse.json(
      { error: "Fout bij ophalen van maximale bestandsgrootte" },
      { status: 500 }
    )
  }
}
