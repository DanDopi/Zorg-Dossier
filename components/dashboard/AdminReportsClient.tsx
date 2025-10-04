"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminReportsClientProps {
  user: any
}

interface ReportStats {
  totalReports: number
  reportsToday: number
  reportsThisWeek: number
  reportsThisMonth: number
  averageReportsPerDay: number
  activeUsers: number
  activeCaregivers: number
  activeClients: number
  topCaregivers: Array<{
    name: string
    email: string
    reportCount: number
  }>
  topClients: Array<{
    name: string
    email: string
    reportCount: number
  }>
}

export default function AdminReportsClient({ user }: AdminReportsClientProps) {
  const [stats, setStats] = useState<ReportStats>({
    totalReports: 0,
    reportsToday: 0,
    reportsThisWeek: 0,
    reportsThisMonth: 0,
    averageReportsPerDay: 0,
    activeUsers: 0,
    activeCaregivers: 0,
    activeClients: 0,
    topCaregivers: [],
    topClients: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("AdminReportsClient mounted - fetching stats...")
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      console.log("Fetching from: /api/admin/statistieken/stats")
      const response = await fetch("/api/admin/statistieken/stats")
      console.log("Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Stats data:", data)
        setStats(data)
      } else {
        console.error("Failed to fetch stats, status:", response.status)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapportage Statistieken</h1>
          <p className="text-muted-foreground mt-1">
            Overzicht van rapportage activiteit in het systeem
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Rapporten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.totalReports}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vandaag</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.reportsToday}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deze Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.reportsThisWeek}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deze Maand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.reportsThisMonth}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. per Dag</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.averageReportsPerDay.toFixed(1)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Activity */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Gebruikers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.activeUsers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gebruikers met rapporten
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Zorgverleners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.activeCaregivers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Zorgverleners die rapporten schrijven
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Cliënten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : stats.activeClients}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cliënten met rapporten
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Meest Actieve Zorgverleners</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4 text-gray-500">Laden...</p>
              ) : stats.topCaregivers.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Geen data beschikbaar</p>
              ) : (
                <div className="space-y-3">
                  {stats.topCaregivers.map((caregiver, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {caregiver.name || caregiver.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{caregiver.reportCount}</p>
                        <p className="text-xs text-muted-foreground">rapporten</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meest Actieve Cliënten</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4 text-gray-500">Laden...</p>
              ) : stats.topClients.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Geen data beschikbaar</p>
              ) : (
                <div className="space-y-3">
                  {stats.topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {client.name || client.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{client.reportCount}</p>
                        <p className="text-xs text-muted-foreground">rapporten</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
