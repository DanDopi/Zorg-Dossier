"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface SearchResult {
  id: string
  name: string
  phoneNumber: string
  address: string
  bio?: string | null
  alreadyInvited?: boolean
  alreadyInTeam?: boolean
  user: {
    email: string
  }
}

interface Invitation {
  id: string
  status: string
  invitedEmail?: string
  createdAt?: string
  respondedAt?: string
  caregiver?: {
    name: string
    user: {
      email: string
    }
  }
}

export default function InviteCaregiverPage() {
  const [tab, setTab] = useState<"search" | "email">("search") // Search existing or invite by email
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Email invitation fields
  const [emailToInvite, setEmailToInvite] = useState("")
  const [isInvitingByEmail, setIsInvitingByEmail] = useState(false)

  // Invitations management
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [managingInvitationId, setManagingInvitationId] = useState<string | null>(null)

  useEffect(() => {
    fetchInvitations()
  }, [])

  async function fetchInvitations() {
    try {
      const response = await fetch("/api/team")
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error)
    }
  }

  async function handleManageInvitation(invitationId: string, action: "resend" | "delete") {
    setManagingInvitationId(invitationId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/invitations/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId,
          action,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kon actie niet uitvoeren")
      }

      const data = await response.json()
      setSuccess(data.message)

      // Refresh invitations
      await fetchInvitations()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setManagingInvitationId(null)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    if (!searchQuery.trim()) {
      setError("Voer een zoekterm in")
      return
    }

    setIsSearching(true)
    setError(null)
    setHasSearched(false)

    try {
      const response = await fetch(`/api/caregivers/search?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error("Kon zorgverleners niet zoeken")
      }

      const data = await response.json()
      setSearchResults(data.caregivers || [])
      setHasSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSearching(false)
    }
  }

  async function handleInvite(caregiverId: string, caregiverEmail: string) {
    setInvitingId(caregiverId)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiverId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kon uitnodiging niet verzenden")
      }

      setSuccess(`Uitnodiging verzonden naar ${caregiverEmail}!`)

      // Remove invited caregiver from results
      setSearchResults(prev => prev.filter(c => c.id !== caregiverId))

      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setInvitingId(null)
    }
  }

  async function handleInviteByEmail(e: React.FormEvent) {
    e.preventDefault()

    if (!emailToInvite.trim() || !emailToInvite.includes("@")) {
      setError("Voer een geldig email adres in")
      return
    }

    setIsInvitingByEmail(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToInvite }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kon uitnodiging niet verzenden")
      }

      setSuccess(`Uitnodiging verzonden naar ${emailToInvite}! Ze ontvangen een email met instructies om zich te registreren.`)
      setEmailToInvite("")

      setTimeout(() => setSuccess(null), 7000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsInvitingByEmail(false)
    }
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
            <CardTitle className="text-2xl">Zorgverlener Uitnodigen</CardTitle>
            <CardDescription>
              Zoek naar bestaande zorgverleners of nodig iemand uit per email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => setTab("search")}
                className={`px-4 py-2 font-medium transition-colors ${
                  tab === "search"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Zoek Bestaande Zorgverleners
              </button>
              <button
                onClick={() => setTab("email")}
                className={`px-4 py-2 font-medium transition-colors ${
                  tab === "email"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Uitnodigen per Email
              </button>
            </div>
          </CardContent>

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

            {/* Email Invitation Tab */}
            {tab === "email" && (
              <form onSubmit={handleInviteByEmail} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Adres van Zorgverlener</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    Nodig iemand uit die nog geen account heeft. Ze ontvangen een email met instructies om zich te registreren.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@voorbeeld.nl"
                      value={emailToInvite}
                      onChange={(e) => setEmailToInvite(e.target.value)}
                      disabled={isInvitingByEmail}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isInvitingByEmail}>
                      {isInvitingByEmail ? "Verzenden..." : "Verstuur Uitnodiging"}
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-semibold mb-1">ℹ️ Hoe werkt het?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Voer het email adres in van de zorgverlener die u wilt uitnodigen</li>
                    <li>Ze ontvangen een email met een link om zich te registreren</li>
                    <li>Na registratie kunnen ze uw uitnodiging accepteren</li>
                    <li>U ziet ze daarna in uw team</li>
                  </ul>
                </div>
              </form>
            )}

            {/* Search Tab */}
            {tab === "search" && (
              <>
                {/* Search Form */}
                <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div>
                <Label htmlFor="search">Zoek op naam, email of locatie</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="search"
                    type="text"
                    placeholder="Bijv. Maria, amsterdam, email@voorbeeld.nl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isSearching}
                  />
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? "Zoeken..." : "Zoeken"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">
                  {searchResults.length} {searchResults.length === 1 ? "resultaat" : "resultaten"} gevonden
                </h3>

                {searchResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>Geen zorgverleners gevonden</p>
                    <p className="text-sm mt-2">Probeer een andere zoekterm</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((caregiver) => (
                      <Card key={caregiver.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{caregiver.name}</h4>
                              <p className="text-sm text-muted-foreground">{caregiver.user.email}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                📍 {caregiver.address}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                📞 {caregiver.phoneNumber}
                              </p>
                              {caregiver.bio && (
                                <p className="text-sm mt-2 text-gray-700">
                                  {caregiver.bio}
                                </p>
                              )}
                            </div>
                            <div className="ml-4">
                              {caregiver.alreadyInvited ? (
                                <Button variant="outline" disabled>
                                  Uitnodiging Verzonden
                                </Button>
                              ) : caregiver.alreadyInTeam ? (
                                <Button variant="outline" disabled>
                                  Al in Team
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleInvite(caregiver.id, caregiver.user.email)}
                                  disabled={invitingId === caregiver.id}
                                >
                                  {invitingId === caregiver.id ? "Uitnodigen..." : "Uitnodigen"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!hasSearched && (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Zoek naar zorgverleners om uit te nodigen</p>
                <p className="text-sm mt-2">Gebruik de zoekbalk hierboven</p>
              </div>
            )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.filter(inv => inv.status === "PENDING").length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Openstaande Uitnodigingen</CardTitle>
              <CardDescription>
                Uitnodigingen die nog niet zijn geaccepteerd of afgewezen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.filter(inv => inv.status === "PENDING").map((invitation) => (
                  <Card key={invitation.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {invitation.caregiver ? (
                            <>
                              <h4 className="font-semibold text-lg">{invitation.caregiver.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                📧 {invitation.caregiver.user.email}
                              </p>
                            </>
                          ) : (
                            <>
                              <h4 className="font-semibold text-lg">{invitation.invitedEmail}</h4>
                              <p className="text-sm text-muted-foreground">
                                (Nog niet geregistreerd)
                              </p>
                            </>
                          )}
                          {invitation.createdAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Verzonden: {new Date(invitation.createdAt).toLocaleDateString('nl-NL')}
                            </p>
                          )}
                          <p className="text-xs text-yellow-600 font-medium mt-1">
                            ⏳ In afwachting van antwoord
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handleManageInvitation(invitation.id, "delete")}
                          disabled={managingInvitationId === invitation.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {managingInvitationId === invitation.id ? "Verwijderen..." : "Verwijderen"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Declined Invitations */}
        {invitations.filter(inv => inv.status === "DECLINED").length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Afgewezen Uitnodigingen</CardTitle>
              <CardDescription>
                Uitnodigingen die zijn afgewezen door de zorgverlener
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.filter(inv => inv.status === "DECLINED").map((invitation) => (
                  <Card key={invitation.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {invitation.caregiver ? (
                            <>
                              <h4 className="font-semibold text-lg">{invitation.caregiver.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                📧 {invitation.caregiver.user.email}
                              </p>
                            </>
                          ) : (
                            <>
                              <h4 className="font-semibold text-lg">{invitation.invitedEmail}</h4>
                            </>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Afgewezen op: {invitation.respondedAt ? new Date(invitation.respondedAt).toLocaleDateString('nl-NL') : '-'}
                          </p>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            ❌ Uitnodiging afgewezen
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleManageInvitation(invitation.id, "resend")}
                            disabled={managingInvitationId === invitation.id}
                            size="sm"
                          >
                            {managingInvitationId === invitation.id ? "Verzenden..." : "Opnieuw Uitnodigen"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleManageInvitation(invitation.id, "delete")}
                            disabled={managingInvitationId === invitation.id}
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
