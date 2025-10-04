import nodemailer from "nodemailer"

// Create reusable transporter
const smtpPort = parseInt(process.env.SMTP_PORT || "587")
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    })

    console.log("Email sent: %s", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

// Verification email template
export function getVerificationEmailHtml(token: string, userEmail: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verificatie</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Care Reporting Platform</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Welkom bij Zorgdossier!</h2>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Bedankt voor uw registratie. Klik op de knop hieronder om uw email adres te verifiëren en uw account te activeren.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${verificationUrl}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Verifieer Email Adres
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Of kopieer en plak deze link in uw browser:<br>
                    <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
                  </p>

                  <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Deze verificatielink is 24 uur geldig.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
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
}

// Caregiver invitation email template
export function getCaregiverInvitationEmailHtml(
  clientName: string,
  caregiverName: string,
  caregiverEmail: string,
  isRegistered: boolean,
  invitationToken: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const invitationUrl = isRegistered
    ? `${baseUrl}/login`
    : `${baseUrl}/register/caregiver?email=${encodeURIComponent(caregiverEmail)}`

  const actionText = isRegistered
    ? "Inloggen op Zorgdossier"
    : "Registreer op Zorgdossier"

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zorgverlener Uitnodiging</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10B981 0%, #FB923C 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Uitnodiging Ontvangen</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Hallo ${caregiverName},</h2>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    <strong>${clientName}</strong> heeft u uitgenodigd als zorgverlener op het Zorgdossier platform.
                  </p>

                  ${
                    !isRegistered
                      ? `
                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    U heeft nog geen account. Klik op de knop hieronder om een account aan te maken. Na registratie en verificatie kunt u inloggen en de uitnodiging accepteren in uw dashboard.
                  </p>
                  `
                      : `
                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Log in op uw account om de uitnodiging te bekijken en te accepteren. U vindt de uitnodiging in uw dashboard onder "Uitnodigingen".
                  </p>
                  `
                  }

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${invitationUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          ${actionText}
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                      <strong>📋 Wat te doen:</strong><br>
                      ${
                        !isRegistered
                          ? `1. Klik op de knop hierboven om te registreren<br>
                      2. Verifieer uw email adres<br>
                      3. Log in op uw account<br>
                      4. Ga naar uw dashboard en accepteer de uitnodiging`
                          : `1. Klik op de knop hierboven om in te loggen<br>
                      2. Ga naar uw dashboard<br>
                      3. Bekijk en accepteer de uitnodiging`
                      }
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
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
}
