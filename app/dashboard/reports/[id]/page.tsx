"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface ReportImage {
  id: string
  fileName: string
}

interface Report {
  id: string
  content: string
  reportDate: string
  createdAt: string
  updatedAt: string
  client: {
    name: string
    user: {
      email: string
    }
  }
  caregiver: {
    name: string
    user: {
      email: string
    }
  }
  images: ReportImage[]
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<Report | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [viewerRole, setViewerRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit form state
  const [editContent, setEditContent] = useState("")
  const [editReportDate, setEditReportDate] = useState("")
  const [newImages, setNewImages] = useState<(File | null)[]>([null, null, null])
  const [deleteExistingImages, setDeleteExistingImages] = useState(false)

  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [reportId])

  async function fetchReport() {
    try {
      const response = await fetch(`/api/reports/${reportId}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kon rapport niet laden")
      }

      const data = await response.json()
      setReport(data.report)
      setCanEdit(data.canEdit || false)
      setViewerRole(data.viewerRole || "")
      setEditContent(data.report.content)
      setEditReportDate(new Date(data.report.reportDate).toISOString().split('T')[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon rapport niet laden')
    } finally {
      setIsLoading(false)
    }
  }

  function handleImageChange(index: number, file: File | null) {
    const updated = [...newImages]
    updated[index] = file
    setNewImages(updated)
  }

  function removeNewImage(index: number) {
    const updated = [...newImages]
    updated[index] = null
    setNewImages(updated)

    // Reset the file input
    const input = document.getElementById(`newImage${index}`) as HTMLInputElement
    if (input) {
      input.value = ''
    }
  }

  async function handleSaveEdit() {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const formData = new FormData()
      formData.append("content", editContent)
      formData.append("reportDate", editReportDate)
      formData.append("deleteExistingImages", deleteExistingImages.toString())

      // Add new images
      newImages.forEach((image, index) => {
        if (image) {
          formData.append(`image${index}`, image)
        }
      })

      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Kon rapport niet bijwerken")
      }

      setSuccess("✅ Rapport succesvol bijgewerkt")
      setReport(data.report)
      setIsEditing(false)
      setNewImages([null, null, null])
      setDeleteExistingImages(false)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon rapport niet bijwerken')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setIsEditing(false)
    if (report) {
      setEditContent(report.content)
      setEditReportDate(new Date(report.reportDate).toISOString().split('T')[0])
    }
    setNewImages([null, null, null])
    setDeleteExistingImages(false)
    setError(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Rapport laden...</p>
        </div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <p className="text-lg font-semibold mb-2">Fout bij laden rapport</p>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/dashboard/reports">
                <Button>← Terug naar Rapporten</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCaregiver = viewerRole === "CAREGIVER"

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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm mb-4">
            {success}
          </div>
        )}

        {error && report && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {report && (<Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">Zorgrapport</CardTitle>
                <CardDescription>
                  {isCaregiver ? `Voor ${report?.client.name}` : `Door ${report?.caregiver.name}`}
                </CardDescription>
              </div>
              {canEdit && !isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  ✏️ Bewerken
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <>
                {/* Report Metadata */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        {isCaregiver ? "Cliënt" : "Zorgverlener"}
                      </p>
                      <p className="text-base">
                        {isCaregiver ? report.client.name : report.caregiver.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        📧 {isCaregiver ? report.client.user.email : report.caregiver.user.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Rapportdatum</p>
                      <p className="text-base">
                        {new Date(report.reportDate).toLocaleDateString('nl-NL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Aangemaakt</p>
                      <p className="text-base">
                        {new Date(report.createdAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {report.updatedAt && new Date(report.updatedAt).getTime() !== new Date(report.createdAt).getTime() && (
                      <div>
                        <p className="text-sm font-semibold text-gray-600">Laatst bijgewerkt</p>
                        <p className="text-base">
                          {new Date(report.updatedAt).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Content */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Rapportage</h3>
                  <div className="bg-white border rounded-lg p-4 whitespace-pre-wrap">
                    {report.content}
                  </div>
                </div>

                {/* Images */}
                {report.images && report.images.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Afbeeldingen</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {report.images.map((image) => (
                        <div
                          key={image.id}
                          className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedImage(image.id)}
                        >
                          <img
                            src={`/api/reports/images/${image.id}`}
                            alt={image.fileName}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-2 bg-gray-50">
                            <p className="text-xs text-muted-foreground truncate">
                              {image.fileName}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Edit Form */}
                <div className="space-y-6">
                  {/* Report Date */}
                  <div>
                    <Label htmlFor="editReportDate">Rapportdatum *</Label>
                    <Input
                      id="editReportDate"
                      type="date"
                      value={editReportDate}
                      onChange={(e) => setEditReportDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="mt-2"
                      required
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <Label htmlFor="editContent">Rapportage *</Label>
                    <Textarea
                      id="editContent"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Beschrijf de zorg die u heeft verleend, observaties, bijzonderheden, etc."
                      className="mt-2 min-h-[200px]"
                      required
                    />
                  </div>

                  {/* Existing Images */}
                  {report.images && report.images.length > 0 && (
                    <div>
                      <Label>Huidige Afbeeldingen</Label>
                      <div className="grid md:grid-cols-3 gap-4 mt-2 mb-3">
                        {report.images.map((image) => (
                          <div key={image.id} className="border rounded-lg overflow-hidden">
                            <img
                              src={`/api/reports/images/${image.id}`}
                              alt={image.fileName}
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 bg-gray-50">
                              <p className="text-xs text-muted-foreground truncate">
                                {image.fileName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="deleteExistingImages"
                          checked={deleteExistingImages}
                          onChange={(e) => setDeleteExistingImages(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="deleteExistingImages" className="cursor-pointer">
                          Verwijder bestaande afbeeldingen
                        </Label>
                      </div>
                    </div>
                  )}

                  {/* New Images */}
                  <div>
                    <Label>Nieuwe Afbeeldingen Toevoegen (optioneel, max 3)</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      U kunt tot 3 nieuwe afbeeldingen uploaden (max 5MB per afbeelding)
                    </p>

                    <div className="space-y-3">
                      {newImages.map((image, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor={`newImage${index}`}>Afbeelding {index + 1}</Label>
                            {image && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeNewImage(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Verwijderen
                              </Button>
                            )}
                          </div>
                          <Input
                            id={`newImage${index}`}
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

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={handleSaveEdit} disabled={isSaving} className="flex-1">
                      {isSaving ? "Opslaan..." : "Wijzigingen Opslaan"}
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" className="flex-1" disabled={isSaving}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>)}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300"
            >
              ✕
            </button>
            <img
              src={`/api/reports/images/${selectedImage}`}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
