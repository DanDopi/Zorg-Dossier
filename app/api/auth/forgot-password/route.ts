import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is verplicht" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "Als er een account bestaat met dit email adres, ontvangt u een reset link",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Get email settings from database (with .env fallback)
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ["smtpHost", "smtpPort", "smtpUser", "emailEnabled"]
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Use database settings, fall back to .env
    const smtpHost = settingsMap.smtpHost || process.env.SMTP_HOST
    const smtpPort = settingsMap.smtpPort || process.env.SMTP_PORT || "465"
    const smtpUser = settingsMap.smtpUser || process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD // Password should only be in .env for security
    const smtpFrom = process.env.SMTP_FROM

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Wachtwoord Reset - Zorgdossier",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Wachtwoord Reset Aanvraag</h1>
            </div>
            <div class="content">
              <p>Hallo,</p>
              <p>We hebben een verzoek ontvangen om uw wachtwoord te resetten voor uw Zorgdossier account.</p>
              <p>Klik op de onderstaande knop om een nieuw wachtwoord in te stellen:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Wachtwoord</a>
              </div>
              <p>Of kopieer en plak deze link in uw browser:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Belangrijk:</strong> Deze link is 1 uur geldig. Als u geen wachtwoord reset heeft aangevraagd, kunt u deze email negeren.
              </div>
              <p>Met vriendelijke groet,<br>Het Zorgdossier Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Zorgdossier. Alle rechten voorbehouden.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({
      message: "Als er een account bestaat met dit email adres, ontvangt u een reset link",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het versturen van de reset link" },
      { status: 500 }
    )
  }
}
