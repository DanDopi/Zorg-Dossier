const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function checkAndUpdate() {
  try {
    console.log('Checking current session timeout value...')

    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'sessionTimeout' }
    })

    console.log('Current value:', setting)

    if (!setting || parseInt(setting.value) !== 30) {
      console.log('Updating to 30 minutes...')
      await prisma.systemSettings.upsert({
        where: { key: 'sessionTimeout' },
        create: {
          key: 'sessionTimeout',
          value: '30',
          category: 'general'
        },
        update: {
          value: '30',
          updatedAt: new Date()
        }
      })
      console.log('✓ Updated session timeout to 30 minutes')
    } else {
      console.log('✓ Session timeout is already set to 30 minutes')
    }

    // Verify
    const updated = await prisma.systemSettings.findUnique({
      where: { key: 'sessionTimeout' }
    })
    console.log('Verified value:', updated)

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndUpdate()
