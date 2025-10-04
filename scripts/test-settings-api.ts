import { prisma } from "@/lib/prisma"

async function testSettingsAPI() {
  try {
    console.log("Testing settings database...")

    // Test 1: Create some settings
    console.log("\n1. Creating test settings...")
    await prisma.systemSettings.upsert({
      where: { key: "systemName" },
      create: {
        key: "systemName",
        value: "DaNiKo Zorgdossier",
        category: "general",
      },
      update: {
        value: "DaNiKo Zorgdossier",
        category: "general",
      },
    })
    console.log("✅ Created systemName setting")

    // Test 2: Fetch all settings
    console.log("\n2. Fetching all settings...")
    const allSettings = await prisma.systemSettings.findMany()
    console.log(`Found ${allSettings.length} settings:`)
    allSettings.forEach((s) => {
      console.log(`  - ${s.key} = ${s.value} (${s.category})`)
    })

    // Test 3: Fetch by category
    console.log("\n3. Fetching general category...")
    const generalSettings = await prisma.systemSettings.findMany({
      where: { category: "general" },
    })
    console.log(`Found ${generalSettings.length} general settings`)

    console.log("\n✅ All tests passed!")
  } catch (error) {
    console.error("\n❌ ERROR:", error)
  } finally {
    await prisma.$disconnect()
  }
}

testSettingsAPI()
