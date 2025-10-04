"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

export default function NewReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get("client")

  const [clients, setClients] = useState<any[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [clientId, setClientId] = useState(preselectedClient || "")
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [content, setContent] = useState("")
  const [images, setImages] = useState<(File | null)[]>([null, null, null])

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const response = await fetch("/api/my-clients")
      if (response.ok) {
        const data = await response.json()
        const activeClients = (data.clients || []).filter((c: any) => c.status === "ACTIVE")
        setClients(activeClients)
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    } finally {
      setIsLoadingClients(false)
    }
  }

  function handleImageChange(index: number, file: File | null) {
    const newImages = [...images]
    newImages[index] = file
    setImages(newImages)
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingClients) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Zorgdossier
            </h1>
            <Link href="/dashboard/reports">
              <Button variant="outline">← Terug naar Rapporten</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
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

            {clients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>U heeft nog geen actieve cliënten</p>
                <p className="text-sm mt-2">Accepteer eerst een uitnodiging om rapporten te maken</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Selection */}
                <div>
                  <Label htmlFor="client">Cliënt *</Label>
                  <select
                    id="client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Selecteer een cliënt --</option>
                    {clients.map((client) => (
                      <option key={client.clientId} value={client.clientId}>
                        {client.client.name} ({client.client.user.email})
                      </option>
                    ))}
                  </select>
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
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Rapport aanmaken..." : "Rapport Aanmaken"}
                  </Button>
                  <Link href="/dashboard/reports" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Annuleren
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
