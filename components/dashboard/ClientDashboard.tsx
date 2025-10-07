"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "./DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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

  useEffect(() => {
    fetchRecentReports()
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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <CardTitle>Zorgrapportages</CardTitle>
              <CardDescription>Bekijk alle rapportages van uw zorgverleners</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/reports">
                <Button className="w-full">Bekijk Rapporten</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle>Mijn Zorgverleners</CardTitle>
              <CardDescription>Beheer uw zorgverlenende team</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/team">
                <Button className="w-full" variant="outline">Bekijk Team</Button>
              </Link>
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
              <CardDescription>Nodig een nieuwe zorgverlener uit</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/invite-caregiver">
                <Button className="w-full" variant="outline">Verstuur Uitnodiging</Button>
              </Link>
            </CardContent>
          </Card>
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
