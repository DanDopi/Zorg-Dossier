"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Invitation {
  id: string
  status: string
  createdAt: string
  client: {
    name: string
    user: {
      email: string
    }
  }
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchInvitations()
  }, [])

  async function fetchInvitations() {
    try {
      const response = await fetch("/api/invitations")

      if (!response.ok) {
        throw new Error("Kon uitnodigingen niet laden")
      }

      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResponse(invitationId: string, accept: boolean) {
    setRespondingTo(invitationId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          accept,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon niet reageren op uitnodiging")
      }

      // Show success message
      setSuccess(accept
        ? "✅ Uitnodiging geaccepteerd! U bent nu toegevoegd aan het team."
        : "Uitnodiging geweigerd"
      )

      // Refresh invitations list
      await fetchInvitations()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setRespondingTo(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Uitnodigingen laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Zorgdossier
            </h1>
            <Link href="/dashboard">
              <Button variant="outline">← Terug naar Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Mijn Uitnodigingen</CardTitle>
            <CardDescription>
              Bekijk en reageer op uitnodigingen van cliënten
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm mb-4">
                {success}
              </div>
            )}

            {invitations.filter(inv => inv.status === "PENDING").length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>Geen openstaande uitnodigingen</p>
                <p className="text-sm mt-2">Nieuwe uitnodigingen verschijnen hier</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">
                  {invitations.filter(inv => inv.status === "PENDING").length} {invitations.filter(inv => inv.status === "PENDING").length === 1 ? "uitnodiging" : "uitnodigingen"}
                </h3>

                {invitations.filter(inv => inv.status === "PENDING").map((invitation) => (
                  <Card key={invitation.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{invitation.client.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            📧 {invitation.client.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            📅 Verzonden op: {new Date(invitation.createdAt).toLocaleDateString('nl-NL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <Button
                            onClick={() => handleResponse(invitation.id, true)}
                            disabled={respondingTo === invitation.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {respondingTo === invitation.id ? "Accepteren..." : "Accepteren"}
                          </Button>
                          <Button
                            onClick={() => handleResponse(invitation.id, false)}
                            disabled={respondingTo === invitation.id}
                            variant="outline"
                          >
                            {respondingTo === invitation.id ? "Afwijzen..." : "Afwijzen"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
