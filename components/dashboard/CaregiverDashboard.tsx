"use client"

import { useEffect, useState } from "react"
import { User } from "@prisma/client"
import DashboardLayout from "./DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TimeOffNotificationPanel } from "@/components/dashboard/TimeOffNotificationPanel"
import { Pill, AlertTriangle, CheckCircle2, Clock, ClipboardCheck, FileText, CalendarOff, ChevronRight } from "lucide-react"

interface UserWithProfile {
  id: string
  email: string
  role: string
  caregiverProfile?: {
    name: string
  } | null
}

interface Invitation {
  id: string
  status: string
}

interface ReportData {
  id: string
  content: string
  reportDate: string
  createdAt: string
  client: {
    name: string
  }
  images?: Array<{ id: string }>
}

interface Client {
  id: string
  name: string
  email: string
}

interface DailyClientTask {
  client: { id: string; name: string }
  shift: { startTime: string; endTime: string; shiftTypeName: string; shiftTypeColor: string }
  medicatie: { summary: { total: number; given: number; skipped: number; pending: number } }
  sondevoeding: { summary: { total: number; given: number; skipped: number; pending: number } }
  verpleegtechnisch: { items: { isOverdue: boolean }[] }
  wondzorg: { items: { isOverdue: boolean }[] }
  rapportage: { count: number }
  summary: { totalTasks: number; completed: number; pending: number; overdue: number; status: "all_done" | "pending" | "overdue" }
}

interface DailyTasksData {
  date: string
  clients: DailyClientTask[]
  globalSummary: { totalTasks: number; completed: number; pending: number; overdue: number }
}

interface CaregiverDashboardProps {
  user: UserWithProfile & {
    caregiverProfile?: {
      name: string
    } | null
  }
  clients?: Client[]
}

export default function CaregiverDashboard({ user, clients }: CaregiverDashboardProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true)
  const [recentReports, setRecentReports] = useState<ReportData[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const [timeOffNotifications, setTimeOffNotifications] = useState<any[]>([])
  const [isLoadingTimeOff, setIsLoadingTimeOff] = useState(true)
  const [dailyTasks, setDailyTasks] = useState<DailyTasksData | null>(null)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)

  useEffect(() => {
    fetchInvitations()
    fetchRecentReports()
    fetchTimeOffNotifications()
    fetchDailyTasks()
  }, [])

  async function fetchInvitations() {
    try {
      const response = await fetch("/api/invitations")
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error)
    } finally {
      setIsLoadingInvitations(false)
    }
  }

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

  async function fetchTimeOffNotifications() {
    try {
      setIsLoadingTimeOff(true)

      // Fetch recent decisions (approved or denied in last 7 days)
      const response = await fetch("/api/scheduling/time-off?recent=7")

      if (response.ok) {
        const data = await response.json()
        // Filter to only show approved/denied (not pending)
        const decisions = data.filter(
          (r: any) => r.status !== "PENDING"
        )
        setTimeOffNotifications(decisions)
      }
    } catch (error) {
      console.error("Failed to fetch time-off notifications:", error)
    } finally {
      setIsLoadingTimeOff(false)
    }
  }

  async function fetchDailyTasks() {
    try {
      setIsLoadingTasks(true)
      const response = await fetch("/api/caregiver/daily-tasks")
      if (response.ok) {
        const data = await response.json()
        setDailyTasks(data)
      }
    } catch (error) {
      console.error("Failed to fetch daily tasks:", error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch("/api/scheduling/time-off", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeOffRequestId: id,
          action: "dismiss",
        }),
      })

      if (response.ok) {
        // Remove from local state for immediate UI feedback
        setTimeOffNotifications(prev => prev.filter(n => n.id !== id))
      } else {
        console.error("Failed to dismiss notification")
        alert("Er is een fout opgetreden bij het verwijderen van de notificatie")
      }
    } catch (error) {
      console.error("Failed to dismiss notification:", error)
      alert("Er is een fout opgetreden")
    }
  }

  const pendingInvitations = invitations.filter(inv => inv.status === "PENDING")

  return (
    <DashboardLayout userName={user.caregiverProfile?.name || user.email} userRole={user.role} clients={clients}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welkom terug, {user.caregiverProfile?.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Maak rapportages en bekijk uw cliënten
          </p>
        </div>

        {/* Time-Off Decision Notifications */}
        <TimeOffNotificationPanel
          role="CAREGIVER"
          notifications={timeOffNotifications}
          onDismiss={handleDismiss}
          isLoading={isLoadingTimeOff}
        />

        {/* Taken Vandaag */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Taken Vandaag
                </CardTitle>
                <CardDescription>Uw taken op basis van uw rooster vandaag</CardDescription>
              </div>
              {dailyTasks && dailyTasks.clients.length > 0 && (
                <Link href="/dashboard/mijn-taken">
                  <Button variant="outline" size="sm">
                    Bekijk Alle Taken <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTasks ? (
              <div className="text-center py-6">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : !dailyTasks || dailyTasks.clients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarOff className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p>Geen diensten vandaag</p>
                <Link href="/dashboard/mijn-rooster">
                  <Button variant="ghost" size="sm" className="mt-2">Bekijk Mijn Rooster</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {dailyTasks.clients.map((ct) => {
                  const borderColor =
                    ct.summary.status === "overdue"
                      ? "border-l-red-500"
                      : ct.summary.status === "pending"
                      ? "border-l-amber-500"
                      : "border-l-green-500"

                  return (
                    <Link key={ct.client.id} href="/dashboard/mijn-taken" className="no-underline">
                      <Card className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow cursor-pointer h-full`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2.5 h-6 rounded-full"
                              style={{ backgroundColor: ct.shift.shiftTypeColor }}
                            />
                            <h4 className="font-semibold">{ct.client.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {ct.shift.shiftTypeName} {ct.shift.startTime} - {ct.shift.endTime}
                          </p>

                          <div className="space-y-1 text-sm">
                            {ct.medicatie.summary.total > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Pill className="h-3.5 w-3.5" /> Medicatie
                                </span>
                                <span className={ct.medicatie.summary.pending > 0 ? "text-amber-600" : "text-green-600"}>
                                  {ct.medicatie.summary.given + ct.medicatie.summary.skipped}/{ct.medicatie.summary.total}
                                </span>
                              </div>
                            )}
                            {ct.sondevoeding.summary.total > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" /> Sondevoeding
                                </span>
                                <span className={ct.sondevoeding.summary.pending > 0 ? "text-amber-600" : "text-green-600"}>
                                  {ct.sondevoeding.summary.given + ct.sondevoeding.summary.skipped}/{ct.sondevoeding.summary.total}
                                </span>
                              </div>
                            )}
                            {ct.verpleegtechnisch.items.length > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <ClipboardCheck className="h-3.5 w-3.5" /> Verpleegtechnisch
                                </span>
                                <span className={ct.verpleegtechnisch.items.some(i => i.isOverdue) ? "text-red-600 font-medium" : "text-amber-600"}>
                                  {ct.verpleegtechnisch.items.filter(i => i.isOverdue).length > 0
                                    ? `${ct.verpleegtechnisch.items.filter(i => i.isOverdue).length} achterstallig`
                                    : `${ct.verpleegtechnisch.items.length} gepland`
                                  }
                                </span>
                              </div>
                            )}
                            {ct.wondzorg.items.length > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Wondzorg
                                </span>
                                <span className={ct.wondzorg.items.some(i => i.isOverdue) ? "text-red-600 font-medium" : "text-amber-600"}>
                                  {ct.wondzorg.items.length} zorgmoment{ct.wondzorg.items.length !== 1 ? "en" : ""}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <FileText className="h-3.5 w-3.5" /> Rapportage
                              </span>
                              <span className={ct.rapportage.count > 0 ? "text-green-600" : "text-amber-600"}>
                                {ct.rapportage.count > 0 ? `${ct.rapportage.count} geschreven` : "Geen rapport"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t">
                            {ct.summary.status === "all_done" && (
                              <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Alles afgerond
                              </span>
                            )}
                            {ct.summary.status === "pending" && (
                              <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {ct.summary.pending} taken open
                              </span>
                            )}
                            {ct.summary.status === "overdue" && (
                              <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> {ct.summary.overdue} achterstallig
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
                <CardDescription>Bekijk en beheer uw werkrooster</CardDescription>
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
                <CardTitle>Rapporteren</CardTitle>
                <CardDescription>Bekijk en bewerk rapportages</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/reports/new" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <CardTitle>Nieuw Rapport</CardTitle>
                <CardDescription>Maak een nieuwe zorgrapportage</CardDescription>
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
                <CardDescription>Beheer medicatie overzicht</CardDescription>
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

          <Link href="/dashboard/mijn-clienten" className="no-underline">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full relative">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                {pendingInvitations.length > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
                <CardTitle className="flex items-center gap-2">
                  Mijn Cliënten
                  {pendingInvitations.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      {pendingInvitations.length}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {pendingInvitations.length > 0
                    ? "Nieuwe uitnodigingen"
                    : "Beheer uw cliënten"}
                </CardDescription>
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
                <CardDescription>Uw laatst aangemaakte rapportages</CardDescription>
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
                <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Nog geen rapportages gemaakt</p>
                <p className="text-sm mt-2">Klik op &quot;Nieuw Rapport&quot; om te beginnen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
                    <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{report.client.name}</h4>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
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
                                {new Date(report.createdAt).toLocaleDateString('nl-NL')}
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
