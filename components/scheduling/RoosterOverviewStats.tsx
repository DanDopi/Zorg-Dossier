"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { nl } from "date-fns/locale"
import { Loader2 } from "lucide-react"

interface OverviewStatsResponse {
  period: {
    startDate: string
    endDate: string
  }
  overallStats: {
    totalShifts: number
    filledShifts: number
    unfilledShifts: number
    completedShifts: number
    cancelledShifts: number
    fillRate: number
    completionRate: number
  }
  unfilledShiftsList: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    shiftType: {
      id: string
      name: string
      color: string
    }
    status: string
  }>
  unfilledDatesList: Array<{
    date: string
    unfilledCount: number
    totalShifts: number
  }>
  caregiverStats: Array<{
    caregiverId: string
    caregiverName: string
    caregiverColor: string | null
    totalShifts: number
    totalHours: number
    completedShifts: number
    cancelledShifts: number
    averageHoursPerWeek: number
    sicknessPercentage: number
    sickDaysCount: number
  }>
}

interface RoosterOverviewStatsProps {
  clientId: string
}

export default function RoosterOverviewStats({ clientId }: RoosterOverviewStatsProps) {
  const [stats, setStats] = useState<OverviewStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [clientId])

  async function fetchStats() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/scheduling/overview-stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        setError('Kon statistieken niet laden')
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardDescription>Laden...</CardDescription>
                <CardTitle className="text-3xl">-</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-3 text-muted-foreground">Statistieken worden geladen...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchStats} variant="outline">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Rooster Statistieken</h3>
        <p className="text-sm text-muted-foreground">
          Periode: {format(new Date(stats.period.startDate), 'd MMMM yyyy', { locale: nl })} -{' '}
          {format(new Date(stats.period.endDate), 'd MMMM yyyy', { locale: nl })}
        </p>
      </div>

      {/* Overall Coverage Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totaal Diensten</CardDescription>
            <CardTitle className="text-3xl">{stats.overallStats.totalShifts}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Komende 12 maanden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gevuld</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {stats.overallStats.filledShifts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Toegewezen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ongepland</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.overallStats.unfilledShifts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Nog in te vullen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bezettingsgraad</CardDescription>
            <CardTitle className="text-3xl">
              {stats.overallStats.fillRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.overallStats.filledShifts} / {stats.overallStats.totalShifts}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Voltooiingsgraad</CardDescription>
            <CardTitle className="text-3xl">
              {stats.overallStats.completionRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.overallStats.completedShifts} voltooid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Metrics: Unfilled Shifts & Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Unfilled Shifts List */}
        <Card>
          <CardHeader>
            <CardTitle>Ongeplande Diensten</CardTitle>
            <CardDescription>
              {stats.unfilledShiftsList.length} diensten zonder zorgverlener
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.unfilledShiftsList.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                ✓ Alle diensten zijn ingepland
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.unfilledShiftsList.map(shift => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded border border-orange-200"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(shift.date), 'd MMMM yyyy', { locale: nl })}
                      </p>
                      <p className="text-xs text-muted-foreground">{shift.shiftType.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unfilled Dates List */}
        <Card>
          <CardHeader>
            <CardTitle>Dagen met Gaten</CardTitle>
            <CardDescription>
              {stats.unfilledDatesList.length} dagen met gedeeltelijke bezetting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.unfilledDatesList.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                ✓ Alle dagen zijn volledig ingepland
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.unfilledDatesList.map(dateInfo => (
                  <div
                    key={dateInfo.date}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(dateInfo.date), 'EEEE d MMMM yyyy', { locale: nl })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="font-semibold text-orange-600">
                          {dateInfo.unfilledCount}
                        </span>
                        {' / '}
                        <span className="text-muted-foreground">{dateInfo.totalShifts}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">ongepland</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Caregiver Workload & Health */}
      <Card>
        <CardHeader>
          <CardTitle>Zorgverlener Werkbelasting & Gezondheid</CardTitle>
          <CardDescription>
            Overzicht van alle zorgverleners over de komende 12 maanden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.caregiverStats.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Geen zorgverlener data beschikbaar
            </p>
          ) : (
            <div className="space-y-4">
              {stats.caregiverStats.map(caregiver => (
                <div key={caregiver.caregiverId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          backgroundColor: caregiver.caregiverColor || '#9CA3AF',
                        }}
                      >
                        {caregiver.caregiverName
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{caregiver.caregiverName}</p>
                        <p className="text-sm text-muted-foreground">
                          {caregiver.totalShifts} diensten • {caregiver.totalHours} uur
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Gem. {caregiver.averageHoursPerWeek} uur/week
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{caregiver.totalShifts}</p>
                      <p className="text-xs text-muted-foreground">Totaal Diensten</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {caregiver.completedShifts}
                      </p>
                      <p className="text-xs text-muted-foreground">Voltooid</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {caregiver.sickDaysCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Ziekdagen</p>
                    </div>
                    <div>
                      <p
                        className={`text-2xl font-bold ${
                          caregiver.sicknessPercentage > 10
                            ? 'text-red-600'
                            : caregiver.sicknessPercentage > 5
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      >
                        {caregiver.sicknessPercentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">Ziekteverzuim</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
