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

// Time-off request email template (for clients)
export function getTimeOffRequestEmailHtml(
  clientName: string,
  caregiverName: string,
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION",
  startDate: Date,
  endDate: Date,
  reason?: string,
  isEmergency?: boolean,
  affectedShiftCount?: number
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const dashboardUrl = `${baseUrl}/dashboard/mijn-rooster?tab=time-off`

  const requestTypeLabels = {
    DAY_OFF: "Vrije dag",
    SICK_LEAVE: "Ziekmelding",
    VACATION: "Vakantie",
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isEmergency ? "URGENT: Ziekmelding" : "Nieuwe Verlofaanvraag"}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">${isEmergency ? "⚠️ URGENT" : "Nieuwe Melding"}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                    ${isEmergency ? "URGENT: Ziekmelding" : "Nieuwe Verlofaanvraag"}
                  </h2>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Beste ${clientName},
                  </p>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    <strong>${caregiverName}</strong> heeft een ${
    isEmergency ? "spoedeisende " : ""
  }${requestTypeLabels[requestType].toLowerCase()} aangevraagd.
                  </p>

                  ${
                    isEmergency
                      ? `
                  <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Urgent:</strong> Dit is een spoedeisende ziekmelding. De aanvraag is automatisch goedgekeurd${
                        affectedShiftCount && affectedShiftCount > 0
                          ? ` en ${affectedShiftCount} dienst${affectedShiftCount === 1 ? "" : "en"} ${
                              affectedShiftCount === 1 ? "is" : "zijn"
                            } leeggemaakt`
                          : ""
                      }.
                    </p>
                  </div>
                  `
                      : ""
                  }

                  <div style="background-color: #F3F4F6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">${requestTypeLabels[requestType]}</p>

                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Periode:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                      ${formatDate(startDate)} - ${formatDate(endDate)}
                    </p>

                    ${
                      reason
                        ? `
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Reden:</strong></p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">${reason}</p>
                    `
                        : ""
                    }
                  </div>

                  ${
                    !isEmergency
                      ? `
                  <p style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Klik op de knop hieronder om de aanvraag te bekijken en goed te keuren of af te wijzen.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Bekijk Aanvraag
                        </a>
                      </td>
                    </tr>
                  </table>
                  `
                      : `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #EF4444; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Bekijk Rooster
                        </a>
                      </td>
                    </tr>
                  </table>
                  `
                  }
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

// Time-off approved email template (for caregivers)
export function getTimeOffApprovedEmailHtml(
  caregiverName: string,
  clientName: string,
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION",
  startDate: Date,
  endDate: Date,
  reviewNotes?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const dashboardUrl = `${baseUrl}/dashboard/mijn-rooster`

  const requestTypeLabels = {
    DAY_OFF: "Vrije dag",
    SICK_LEAVE: "Ziekmelding",
    VACATION: "Vakantie",
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verlofaanvraag Goedgekeurd</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10B981 0%, #3B82F6 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">✓ Goedgekeurd</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                    Verlofaanvraag Goedgekeurd
                  </h2>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Beste ${caregiverName},
                  </p>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Goed nieuws! <strong>${clientName}</strong> heeft uw ${requestTypeLabels[requestType].toLowerCase()} aanvraag goedgekeurd.
                  </p>

                  <div style="background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #065F46; font-size: 14px; line-height: 1.6;">
                      <strong>✓ Status:</strong> Goedgekeurd
                    </p>
                  </div>

                  <div style="background-color: #F3F4F6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">${requestTypeLabels[requestType]}</p>

                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Periode:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                      ${formatDate(startDate)} - ${formatDate(endDate)}
                    </p>

                    ${
                      reviewNotes
                        ? `
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Opmerking van ${clientName}:</strong></p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">${reviewNotes}</p>
                    `
                        : ""
                    }
                  </div>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Bekijk Mijn Rooster
                        </a>
                      </td>
                    </tr>
                  </table>
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

// Time-off denied email template (for caregivers)
export function getTimeOffDeniedEmailHtml(
  caregiverName: string,
  clientName: string,
  requestType: "DAY_OFF" | "SICK_LEAVE" | "VACATION",
  startDate: Date,
  endDate: Date,
  reviewNotes?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const dashboardUrl = `${baseUrl}/dashboard/mijn-rooster`

  const requestTypeLabels = {
    DAY_OFF: "Vrije dag",
    SICK_LEAVE: "Ziekmelding",
    VACATION: "Vakantie",
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verlofaanvraag Afgewezen</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Zorgdossier</h1>
                  <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Beslissing over Aanvraag</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">
                    Verlofaanvraag Afgewezen
                  </h2>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Beste ${caregiverName},
                  </p>

                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Helaas heeft <strong>${clientName}</strong> uw ${requestTypeLabels[requestType].toLowerCase()} aanvraag afgewezen.
                  </p>

                  <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
                      <strong>✗ Status:</strong> Afgewezen
                    </p>
                  </div>

                  <div style="background-color: #F3F4F6; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Type:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">${requestTypeLabels[requestType]}</p>

                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Periode:</strong></p>
                    <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                      ${formatDate(startDate)} - ${formatDate(endDate)}
                    </p>

                    ${
                      reviewNotes
                        ? `
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;"><strong>Reden van afwijzing:</strong></p>
                    <p style="margin: 0; color: #1f2937; font-size: 16px;">${reviewNotes}</p>
                    `
                        : ""
                    }
                  </div>

                  <p style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    ${
                      reviewNotes
                        ? "Neem contact op met de cliënt voor meer informatie of om een alternatieve periode te bespreken."
                        : "Neem contact op met de cliënt voor meer informatie."
                    }
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #6B7280; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Bekijk Mijn Rooster
                        </a>
                      </td>
                    </tr>
                  </table>
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