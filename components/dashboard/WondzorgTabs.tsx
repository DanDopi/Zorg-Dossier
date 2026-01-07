"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WoundCarePlan {
  id: string
  dateOfOnset: string
  cause: string
  location: string
  woundType: string
  length?: number
  width?: number
  depth?: number
  woundEdges?: string
  woundBed?: string
  exudate?: string
  surroundingSkin?: string
  initialPhoto?: string
  photoDate?: string
  treatmentGoal: string
  products: string
  frequency: string
  cleaningMethod: string
  instructions?: string
  performedBy?: string
  evaluationSchedule?: string
  isActive: boolean
  startDate: string
  endDate?: string
  createdAt: string
  reports?: any[]
}

interface WoundCareReport {
  id: string
  reportDate: string
  reportTime: string
  cleaningPerformed: string
  productsUsed: string
  woundColor?: string
  woundOdor?: string
  exudateAmount?: string
  painLevel?: string
  sizeChange?: string
  edgeCondition?: string
  skinCondition?: string
  clientPain?: string
  clientComfort?: string
  clientAnxiety?: string
  complications?: string
  evaluation: string
  generalNotes?: string
  photo?: string
  photoDate?: string
  nextCareDate?: string
  caregiver: {
    name: string
  }
  woundCarePlan: {
    location: string
    woundType: string
  }
}

// Wound Care Plans Tab
export function WoundCarePlansTab({
  plans,
  isPlanDialogOpen,
  setIsPlanDialogOpen,
  editingPlan,
  setEditingPlan,
  newPlan,
  setNewPlan,
  handleAddPlan,
  handleUpdatePlan,
  handleClosePlan,
  openEditPlanDialog,
  isClient,
  isCaregiver,
}: {
  plans: WoundCarePlan[]
  isPlanDialogOpen: boolean
  setIsPlanDialogOpen: (open: boolean) => void
  editingPlan: WoundCarePlan | null
  setEditingPlan: React.Dispatch<React.SetStateAction<WoundCarePlan | null>>
  newPlan: any
  setNewPlan: React.Dispatch<React.SetStateAction<any>>
  handleAddPlan: () => void
  handleUpdatePlan: () => void
  handleClosePlan: (id: string) => void
  openEditPlanDialog: (plan: WoundCarePlan) => void
  isClient: boolean
  isCaregiver: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Wondzorgplannen</CardTitle>
            <CardDescription>Beheer algemene wondgegevens en behandelplannen</CardDescription>
          </div>
          <Dialog open={isPlanDialogOpen} onOpenChange={(open) => {
            setIsPlanDialogOpen(open)
            if (!open) {
              setEditingPlan(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button>+ Nieuw Wondzorgplan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Wondzorgplan Bewerken" : "Nieuw Wondzorgplan Aanmaken"}</DialogTitle>
                <DialogDescription>
                  Vul de algemene wondgegevens en het behandelplan in
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Deel 1: Algemene Wondgegevens */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Algemene Wondgegevens</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfOnset">Datum van Ontstaan *</Label>
                      <Input
                        id="dateOfOnset"
                        type="date"
                        value={newPlan.dateOfOnset}
                        onChange={(e) => setNewPlan({ ...newPlan, dateOfOnset: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cause">Oorzaak van de Wond *</Label>
                      <Input
                        id="cause"
                        value={newPlan.cause}
                        onChange={(e) => setNewPlan({ ...newPlan, cause: e.target.value })}
                        placeholder="Bijv. trauma, druk, operatie..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Locatie (Lichamelijke Plaats) *</Label>
                      <Input
                        id="location"
                        value={newPlan.location}
                        onChange={(e) => setNewPlan({ ...newPlan, location: e.target.value })}
                        placeholder="Bijv. rechter hiel, linker schouder..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="woundType">Type Wond *</Label>
                      <Input
                        id="woundType"
                        value={newPlan.woundType}
                        onChange={(e) => setNewPlan({ ...newPlan, woundType: e.target.value })}
                        placeholder="Bijv. decubitus, veneus ulcus..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="length">Lengte (cm)</Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.1"
                        value={newPlan.length}
                        onChange={(e) => setNewPlan({ ...newPlan, length: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="width">Breedte (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.1"
                        value={newPlan.width}
                        onChange={(e) => setNewPlan({ ...newPlan, width: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="depth">Diepte (cm)</Label>
                      <Input
                        id="depth"
                        type="number"
                        step="0.1"
                        value={newPlan.depth}
                        onChange={(e) => setNewPlan({ ...newPlan, depth: e.target.value })}
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="woundEdges">Wondranden</Label>
                    <Textarea
                      id="woundEdges"
                      value={newPlan.woundEdges}
                      onChange={(e) => setNewPlan({ ...newPlan, woundEdges: e.target.value })}
                      placeholder="Bijv. ondermijnd, rolrand, maceratie, eelt..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="woundBed">Wondbodem</Label>
                    <Textarea
                      id="woundBed"
                      value={newPlan.woundBed}
                      onChange={(e) => setNewPlan({ ...newPlan, woundBed: e.target.value })}
                      placeholder="Bijv. kleur en type weefsel: granulerend, fibrineus, necrotisch..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="exudate">Exsudaat (Wondvocht)</Label>
                    <Textarea
                      id="exudate"
                      value={newPlan.exudate}
                      onChange={(e) => setNewPlan({ ...newPlan, exudate: e.target.value })}
                      placeholder="Hoeveelheid, kleur, geur..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="surroundingSkin">Omliggende Huid</Label>
                    <Textarea
                      id="surroundingSkin"
                      value={newPlan.surroundingSkin}
                      onChange={(e) => setNewPlan({ ...newPlan, surroundingSkin: e.target.value })}
                      placeholder="Conditie: roodheid, zwelling, verweking..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Deel 2: Behandelplan / Wondbeleid */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Behandelplan / Wondbeleid</h3>

                  <div>
                    <Label htmlFor="treatmentGoal">Doel van de Behandeling *</Label>
                    <Textarea
                      id="treatmentGoal"
                      value={newPlan.treatmentGoal}
                      onChange={(e) => setNewPlan({ ...newPlan, treatmentGoal: e.target.value })}
                      placeholder="Bijv. genezing, droog houden, infectie voorkomen, comfortzorg..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="products">Wondverzorgingsproducten en Verbandmiddelen *</Label>
                    <Textarea
                      id="products"
                      value={newPlan.products}
                      onChange={(e) => setNewPlan({ ...newPlan, products: e.target.value })}
                      placeholder="Inclusief merk en frequentie..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequentie van Wondverzorging *</Label>
                    <Input
                      id="frequency"
                      value={newPlan.frequency}
                      onChange={(e) => setNewPlan({ ...newPlan, frequency: e.target.value })}
                      placeholder="Bijv. dagelijks, om de 2 dagen..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="cleaningMethod">Reinigingsmethode *</Label>
                    <Textarea
                      id="cleaningMethod"
                      value={newPlan.cleaningMethod}
                      onChange={(e) => setNewPlan({ ...newPlan, cleaningMethod: e.target.value })}
                      placeholder="Bijv. NaCl, spoeling, antisepticum..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="instructions">Specifieke Instructies</Label>
                    <Textarea
                      id="instructions"
                      value={newPlan.instructions}
                      onChange={(e) => setNewPlan({ ...newPlan, instructions: e.target.value })}
                      placeholder="Bijv. drukontlasting, wisselhouding, voeding..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="performedBy">Uitgevoerd Door</Label>
                    <Input
                      id="performedBy"
                      value={newPlan.performedBy}
                      onChange={(e) => setNewPlan({ ...newPlan, performedBy: e.target.value })}
                      placeholder="Bijv. verpleegkundige, verzorgende, wondconsulent..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="evaluationSchedule">Evaluatie Planning</Label>
                    <Input
                      id="evaluationSchedule"
                      value={newPlan.evaluationSchedule}
                      onChange={(e) => setNewPlan({ ...newPlan, evaluationSchedule: e.target.value })}
                      placeholder="Wanneer en door wie evaluatie..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={editingPlan ? handleUpdatePlan : handleAddPlan} className="flex-1">
                  {editingPlan ? "Bijwerken" : "Aanmaken"}
                </Button>
                <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)} className="flex-1">
                  Annuleren
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nog geen wondzorgplannen aangemaakt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={`border-l-4 ${plan.isActive ? 'border-l-rose-500' : 'border-l-gray-400'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{plan.location} - {plan.woundType}</h3>
                        {!plan.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">Afgesloten</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="font-medium">Ontstaan:</span> {new Date(plan.dateOfOnset).toLocaleDateString('nl-NL')}
                        </div>
                        <div>
                          <span className="font-medium">Oorzaak:</span> {plan.cause}
                        </div>
                        {(plan.length || plan.width || plan.depth) && (
                          <div>
                            <span className="font-medium">Afmetingen:</span> {plan.length || '-'} x {plan.width || '-'} x {plan.depth || '-'} cm
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Frequentie:</span> {plan.frequency}
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">Behandeldoel:</span>
                        <p className="text-muted-foreground mt-1">{plan.treatmentGoal}</p>
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">Producten:</span>
                        <p className="text-muted-foreground mt-1">{plan.products}</p>
                      </div>

                      {plan.reports && plan.reports.length > 0 && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Laatste rapportage: {new Date(plan.reports[0].reportDate).toLocaleDateString('nl-NL')} - {plan.reports[0].evaluation}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditPlanDialog(plan)}
                      >
                        Bewerken
                      </Button>
                      {plan.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleClosePlan(plan.id)}
                        >
                          Afsluiten
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Wound Care Reports Tab
export function WoundCareReportsTab({
  reports,
  woundCarePlans,
  selectedPlanId,
  isReportDialogOpen,
  setIsReportDialogOpen,
  newReport,
  setNewReport,
  handleAddReport,
  selectedDate,
  isCaregiver,
}: {
  reports: WoundCareReport[]
  woundCarePlans: WoundCarePlan[]
  selectedPlanId: string
  isReportDialogOpen: boolean
  setIsReportDialogOpen: (open: boolean) => void
  newReport: any
  setNewReport: React.Dispatch<React.SetStateAction<any>>
  handleAddReport: () => void
  selectedDate: string
  isCaregiver: boolean
}) {
  const isFutureDate = selectedDate > new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dagelijkse Wondrapportages</CardTitle>
            <CardDescription>Registreer observaties bij elke wondverzorging</CardDescription>
          </div>
          {isCaregiver && woundCarePlans.length > 0 && (
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isFutureDate || !selectedPlanId}>+ Rapportage Toevoegen</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nieuwe Wondrapportage</DialogTitle>
                  <DialogDescription>
                    Registreer de wondverzorging voor {new Date(selectedDate).toLocaleDateString('nl-NL')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="woundCarePlanId">Wondplan *</Label>
                      <Select
                        value={newReport.woundCarePlanId}
                        onValueChange={(value) => setNewReport({ ...newReport, woundCarePlanId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer wondplan" />
                        </SelectTrigger>
                        <SelectContent>
                          {woundCarePlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.location} - {plan.woundType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reportTime">Tijd *</Label>
                      <Input
                        id="reportTime"
                        type="time"
                        value={newReport.time}
                        onChange={(e) => setNewReport({ ...newReport, time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Care Performed */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">Uitgevoerde Zorg</h3>
                    <div>
                      <Label htmlFor="cleaningPerformed">Reiniging Uitgevoerd *</Label>
                      <Textarea
                        id="cleaningPerformed"
                        value={newReport.cleaningPerformed}
                        onChange={(e) => setNewReport({ ...newReport, cleaningPerformed: e.target.value })}
                        placeholder="Hoe en waarmee is gereinigd..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="productsUsed">Gebruikte Verbandmiddelen *</Label>
                      <Textarea
                        id="productsUsed"
                        value={newReport.productsUsed}
                        onChange={(e) => setNewReport({ ...newReport, productsUsed: e.target.value })}
                        placeholder="Welke verbandmiddelen zijn gebruikt..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">Observaties van de Wond</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="woundColor">Kleur</Label>
                        <Input
                          id="woundColor"
                          value={newReport.woundColor}
                          onChange={(e) => setNewReport({ ...newReport, woundColor: e.target.value })}
                          placeholder="Bijv. roze, rood, geel..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="woundOdor">Geur</Label>
                        <Input
                          id="woundOdor"
                          value={newReport.woundOdor}
                          onChange={(e) => setNewReport({ ...newReport, woundOdor: e.target.value })}
                          placeholder="Bijv. geen, licht, sterk..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="exudateAmount">Hoeveelheid Wondvocht</Label>
                        <Input
                          id="exudateAmount"
                          value={newReport.exudateAmount}
                          onChange={(e) => setNewReport({ ...newReport, exudateAmount: e.target.value })}
                          placeholder="Bijv. weinig, matig, veel..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="painLevel">Pijn Niveau</Label>
                        <Input
                          id="painLevel"
                          value={newReport.painLevel}
                          onChange={(e) => setNewReport({ ...newReport, painLevel: e.target.value })}
                          placeholder="Bijv. geen, licht, matig, ernstig..."
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="sizeChange">Verandering in Grootte</Label>
                      <Textarea
                        id="sizeChange"
                        value={newReport.sizeChange}
                        onChange={(e) => setNewReport({ ...newReport, sizeChange: e.target.value })}
                        placeholder="Is de wond groter, kleiner of gelijk gebleven..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edgeCondition">Conditie Wondranden</Label>
                      <Textarea
                        id="edgeCondition"
                        value={newReport.edgeCondition}
                        onChange={(e) => setNewReport({ ...newReport, edgeCondition: e.target.value })}
                        placeholder="Conditie van de wondranden..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="skinCondition">Conditie Omliggende Huid</Label>
                      <Textarea
                        id="skinCondition"
                        value={newReport.skinCondition}
                        onChange={(e) => setNewReport({ ...newReport, skinCondition: e.target.value })}
                        placeholder="Conditie van de huid rondom de wond..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Client Reaction */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">Reactie Cliënt</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="clientPain">Pijn</Label>
                        <Input
                          id="clientPain"
                          value={newReport.clientPain}
                          onChange={(e) => setNewReport({ ...newReport, clientPain: e.target.value })}
                          placeholder="Pijn ervaring..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientComfort">Comfort</Label>
                        <Input
                          id="clientComfort"
                          value={newReport.clientComfort}
                          onChange={(e) => setNewReport({ ...newReport, clientComfort: e.target.value })}
                          placeholder="Comfort niveau..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientAnxiety">Angst</Label>
                        <Input
                          id="clientAnxiety"
                          value={newReport.clientAnxiety}
                          onChange={(e) => setNewReport({ ...newReport, clientAnxiety: e.target.value })}
                          placeholder="Angst niveau..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Complications and Evaluation */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="complications">Complicaties</Label>
                      <Textarea
                        id="complications"
                        value={newReport.complications}
                        onChange={(e) => setNewReport({ ...newReport, complications: e.target.value })}
                        placeholder="Bloeding, lekkage, los verband, tekenen van infectie..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="evaluation">Evaluatie *</Label>
                      <Select
                        value={newReport.evaluation}
                        onValueChange={(value) => setNewReport({ ...newReport, evaluation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer evaluatie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verbetering">Verbetering</SelectItem>
                          <SelectItem value="stabiel">Stabiel</SelectItem>
                          <SelectItem value="verslechtering">Verslechtering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="generalNotes">Algemene Notities</Label>
                      <Textarea
                        id="generalNotes"
                        value={newReport.generalNotes}
                        onChange={(e) => setNewReport({ ...newReport, generalNotes: e.target.value })}
                        placeholder="Overige opmerkingen..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nextCareDate">Datum Volgende Wondverzorging</Label>
                      <Input
                        id="nextCareDate"
                        type="date"
                        value={newReport.nextCareDate}
                        onChange={(e) => setNewReport({ ...newReport, nextCareDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAddReport} className="flex-1">Opslaan</Button>
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} className="flex-1">Annuleren</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedPlanId ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Selecteer eerst een wondplan om rapportages te bekijken</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Geen rapportages voor deze dag</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="border-l-4 border-l-rose-500">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {new Date(report.reportTime).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          report.evaluation === 'verbetering' ? 'bg-green-100 text-green-700' :
                          report.evaluation === 'stabiel' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {report.evaluation}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">Door: {report.caregiver.name}</span>
                    </div>

                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium">Reiniging:</span> {report.cleaningPerformed}
                      </div>
                      <div>
                        <span className="font-medium">Verbandmiddelen:</span> {report.productsUsed}
                      </div>
                      {report.woundColor && (
                        <div>
                          <span className="font-medium">Kleur:</span> {report.woundColor}
                        </div>
                      )}
                      {report.exudateAmount && (
                        <div>
                          <span className="font-medium">Wondvocht:</span> {report.exudateAmount}
                        </div>
                      )}
                      {report.painLevel && (
                        <div>
                          <span className="font-medium">Pijn:</span> {report.painLevel}
                        </div>
                      )}
                      {report.complications && (
                        <div className="text-red-600">
                          <span className="font-medium">Complicaties:</span> {report.complications}
                        </div>
                      )}
                      {report.generalNotes && (
                        <div className="italic text-muted-foreground">
                          💭 {report.generalNotes}
                        </div>
                      )}
                      {report.nextCareDate && (
                        <div>
                          <span className="font-medium">Volgende verzorging:</span> {new Date(report.nextCareDate).toLocaleDateString('nl-NL')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
