const nodemailer = require('nodemailer')
require('dotenv').config()

async function testEmail() {
  try {
    console.log('🔧 Testing SMTP Configuration...')
    console.log(`Host: ${process.env.SMTP_HOST}`)
    console.log(`Port: ${process.env.SMTP_PORT}`)
    console.log(`User: ${process.env.SMTP_USER}`)
    console.log(`From: ${process.env.SMTP_FROM}`)
    console.log('')

    // Prompt for recipient email
    const recipientEmail = process.argv[2]

    if (!recipientEmail) {
      console.error('❌ Please provide a recipient email address')
      console.log('Usage: node scripts/test-email.js <recipient-email>')
      process.exit(1)
    }

    console.log(`📧 Sending test email to: ${recipientEmail}`)
    console.log('')

    const testEmailHtml = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Test Email</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                      SMTP Configuratie Test
                    </h2>
                    <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Dit is een test email van het Zorgdossier systeem.
                    </p>
                    <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.6;">
                        <strong>✓ Succes!</strong> Als u deze email ontvangt, werkt de SMTP configuratie correct.
                      </p>
                    </div>
                    <div style="background-color: #F3F4F6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>SMTP Host:</strong></p>
                      <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">${process.env.SMTP_HOST}</p>
                      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Van:</strong></p>
                      <p style="margin: 0; color: #1f2937; font-size: 16px;">${process.env.SMTP_FROM}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                      © 2025 Zorgdossier. Alle rechten voorbehouden.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // Use SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Send email
    await transporter.sendMail({
      from: `"Zorgdossier" <${process.env.SMTP_FROM}>`,
      to: recipientEmail,
      subject: 'Zorgdossier - SMTP Test Email',
      html: testEmailHtml,
    })

    console.log('✅ Test email sent successfully!')
    console.log(`📬 Check the inbox of ${recipientEmail}`)
  } catch (error) {
    console.error('❌ Failed to send test email:', error)
    process.exit(1)
  }
}

testEmail()
