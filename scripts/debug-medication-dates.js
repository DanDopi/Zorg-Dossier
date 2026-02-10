const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n=== Checking Medication Start Dates ===\n')

  const medications = await prisma.medication.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      times: true,
      client: {
        select: {
          name: true
        }
      }
    }
  })

  medications.forEach(med => {
    console.log(`Medication: ${med.name}`)
    console.log(`  Client: ${med.client.name}`)
    console.log(`  Start Date (raw): ${med.startDate}`)
    console.log(`  Start Date (ISO): ${med.startDate?.toISOString()}`)
    console.log(`  Start Date (local): ${med.startDate?.toLocaleDateString('nl-NL')}`)

    // Create local date from components
    if (med.startDate) {
      const localDate = new Date(
        med.startDate.getFullYear(),
        med.startDate.getMonth(),
        med.startDate.getDate()
      )
      console.log(`  Start Date (local components): ${localDate.toLocaleDateString('nl-NL')}`)
      console.log(`  Start Date (local ISO): ${localDate.toISOString().split('T')[0]}`)
    }

    console.log(`  End Date: ${med.endDate?.toLocaleDateString('nl-NL') || 'None'}`)
    console.log(`  Times: ${med.times}`)
    console.log('')
  })

  console.log('\n=== Current Date Info ===')
  const now = new Date()
  console.log(`Now (raw): ${now}`)
  console.log(`Now (ISO): ${now.toISOString()}`)
  console.log(`Today at midnight: ${new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
