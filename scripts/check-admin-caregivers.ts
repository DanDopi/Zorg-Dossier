import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function checkAdminCaregivers() {
  try {
    // Find all caregiver profiles that belong to admin users
    const adminCaregivers = await prisma.caregiverProfile.findMany({
      where: {
        user: {
          role: {
            in: ["SUPER_ADMIN", "ADMIN"],
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        clientRelationships: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    console.log(`Found ${adminCaregivers.length} admin users with caregiver profiles`)

    for (const caregiver of adminCaregivers) {
      console.log(`\n${caregiver.user.role}: ${caregiver.user.email}`)
      console.log(`  Name: ${caregiver.name}`)
      console.log(`  Has ${caregiver.clientRelationships.length} client relationships`)

      for (const rel of caregiver.clientRelationships) {
        console.log(`    - Client: ${rel.client.user.email}`)
      }
    }

    // Delete all relationships where admin is caregiver
    if (adminCaregivers.length > 0) {
      const caregiverIds = adminCaregivers.map(c => c.id)

      const deleted = await prisma.caregiverClientRelationship.deleteMany({
        where: {
          caregiverId: {
            in: caregiverIds,
          },
        },
      })

      console.log(`\n✅ Deleted ${deleted.count} admin-client relationships`)
    }
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminCaregivers()
