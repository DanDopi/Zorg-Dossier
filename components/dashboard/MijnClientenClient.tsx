"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard/DashboardLayout"

interface MijnClientenClientProps {
  user: any
}

export default function MijnClientenClient({ user }: MijnClientenClientProps) {
  const [clients, setClients] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch clients
      const clientsResponse = await fetch("/api/my-clients")
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData.clients || [])
      }

      // Fetch invitations - handle gracefully if endpoint doesn't exist or fails
      try {
        const invitationsResponse = await fetch("/api/invitations")
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json()
          setInvitations(invitationsData.invitations || [])
        } else {
          // If invitations endpoint fails, just set empty array
          setInvitations([])
        }
      } catch (invError) {
        // Silently fail for invitations - not critical for this page
        console.warn("Could not fetch invitations:", invError)
        setInvitations([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleInvitation(invitationId: string, action: "accept" | "decline") {
    setProcessingId(invitationId)
    setError(null)

    try {
      const response = await fetch("/api/invitations/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
          accept: action === "accept",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Kon uitnodiging niet ${action === "accept" ? "accepteren" : "afwijzen"}`)
      }

      // Refresh data
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  // Filter clients based on search query
  const filteredClients = clients.filter((relationship) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    const client = relationship.client

    return (
      client.name?.toLowerCase().includes(query) ||
      client.user.email?.toLowerCase().includes(query) ||
      client.phoneNumber?.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query)
    )
  })

  const activeClients = filteredClients.filter(c => c.status === "ACTIVE")
  const inactiveClients = filteredClients.filter(c => c.status === "INACTIVE")
  const pendingInvitations = invitations.filter(inv => inv.status === "PENDING")

  return (
    <DashboardLayout
      userName={user.caregiverProfile?.name || user.email}
      userRole={user.role}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Mijn Cliënten
            {pendingInvitations.length > 0 && (
              <span className="ml-3 text-sm bg-red-100 text-red-600 px-3 py-1 rounded-full">
                {pendingInvitations.length} uitnodiging{pendingInvitations.length > 1 ? 'en' : ''}
              </span>
            )}
          </h2>
          <p className="text-muted-foreground mt-1">
            {pendingInvitations.length > 0
              ? "Nieuwe uitnodigingen beschikbaar"
              : "Beheer en bekijk al uw cliënten"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Nieuwe Uitnodigingen
              </CardTitle>
              <CardDescription>
                U heeft {pendingInvitations.length} nieuwe uitnodiging{pendingInvitations.length > 1 ? 'en' : ''} van cliënten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <Card key={invitation.id} className="border-l-4 border-l-orange-500 bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{invitation.client.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            📧 {invitation.client.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📞 {invitation.client.phoneNumber}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {invitation.client.address}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Uitnodiging verzonden: {new Date(invitation.createdAt).toLocaleDateString('nl-NL')}
                          </p>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleInvitation(invitation.id, "accept")}
                            disabled={processingId === invitation.id}
                            className="w-full"
                          >
                            {processingId === invitation.id ? "Verwerken..." : "Accepteren"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInvitation(invitation.id, "decline")}
                            disabled={processingId === invitation.id}
                            className="w-full"
                          >
                            Afwijzen
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

        {/* Quick Actions */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <CardTitle>Mijn Cliënten</CardTitle>
            <CardDescription>Bekijk en beheer al uw actieve en inactieve cliënten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{activeClients.length}</p>
                <p className="text-sm text-muted-foreground">Actief</p>
              </div>
              {inactiveClients.length > 0 && (
                <div>
                  <p className="text-2xl font-bold text-gray-400">{inactiveClients.length}</p>
                  <p className="text-sm text-muted-foreground">Inactief</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Zoek op naam, email, telefoon of adres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Actieve Cliënten
              {searchQuery && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({activeClients.length} resultaten)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Cliënten waarvoor u momenteel zorg verleent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : activeClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Nog geen actieve cliënten</p>
                <p className="text-sm mt-2">Wacht op uitnodigingen van cliënten</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeClients.map((relationship) => (
                  <Card key={relationship.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{relationship.client.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            📧 {relationship.client.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📞 {relationship.client.phoneNumber}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {relationship.client.address}
                          </p>
                          {relationship.client.emergencyContact && (
                            <p className="text-sm text-orange-600 mt-2">
                              🚨 Noodcontact: {relationship.client.emergencyContact}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Relatie vanaf: {new Date(relationship.createdAt).toLocaleDateString('nl-NL')}
                          </p>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <Link href={`/dashboard/reports/new?client=${relationship.clientId}`}>
                            <Button size="sm" className="w-full">
                              Nieuw Rapport
                            </Button>
                          </Link>
                          <Link href={`/dashboard/reports?client=${relationship.clientId}`}>
                            <Button size="sm" variant="outline" className="w-full">
                              Bekijk Rapporten
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Clients */}
        {inactiveClients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inactieve Cliënten</CardTitle>
              <CardDescription>
                Cliënten waarvoor u niet meer actief zorg verleent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactiveClients.map((relationship) => (
                  <Card key={relationship.id} className="border-l-4 border-l-gray-400 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{relationship.client.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            📧 {relationship.client.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📞 {relationship.client.phoneNumber}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Relatie beëindigd: {relationship.deactivatedAt ? new Date(relationship.deactivatedAt).toLocaleDateString('nl-NL') : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
