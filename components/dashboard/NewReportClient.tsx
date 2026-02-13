"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClient } from "@/lib/ClientContext"
import { compressImage } from "@/lib/imageCompression"

interface Client {
  client: {
    id: string
    name: string
    user: {
      email: string
    }
  }
  status: string
}

interface NewReportClientProps {
  activeClients: Client[]
}

export default function NewReportClient({ activeClients }: NewReportClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedClient: globalSelectedClient, setSelectedClient } = useClient()

  // URL parameter takes priority, then global context, then empty
  const preselectedClient = searchParams.get("client") || globalSelectedClient?.id || ""
  const preselectedDate = searchParams.get("date") || new Date().toISOString().split('T')[0]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [clientId, setClientId] = useState(preselectedClient)
  const [reportDate, setReportDate] = useState(preselectedDate)
  const [content, setContent] = useState("")
  const [images, setImages] = useState<(File | null)[]>([null, null, null])
  const [isCompressing, setIsCompressing] = useState(false)

  // Shift validation
  const [hasShift, setHasShift] = useState<boolean | null>(null)
  const [checkingShift, setCheckingShift] = useState(false)

  // Update clientId when global context changes (if no URL param)
  useEffect(() => {
    if (!searchParams.get("client") && globalSelectedClient?.id) {
      setClientId(globalSelectedClient.id)
    }
  }, [globalSelectedClient, searchParams])

  // Check if caregiver has a shift on selected date for selected client
  useEffect(() => {
    if (!clientId || !reportDate) {
      setHasShift(null)
      return
    }

    async function checkShift() {
      setCheckingShift(true)
      try {
        const res = await fetch(`/api/shifts/check?clientId=${clientId}&date=${reportDate}`)
        const data = await res.json()
        setHasShift(data.hasShift)
      } catch {
        setHasShift(null)
      } finally {
        setCheckingShift(false)
      }
    }
    checkShift()
  }, [clientId, reportDate])

  async function handleImageChange(index: number, file: File | null) {
    if (!file) {
      const newImages = [...images]
      newImages[index] = null
      setImages(newImages)
      return
    }

    setIsCompressing(true)
    try {
      const result = await compressImage(file)
      const newImages = [...images]
      newImages[index] = result.file
      setImages(newImages)
    } catch {
      alert('Kon afbeelding niet verwerken. Probeer een ander bestand.')
    } finally {
      setIsCompressing(false)
    }
  }

  function removeImage(index: number) {
    const newImages = [...images]
    newImages[index] = null
    setImages(newImages)

    // Reset the file input
    const input = document.getElementById(`image${index}`) as HTMLInputElement
    if (input) {
      input.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId || !reportDate || !content.trim()) {
      setError("Vul alle verplichte velden in")
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("clientId", clientId)
      formData.append("reportDate", reportDate)
      formData.append("content", content)

      // Add images
      images.forEach((image, index) => {
        if (image) {
          formData.append(`image${index}`, image)
        }
      })

      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kon rapport niet aanmaken")
      }

      // Redirect to reports list
      router.push("/dashboard/reports")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle client change - updates both local state and global context
  function handleClientChange(newClientId: string) {
    setClientId(newClientId)

    // Update global context
    const selectedClientData = activeClients.find(c => c.client.id === newClientId)
    if (selectedClientData) {
      setSelectedClient({
        id: selectedClientData.client.id,
        name: selectedClientData.client.name,
        email: selectedClientData.client.user.email
      })
    }
  }

  // Get the selected client name for display
  const selectedClientName = activeClients.find(c => c.client.id === clientId)?.client.name

  return (
    <div className="space-y-6">
      <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Nieuw Zorgrapport</CardTitle>
            <CardDescription>
              Maak een dagelijks zorgrapport voor een cliënt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            {activeClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>U heeft nog geen actieve cliënten</p>
                <p className="text-sm mt-2">Accepteer eerst een uitnodiging om rapporten te maken</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Selection - Editable, updates global context */}
                <div>
                  <Label htmlFor="client">Cliënt *</Label>
                  <Select value={clientId} onValueChange={handleClientChange}>
                    <SelectTrigger className="mt-2 bg-blue-50 border-2 border-blue-200 text-blue-900 font-semibold hover:bg-blue-100">
                      <SelectValue placeholder="Selecteer een cliënt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeClients.map((clientRel) => (
                        <SelectItem key={clientRel.client.id} value={clientRel.client.id}>
                          {clientRel.client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-700 mt-1">
                    Wijzigingen hier worden ook toegepast op de global selector
                  </p>
                </div>

                {/* Report Date */}
                <div>
                  <Label htmlFor="reportDate">Rapportdatum *</Label>
                  <Input
                    id="reportDate"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-2"
                    required
                  />
                  {checkingShift && (
                    <p className="text-sm text-muted-foreground mt-1">Dienst controleren...</p>
                  )}
                  {hasShift === false && !checkingShift && (
                    <p className="text-sm text-red-600 mt-1">
                      U heeft geen dienst op deze datum voor deze cli&euml;nt. Kies een datum waarop u wel een dienst heeft.
                    </p>
                  )}
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content">Rapportage *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Beschrijf de zorg die u heeft verleend, observaties, bijzonderheden, etc."
                    className="mt-2 min-h-[200px]"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Beschrijf wat u heeft gedaan, hoe de cliënt zich voelde, bijzonderheden, etc.
                  </p>
                </div>

                {/* Images */}
                <div>
                  <Label>Afbeeldingen (optioneel, max 3)</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    U kunt tot 3 afbeeldingen uploaden (max 5MB per afbeelding)
                  </p>

                  <div className="space-y-3">
                    {images.map((image, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor={`image${index}`}>Afbeelding {index + 1}</Label>
                          {image && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeImage(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Verwijderen
                            </Button>
                          )}
                        </div>
                        <Input
                          id={`image${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(index, e.target.files?.[0] || null)}
                          className="mt-1"
                        />
                        {image && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {image.name} ({(image.size / 1024).toFixed(0)} KB)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button type="submit" disabled={isSubmitting || isCompressing || hasShift === false || checkingShift} className="flex-1">
                    {checkingShift ? "Dienst controleren..." : isCompressing ? "Afbeelding comprimeren..." : isSubmitting ? "Rapport aanmaken..." : "Rapport Aanmaken"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/rapporteren")}
                    className="flex-1"
                  >
                    Annuleren
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
