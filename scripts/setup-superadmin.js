const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const readline = require("readline")

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function setupSuperAdmin() {
  console.log("\n==============================================")
  console.log("  Zorgdossier - Super Admin Setup")
  console.log("==============================================\n")

  try {
    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
      },
    })

    if (existingSuperAdmin) {
      console.log("❌ Er bestaat al een Super Admin account.")
      console.log(`   Email: ${existingSuperAdmin.email}`)
      console.log("\n   Als u deze wilt verwijderen, gebruik dan Prisma Studio:")
      console.log("   npx prisma studio\n")
      rl.close()
      await prisma.$disconnect()
      return
    }

    // Get email
    const email = await question("Email adres voor Super Admin: ")
    if (!email || !email.includes("@")) {
      console.log("\n❌ Ongeldig email adres.\n")
      rl.close()
      await prisma.$disconnect()
      return
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log("\n❌ Dit email adres is al in gebruik.\n")
      rl.close()
      await prisma.$disconnect()
      return
    }

    // Get password
    const password = await question("Wachtwoord (minimaal 8 karakters): ")
    if (!password || password.length < 8) {
      console.log("\n❌ Wachtwoord moet minimaal 8 karakters bevatten.\n")
      rl.close()
      await prisma.$disconnect()
      return
    }

    // Hash password
    console.log("\n🔐 Wachtwoord wordt beveiligd...")
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create super admin user
    console.log("👤 Super Admin account wordt aangemaakt...")
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        emailVerified: new Date(), // Auto-verify super admin
      },
    })

    console.log("\n✅ Super Admin account succesvol aangemaakt!")
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   ID: ${user.id}`)
    console.log("\n💡 U kunt nu inloggen op de applicatie.\n")
  } catch (error) {
    console.error("\n❌ Fout bij het aanmaken van Super Admin:")
    console.error(error.message)
    console.log()
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

setupSuperAdmin()
