const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...\n')

    // Get counts before deletion
    const caregiverCount = await prisma.caregiverProfile.count()
    const clientCount = await prisma.clientProfile.count()
    const userCount = await prisma.user.count({ where: { role: { in: ['CAREGIVER', 'CLIENT'] } } })

    console.log('Current database state:')
    console.log(`  - Caregivers: ${caregiverCount}`)
    console.log(`  - Clients: ${clientCount}`)
    console.log(`  - Users (non-admin): ${userCount}`)
    console.log('')

    // Delete all caregiver-related data
    console.log('Deleting caregiver-related data...')

    // Delete time-off requests (these have caregiverId and clientId)
    const deletedTimeOff = await prisma.timeOffRequest.deleteMany({})
    console.log(`  ✓ Deleted ${deletedTimeOff.count} time-off requests`)

    // Delete shifts
    const deletedShifts = await prisma.shift.deleteMany({})
    console.log(`  ✓ Deleted ${deletedShifts.count} shifts`)

    // Delete caregiver-client relationships
    const deletedRelationships = await prisma.caregiverClientRelationship.deleteMany({})
    console.log(`  ✓ Deleted ${deletedRelationships.count} caregiver-client relationships`)

    // Delete invitations
    const deletedInvitations = await prisma.caregiverInvitation.deleteMany({})
    console.log(`  ✓ Deleted ${deletedInvitations.count} invitations`)

    // Delete reports
    const deletedReports = await prisma.careReport.deleteMany({})
    console.log(`  ✓ Deleted ${deletedReports.count} care reports`)

    // Delete medication records
    const deletedMedication = await prisma.medicationAdministration.deleteMany({})
    console.log(`  ✓ Deleted ${deletedMedication.count} medication administrations`)

    const deletedMedications = await prisma.medication.deleteMany({})
    console.log(`  ✓ Deleted ${deletedMedications.count} medications`)

    // Delete nutrition records
    const deletedMeals = await prisma.mealRecord.deleteMany({})
    console.log(`  ✓ Deleted ${deletedMeals.count} meal records`)

    const deletedTubeFeedingAdministrations = await prisma.tubeFeedingAdministration.deleteMany({})
    console.log(`  ✓ Deleted ${deletedTubeFeedingAdministrations.count} tube feeding administrations`)

    const deletedTubeFeedingSchedules = await prisma.tubeFeedingSchedule.deleteMany({})
    console.log(`  ✓ Deleted ${deletedTubeFeedingSchedules.count} tube feeding schedules`)

    const deletedFluidIntakes = await prisma.fluidIntakeRecord.deleteMany({})
    console.log(`  ✓ Deleted ${deletedFluidIntakes.count} fluid intake records`)

    // Delete I/O records
    const deletedDefecation = await prisma.defecationRecord.deleteMany({})
    console.log(`  ✓ Deleted ${deletedDefecation.count} defecation records`)

    const deletedUrine = await prisma.urineRecord.deleteMany({})
    console.log(`  ✓ Deleted ${deletedUrine.count} urine records`)

    // Delete wound care records
    const deletedWoundCareReports = await prisma.woundCareReport.deleteMany({})
    console.log(`  ✓ Deleted ${deletedWoundCareReports.count} wound care reports`)

    const deletedWoundCarePlans = await prisma.woundCarePlan.deleteMany({})
    console.log(`  ✓ Deleted ${deletedWoundCarePlans.count} wound care plans`)

    console.log('')
    console.log('Deleting user profiles...')

    // Delete caregiver profiles (this will cascade to users via onDelete: Cascade)
    const deletedCaregivers = await prisma.caregiverProfile.deleteMany({})
    console.log(`  ✓ Deleted ${deletedCaregivers.count} caregiver profiles`)

    // Delete client profiles (this will cascade to users via onDelete: Cascade)
    const deletedClients = await prisma.clientProfile.deleteMany({})
    console.log(`  ✓ Deleted ${deletedClients.count} client profiles`)

    // Clean up any orphaned users (CAREGIVER or CLIENT role without profiles)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: {
          in: ['CAREGIVER', 'CLIENT']
        }
      }
    })
    console.log(`  ✓ Deleted ${deletedUsers.count} user accounts`)

    // Delete verification tokens for deleted users
    const deletedTokens = await prisma.verificationToken.deleteMany({
      where: {
        user: {
          role: {
            in: ['CAREGIVER', 'CLIENT']
          }
        }
      }
    })
    console.log(`  ✓ Deleted ${deletedTokens.count} verification tokens`)

    console.log('')
    console.log('✅ Database cleanup completed successfully!')
    console.log('')
    console.log('Remaining users:')

    const remainingUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true
      }
    })

    remainingUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`)
    })

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDatabase()
