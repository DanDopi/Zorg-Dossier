import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "sessionTimeout" }
    })

    const timeoutMinutes = setting?.value
      ? parseInt(setting.value)
      : parseInt(process.env.SESSION_TIMEOUT_MINUTES || "30")

    return NextResponse.json({
      timeoutMinutes,
      timeoutMilliseconds: timeoutMinutes * 60 * 1000
    })
  } catch (error) {
    console.error("Error fetching session timeout:", error)
    return NextResponse.json(
      { error: "Fout bij ophalen van sessie timeout" },
      { status: 500 }
    )
  }
}
