const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function seedSettings() {
  try {
    console.log('Initializing default system settings...')

    const defaults = [
      {
        key: 'maxFileSize',
        value: '5',
        category: 'general',
      },
      {
        key: 'sessionTimeout',
        value: '30',
        category: 'general',
      },
    ]

    for (const setting of defaults) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        create: setting,
        update: {}, // Don't overwrite if exists
      })
      console.log(`✓ Initialized ${setting.key}: ${setting.value}`)
    }

    console.log('\n✅ Default settings initialized successfully!')
  } catch (error) {
    console.error('❌ Error seeding settings:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedSettings()
