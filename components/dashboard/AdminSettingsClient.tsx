"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface User {
  id: string
  email: string
  role: string
}

interface AdminSettingsClientProps {
  user: User
}

export default function AdminSettingsClient({ user }: AdminSettingsClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // System settings state
  const [systemName, setSystemName] = useState("DaNiKo Zorgdossier")
  const [maxFileSize, setMaxFileSize] = useState("5")
  const [sessionTimeout, setSessionTimeout] = useState("30")
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Email settings state
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")

  // Security settings state
  const [requireEmailVerification, setRequireEmailVerification] = useState(false)
  const [passwordMinLength, setPasswordMinLength] = useState("8")
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Privacy settings state
  const [dataRetentionDays, setDataRetentionDays] = useState("365")
  const [allowDataExport, setAllowDataExport] = useState(true)
  const [logRetentionDays, setLogRetentionDays] = useState("90")

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings")
      if (response.ok) {
        const data = await response.json()

        // General settings
        if (data.systemName) setSystemName(data.systemName)
        if (data.maxFileSize) setMaxFileSize(data.maxFileSize)
        if (data.sessionTimeout) setSessionTimeout(data.sessionTimeout)
        if (data.maintenanceMode) setMaintenanceMode(data.maintenanceMode === "true")

        // Email settings
        if (data.emailEnabled) setEmailEnabled(data.emailEnabled === "true")
        if (data.smtpHost) setSmtpHost(data.smtpHost)
        if (data.smtpPort) setSmtpPort(data.smtpPort)
        if (data.smtpUser) setSmtpUser(data.smtpUser)

        // Security settings
        if (data.requireEmailVerification) setRequireEmailVerification(data.requireEmailVerification === "true")
        if (data.passwordMinLength) setPasswordMinLength(data.passwordMinLength)
        if (data.maxLoginAttempts) setMaxLoginAttempts(data.maxLoginAttempts)
        if (data.twoFactorEnabled) setTwoFactorEnabled(data.twoFactorEnabled === "true")

        // Privacy settings
        if (data.dataRetentionDays) setDataRetentionDays(data.dataRetentionDays)
        if (data.allowDataExport) setAllowDataExport(data.allowDataExport === "true")
        if (data.logRetentionDays) setLogRetentionDays(data.logRetentionDays)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async (section: string, category: string, settings: Record<string, any>) => {
    setIsSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          settings,
        }),
      })

      if (response.ok) {
        setSuccessMessage(`${section} instellingen opgeslagen`)
        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        const data = await response.json()
        setErrorMessage(data.error || "Er is een fout opgetreden")
        setTimeout(() => setErrorMessage(""), 5000)
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setErrorMessage("Er is een fout opgetreden bij het opslaan")
      setTimeout(() => setErrorMessage(""), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveGeneral = () => {
    handleSaveSettings("Algemene", "general", {
      systemName,
      maxFileSize,
      sessionTimeout,
      maintenanceMode: String(maintenanceMode),
    })
  }

  const handleSaveEmail = () => {
    handleSaveSettings("E-mail", "email", {
      emailEnabled: String(emailEnabled),
      smtpHost,
      smtpPort,
      smtpUser,
    })
  }

  const handleSaveSecurity = () => {
    handleSaveSettings("Beveiliging", "security", {
      requireEmailVerification: String(requireEmailVerification),
      passwordMinLength,
      maxLoginAttempts,
      twoFactorEnabled: String(twoFactorEnabled),
    })
  }

  const handleSavePrivacy = () => {
    handleSaveSettings("Privacy & Data", "privacy", {
      dataRetentionDays,
      allowDataExport: String(allowDataExport),
      logRetentionDays,
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Systeeminstellingen</h1>
          <p className="text-muted-foreground mt-1">
            Beheer systeemconfiguratie en instellingen
          </p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* General System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Algemene Systeeminstellingen</CardTitle>
            <CardDescription>
              Configureer basis systeeminstellingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">Systeemnaam</Label>
                <Input
                  id="systemName"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="DaNiKo Zorgdossier"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Max bestandsgrootte (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={maxFileSize}
                    onChange={(e) => setMaxFileSize(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Sessie timeout (minuten)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenanceMode">Onderhoudsmodus</Label>
                  <p className="text-sm text-muted-foreground">
                    Schakel het systeem tijdelijk uit voor onderhoud
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveGeneral}
                disabled={isSaving}
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle>E-mail Instellingen</CardTitle>
            <CardDescription>
              Configureer e-mail notificaties en SMTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailEnabled">E-mail notificaties</Label>
                  <p className="text-sm text-muted-foreground">
                    Schakel e-mail notificaties in of uit
                  </p>
                </div>
                <Switch
                  id="emailEnabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>

              {emailEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Server</Label>
                    <Input
                      id="smtpHost"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP Poort</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtpUser">SMTP Gebruikersnaam</Label>
                      <Input
                        id="smtpUser"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveEmail}
                disabled={isSaving}
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Beveiligingsinstellingen</CardTitle>
            <CardDescription>
              Configureer beveiligings- en authenticatie-instellingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireEmailVerification">E-mail verificatie vereist</Label>
                  <p className="text-sm text-muted-foreground">
                    Vereis e-mailverificatie voor nieuwe gebruikers
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="twoFactorEnabled">Twee-factor authenticatie</Label>
                  <p className="text-sm text-muted-foreground">
                    Schakel 2FA in voor alle gebruikers
                  </p>
                </div>
                <Switch
                  id="twoFactorEnabled"
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">Min. wachtwoordlengte</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={passwordMinLength}
                    onChange={(e) => setPasswordMinLength(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max. inlogpogingen</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSaveSecurity}
                disabled={isSaving}
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Data Instellingen</CardTitle>
            <CardDescription>
              Configureer gegevensbeheer en privacy-instellingen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowDataExport">Data export toestaan</Label>
                  <p className="text-sm text-muted-foreground">
                    Sta gebruikers toe hun gegevens te exporteren
                  </p>
                </div>
                <Switch
                  id="allowDataExport"
                  checked={allowDataExport}
                  onCheckedChange={setAllowDataExport}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataRetentionDays">Data bewaarperiode (dagen)</Label>
                  <Input
                    id="dataRetentionDays"
                    type="number"
                    value={dataRetentionDays}
                    onChange={(e) => setDataRetentionDays(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logRetentionDays">Log bewaarperiode (dagen)</Label>
                  <Input
                    id="logRetentionDays"
                    type="number"
                    value={logRetentionDays}
                    onChange={(e) => setLogRetentionDays(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSavePrivacy}
                disabled={isSaving}
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>Systeeminformatie</CardTitle>
            <CardDescription>
              Algemene informatie over het systeem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Versie</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Database</span>
                <span className="font-medium">PostgreSQL</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Omgeving</span>
                <span className="font-medium">Development</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Laatste update</span>
                <span className="font-medium">{new Date().toLocaleDateString('nl-NL')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Management - SUPER_ADMIN Only */}
        {user.role === "SUPER_ADMIN" && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
                Database Beheer
              </CardTitle>
              <CardDescription>
                Direct toegang tot de database via Prisma Studio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Waarschuwing</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Prisma Studio geeft directe toegang tot de database. Gebruik dit alleen als je weet wat je doet.
                      Wijzigingen in de database kunnen de applicatie verstoren.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Wat is Prisma Studio?</h4>
                  <p className="text-sm text-muted-foreground">
                    Prisma Studio is een visuele database browser waarmee je:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                    <li>Alle tabellen en records kunt bekijken</li>
                    <li>Data kunt bewerken, toevoegen en verwijderen</li>
                    <li>Relaties tussen tabellen kunt zien</li>
                    <li>Snel data kunt zoeken en filteren</li>
                  </ul>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Prisma Studio Status</p>
                      <p className="text-sm text-muted-foreground">
                        Draait op: <code className="bg-gray-100 px-2 py-1 rounded text-xs">http://localhost:5556</code>
                      </p>
                    </div>
                    <a
                      href="http://localhost:5556"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Button>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        Open Prisma Studio
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded border">
                  <p className="font-medium mb-1">💡 Tip: Prisma Studio starten</p>
                  <p>Als Prisma Studio niet draait, start het met het commando:</p>
                  <code className="block bg-gray-900 text-gray-100 p-2 rounded mt-2">npx prisma studio</code>
                </div>

                <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-medium mb-1">⚠️ Productie Waarschuwing</p>
                  <p>
                    Deze functie moet UITGESCHAKELD zijn in productie omgevingen. Database toegang moet alleen
                    beschikbaar zijn voor ontwikkelaars in development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
