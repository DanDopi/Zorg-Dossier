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
  const [maxFileSize, setMaxFileSize] = useState("5")
  const [sessionTimeout, setSessionTimeout] = useState("30")

  // Email settings state
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")

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
        if (data.maxFileSize) setMaxFileSize(data.maxFileSize)
        if (data.sessionTimeout) setSessionTimeout(data.sessionTimeout)

        // Email settings
        if (data.emailEnabled) setEmailEnabled(data.emailEnabled === "true")
        if (data.smtpHost) setSmtpHost(data.smtpHost)
        if (data.smtpPort) setSmtpPort(data.smtpPort)
        if (data.smtpUser) setSmtpUser(data.smtpUser)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async (section: string, category: string, settings: Record<string, string>) => {
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
      maxFileSize,
      sessionTimeout,
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Max bestandsgrootte (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={maxFileSize}
                    onChange={(e) => setMaxFileSize(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deze limiet geldt voor alle bestandsuploads in het systeem
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Sessie timeout (minuten)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gebruikers worden uitgelogd na deze periode van inactiviteit
                  </p>
                </div>
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
      </div>
    </div>
  )
}
