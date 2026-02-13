"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "./DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TimeOffNotificationPanel } from "@/components/dashboard/TimeOffNotificationPanel"
import { AlertCircle, Clock } from "lucide-react"

interface PendingCorrection {
  id: string
  date: string
  startTime: string
  endTime: string
  actualStartTime: string
  actualEndTime: string
  caregiverNote?: string | null
  timeCorrectionAt: string
  shiftType: { name: string }
  caregiver: { name: string }
}

interface Report {
  id: string
  content: string
  reportDate: string
  createdAt?: string
  images?: Array<{id: string}>
  caregiver: {
    name: string
  }
}

interface ClientDashboardProps {
  user: {
    email: string
    role: string
    clientProfile?: {
      name: string
    } | null
  }
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [timeOffNotifications, setTimeOffNotifications] = useState<any[]>([])
  const [isLoadingTimeOff, setIsLoadingTimeOff] = useState(true)
  const [pendingCorrections, setPendingCorrections] = useState<PendingCorrection[]>([])
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(true)

  useEffect(() => {
    fetchRecentReports()
    fetchTimeOffNotifications()
    fetchPendingCorrections()
  }, [])

  async function fetchRecentReports() {
    try {
      const response = await fetch("/api/reports")
      if (response.ok) {
        const data = await response.json()
        setRecentReports((data.reports || []).slice(0, 3))
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setIsLoadingReports(false)
    }
  }

  async function fetchPendingCorrections() {
    try {
      const response = await fetch("/api/scheduling/shifts/pending-corrections")
      if (response.ok) {
        const data = await response.json()
        setPendingCorrections(data)
      }
    } catch (error) {
      console.error("Failed to fetch pending corrections:", error)
    } finally {
      setIsLoadingCorrections(false)
    }
  }

  async function fetchTimeOffNotifications() {
    try {
      setIsLoadingTimeOff(true)

      // Fetch pending requests
      const pendingResponse = await fetch("/api/scheduling/time-off?status=PENDING")
      let pendingData = []
      if (pendingResponse.ok) {
        pendingData = await pendingResponse.json()
      }

      // Fetch recent approved sick leave (last 3 days for awareness)
      const sickLeaveResponse = await fetch(
        "/api/scheduling/time-off?requestType=SICK_LEAVE&status=APPROVED&recent=3"
      )
      let sickLeaveData = []
      if (sickLeaveResponse.ok) {
        sickLeaveData = await sickLeaveResponse.json()
      }

      // Deduplicate notifications by ID to prevent duplicates
      const combinedData = [...pendingData, ...sickLeaveData]
      const uniqueNotifications = Array.from(
        new Map(combinedData.map(item => [item.id, item])).values()
      )
      setTimeOffNotifications(uniqueNotifications)
    } catch (error) {
      console.error("Failed to fetch time-off notifications:", error)
    } finally {
      setIsLoadingTimeOff(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "APPROVED" }),
      })

      if (response.ok) {
        await fetchTimeOffNotifications()
        const data = await response.json()
        if (data.affectedShifts > 0) {
          alert(`Goedgekeurd. ${data.affectedShifts} dienst(en) leeggemaakt.`)
        }
      } else {
        alert("Fout bij goedkeuren")
      }
    } catch (error) {
      console.error("Failed to approve:", error)
      alert("Er is een fout opgetreden")
    }
  }

  const handleDeny = async (id: string, reviewNotes: string) => {
    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "DENIED", reviewNotes }),
      })

      if (response.ok) {
        await fetchTimeOffNotifications()
      } else {
        alert("Fout bij afwijzen")
      }
    } catch (error) {
      console.error("Failed to deny:", error)
      alert("Er is een fout opgetreden")
    }
  }

  return (
    <DashboardLayout userName={user.clientProfile?.name || user.email} userRole={user.role}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welkom terug, {user.clientProfile?.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Bekijk uw zorgrapportages en beheer uw zorgverleners
          </p>
        </div>

        {/* Time-Off Notifications */}
        <TimeOffNotificationPanel
          role="CLIENT"
          notifications={timeOffNotifications}
          onApprove={handleApprove}
          onDeny={handleDeny}
          isLoading={isLoadingTimeOff}
        />

        {/* Pending Time Corrections */}
        {!isLoadingCorrections && pendingCorrections.length > 0 && (
          <Card className="border-orange-300 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Tijdcorrecties ({pendingCorrections.length})
              </CardTitle>
              <CardDescription className="text-orange-800">
                Zorgverleners hebben afwijkende werktijden doorgegeven
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingCorrections.map((correction) => (
                <div
                  key={correction.id}
                  className="bg-white rounded-lg p-3 border border-orange-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {correction.caregiver.name}
                        </span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {correction.shiftType.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(correction.date).toLocaleDateString("nl-NL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground line-through">
                          {correction.startTime} - {correction.endTime}
                        </span>
                        <span className="font-medium text-orange-900 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {correction.actualStartTime} - {correction.actualEndTime}
                        </span>
                      </div>
                      {correction.caregiverNote && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &quot;{correction.caregiverNote}&quot;
                        </p>
                      )}
                    </div>
                    <Link href={`/dashboard/rooster?date=${correction.date}`}>
                      <Button size="sm" variant="outline" className="border-orange-400 text-orange-800 hover:bg-orange-100">
                        Bekijken
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/mijn-rooster" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <CardTitle>Mijn Rooster</CardTitle>
                <CardDescription>Bekijk zorgverlener planning</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/rapporteren" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <CardTitle>Zorgrapportages</CardTitle>
                <CardDescription>Bekijk uw zorgrapportages</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/medicatie" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <CardTitle>Medicatie</CardTitle>
                <CardDescription>Bekijk medicatie overzicht</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/voeding" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <CardTitle>Voeding</CardTitle>
                <CardDescription>Voedings- en vochtstatus</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/io-registratie" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle>I/O Registratie</CardTitle>
                <CardDescription>In- en uitvoer registratie</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/wondzorg" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <CardTitle>Wondzorgplan</CardTitle>
                <CardDescription>Wondzorg en rapportages</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/team" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <CardTitle>Mijn Zorgverleners</CardTitle>
                <CardDescription>Beheer zorgverlenende team</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/invite-caregiver" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <CardTitle>Uitnodigen</CardTitle>
                <CardDescription>Nodig zorgverlener uit</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recente Rapporten</CardTitle>
                <CardDescription>Uw laatst ontvangen zorgrapportages</CardDescription>
              </div>
              {recentReports.length > 0 && (
                <Link href="/dashboard/reports">
                  <Button variant="outline" size="sm">Bekijk Alle</Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingReports ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Nog geen rapportages beschikbaar</p>
                <p className="text-sm mt-2">Nodig een zorgverlener uit om te beginnen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{report.caregiver.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {new Date(report.reportDate).toLocaleDateString('nl-NL', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-1">
                              {report.content}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {report.images && report.images.length > 0 && (
                                <span className="flex items-center gap-1">
                                  📷 {report.images.length}
                                </span>
                              )}
                              <span>
                                {report.createdAt ? new Date(report.createdAt).toLocaleDateString('nl-NL') : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
