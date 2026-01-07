const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function syncEmailSettings() {
  try {
    console.log('Synchronizing email settings from .env to database...')

    const settings = [
      {
        key: 'emailEnabled',
        value: 'true',
        category: 'email',
      },
      {
        key: 'smtpHost',
        value: process.env.SMTP_HOST || '',
        category: 'email',
      },
      {
        key: 'smtpPort',
        value: process.env.SMTP_PORT || '465',
        category: 'email',
      },
      {
        key: 'smtpUser',
        value: process.env.SMTP_USER || '',
        category: 'email',
      },
    ]

    for (const setting of settings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        create: setting,
        update: {
          value: setting.value,
          category: setting.category,
        },
      })
      console.log(`✓ Synced ${setting.key}: ${setting.value}`)
    }

    console.log('\nEmail settings synchronized successfully!')
    console.log('\nNote: SMTP password is kept in .env for security and is not stored in the database.')
  } catch (error) {
    console.error('Error syncing email settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncEmailSettings()
