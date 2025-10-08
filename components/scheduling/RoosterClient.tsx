"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ScheduleCalendar from "./ScheduleCalendar"
import ShiftAssignmentModal from "./ShiftAssignmentModal"
import CreateShiftDialog from "./CreateShiftDialog"
import TimeOffManagement from "./TimeOffManagement"
import Link from "next/link"
import { Settings, Plus, Repeat } from "lucide-react"

interface Caregiver {
  id: string
  name: string
  color?: string | null
}

interface ShiftType {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

interface Shift {
  id: string
  date: Date
  startTime: string
  endTime: string
  status: string
  internalNotes?: string | null
  instructionNotes?: string | null
  shiftType: {
    id: string
    name: string
  }
  caregiver?: {
    id: string
    name: string
  } | null
}

interface RoosterClientProps {
  clientId: string
  caregivers: Caregiver[]
  shiftTypes: ShiftType[]
}

export default function RoosterClient({
  clientId,
  caregivers,
  shiftTypes,
}: RoosterClientProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift)
    setIsModalOpen(true)
  }

  const handleShiftSave = () => {
    setRefreshKey((prev) => prev + 1)
    setIsModalOpen(false)
    setSelectedShift(null)
  }

  const handleCreateShift = () => {
    setRefreshKey((prev) => prev + 1)
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rooster Beheer</h1>
          <p className="text-muted-foreground mt-2">
            Bekijk en beheer het rooster van uw zorgverleners
          </p>
        </div>
        <div className="flex gap-2">
          {shiftTypes.length > 0 && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Dienst Aanmaken
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard/rooster/patterns">
              <Repeat className="mr-2 h-4 w-4" />
              Patronen
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/rooster/shift-types">
              <Settings className="mr-2 h-4 w-4" />
              Diensttypes
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actieve Zorgverleners</CardDescription>
            <CardTitle className="text-3xl">{caregivers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Diensttypes</CardDescription>
            <CardTitle className="text-3xl">{shiftTypes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-xl text-green-600">Actief</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
          <TabsTrigger value="timeoff">Verlofaanvragen</TabsTrigger>
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {shiftTypes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  U heeft nog geen diensttypes aangemaakt
                </p>
                <Button asChild>
                  <Link href="/dashboard/rooster/shift-types">
                    <Plus className="mr-2 h-4 w-4" />
                    Eerste Diensttype Aanmaken
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScheduleCalendar
              key={refreshKey}
              clientId={clientId}
              onShiftClick={handleShiftClick}
            />
          )}
        </TabsContent>

        <TabsContent value="timeoff">
          <TimeOffManagement clientId={clientId} />
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Rooster Overzicht</CardTitle>
              <CardDescription>
                Statistieken en overzicht van uw rooster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Zorgverleners</h3>
                  <div className="space-y-2">
                    {caregivers.map((caregiver) => (
                      <div
                        key={caregiver.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{
                            backgroundColor: caregiver.color || "#9CA3AF",
                          }}
                        >
                          {caregiver.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span>{caregiver.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {caregivers.length === 0 && (
                  <p className="text-muted-foreground">
                    U heeft nog geen zorgverleners uitgenodigd.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <CreateShiftDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreateShift}
        clientId={clientId}
        shiftTypes={shiftTypes}
        caregivers={caregivers}
      />

      {/* Shift Assignment Modal */}
      {selectedShift && (
        <ShiftAssignmentModal
          shift={selectedShift}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedShift(null)
          }}
          onSave={handleShiftSave}
          availableCaregivers={caregivers}
        />
      )}
    </div>
  )
}
