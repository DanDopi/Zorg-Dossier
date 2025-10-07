import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function makeSuperAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error("Please provide an email address")
    console.log("Usage: npx tsx scripts/make-admin.ts <email>")
    process.exit(1)
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "SUPER_ADMIN" },
    })

    console.log(`✅ User ${user.email} is now a SUPER_ADMIN`)
    console.log(`Role: ${user.role}`)
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

makeSuperAdmin()
