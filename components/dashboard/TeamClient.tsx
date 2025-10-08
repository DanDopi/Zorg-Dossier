"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { CaregiverBadge } from "@/components/ui/CaregiverBadge"

interface CaregiverProfile {
  id: string
  name: string
  phoneNumber: string
  address: string
  bio?: string
  color?: string | null
  user: {
    email: string
  }
}

interface TeamMember {
  id: string
  caregiverId: string
  clientId: string
  status: "ACTIVE" | "INACTIVE"
  createdAt: string
  updatedAt: string
  deactivatedAt?: string | null
  caregiver: CaregiverProfile
}

interface UserWithProfile {
  id: string
  email: string
  role: string
  clientProfile?: {
    name: string
  } | null
}

interface TeamClientProps {
  user: UserWithProfile
}

export default function TeamClient({ user }: TeamClientProps) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeam()
  }, [])

  async function fetchTeam() {
    try {
      const response = await fetch("/api/team")

      if (!response.ok) {
        throw new Error("Kon team niet laden")
      }

      const data = await response.json()
      setTeam(data.team || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon gegevens niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleStatus(relationshipId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    const actionId = newStatus === "INACTIVE" ? setDeactivatingId : setActivatingId

    actionId(relationshipId)
    setError(null)

    try {
      const response = await fetch("/api/team/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kon status niet wijzigen")
      }

      // Refresh team list
      await fetchTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon gegevens niet laden')
    } finally {
      setDeactivatingId(null)
      setActivatingId(null)
    }
  }

  const activeTeam = team.filter(m => m.status === "ACTIVE")
  const inactiveTeam = team.filter(m => m.status === "INACTIVE")

  return (
    <DashboardLayout
      userName={user.clientProfile?.name || user.email}
      userRole={user.role}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Mijn Zorgverleners
          </h2>
          <p className="text-muted-foreground mt-1">
            Beheer uw team van zorgverleners
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle>Mijn Zorgverleners</CardTitle>
              <CardDescription>Bekijk en beheer al uw actieve en inactieve zorgverleners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{activeTeam.length}</p>
                  <p className="text-sm text-muted-foreground">Actief</p>
                </div>
                {inactiveTeam.length > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-gray-400">{inactiveTeam.length}</p>
                    <p className="text-sm text-muted-foreground">Inactief</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <CardTitle>Uitnodigen</CardTitle>
              <CardDescription>Nodig een nieuwe zorgverlener uit voor uw team</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/invite-caregiver">
                <Button className="w-full">Verstuur Uitnodiging</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Active Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Actieve Zorgverleners</CardTitle>
            <CardDescription>
              Zorgverleners die momenteel actief zorg verlenen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : activeTeam.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Nog geen actieve zorgverleners</p>
                <p className="text-sm mt-2">Nodig zorgverleners uit om te beginnen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTeam.map((member) => (
                  <Card key={member.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2">
                            <CaregiverBadge
                              name={member.caregiver.name}
                              color={member.caregiver.color}
                              size="lg"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            📧 {member.caregiver.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📞 {member.caregiver.phoneNumber}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {member.caregiver.address}
                          </p>
                          {member.caregiver.bio && (
                            <p className="text-sm mt-2 text-gray-700">
                              {member.caregiver.bio}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Toegevoegd: {new Date(member.createdAt).toLocaleDateString('nl-NL')}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handleToggleStatus(member.id, member.status)}
                          disabled={deactivatingId === member.id}
                        >
                          {deactivatingId === member.id ? "Deactiveren..." : "Deactiveren"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Team */}
        {inactiveTeam.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gedeactiveerde Zorgverleners</CardTitle>
              <CardDescription>
                Zorgverleners die niet meer actief zijn (rapportages blijven zichtbaar)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactiveTeam.map((member) => (
                  <Card key={member.id} className="border-l-4 border-l-gray-400 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2">
                            <CaregiverBadge
                              name={member.caregiver.name}
                              color={member.caregiver.color}
                              size="lg"
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            📧 {member.caregiver.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            📞 {member.caregiver.phoneNumber}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Gedeactiveerd: {member.deactivatedAt ? new Date(member.deactivatedAt).toLocaleDateString('nl-NL') : '-'}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => handleToggleStatus(member.id, member.status)}
                          disabled={activatingId === member.id}
                        >
                          {activatingId === member.id ? "Activeren..." : "Reactiveren"}
                        </Button>
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
