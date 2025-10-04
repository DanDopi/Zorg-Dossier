"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"

const clientProfileSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  dateOfBirth: z.string().min(1, "Geboortedatum is verplicht"),
  address: z.string().min(5, "Adres is verplicht"),
})

const caregiverProfileSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  phoneNumber: z.string().min(10, "Telefoonnummer is verplicht"),
  address: z.string().min(5, "Adres is verplicht"),
  bio: z.string().optional(),
})

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isClient = user?.role === "CLIENT"
  const isCaregiver = user?.role === "CAREGIVER"

  const form = useForm({
    resolver: zodResolver(isClient ? clientProfileSchema : caregiverProfileSchema),
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const response = await fetch("/api/profile")
      if (!response.ok) throw new Error("Kon profiel niet laden")

      const data = await response.json()
      setUser(data)

      // Set form values
      if (data.role === "CLIENT" && data.clientProfile) {
        form.reset({
          name: data.clientProfile.name,
          dateOfBirth: new Date(data.clientProfile.dateOfBirth).toISOString().split('T')[0],
          address: data.clientProfile.address,
        })
      } else if (data.role === "CAREGIVER" && data.caregiverProfile) {
        form.reset({
          name: data.caregiverProfile.name,
          phoneNumber: data.caregiverProfile.phoneNumber,
          address: data.caregiverProfile.address,
          bio: data.caregiverProfile.bio || "",
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: any) {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kon profiel niet bijwerken")
      }

      setSuccess(true)
      setIsEditing(false)
      await fetchProfile()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Profiel laden...</p>
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
            <Link href="/dashboard">
              <Button variant="outline">← Terug naar Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Mijn Profiel</CardTitle>
                <CardDescription>
                  {isClient && "Uw persoonlijke gegevens als cliënt"}
                  {isCaregiver && "Uw persoonlijke gegevens als zorgverlener"}
                  {!isClient && !isCaregiver && "Uw profiel informatie"}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                  Bewerken
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm mb-4">
                Profiel succesvol bijgewerkt!
              </div>
            )}

            {!isEditing ? (
              // View Mode
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-lg">{user?.email}</p>
                </div>

                {isClient && user?.clientProfile && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Naam</Label>
                      <p className="text-lg">{user.clientProfile.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Geboortedatum</Label>
                      <p className="text-lg">
                        {new Date(user.clientProfile.dateOfBirth).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Adres</Label>
                      <p className="text-lg">{user.clientProfile.address}</p>
                    </div>
                  </>
                )}

                {isCaregiver && user?.caregiverProfile && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Naam</Label>
                      <p className="text-lg">{user.caregiverProfile.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Telefoonnummer</Label>
                      <p className="text-lg">{user.caregiverProfile.phoneNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Adres</Label>
                      <p className="text-lg">{user.caregiverProfile.address}</p>
                    </div>
                    {user.caregiverProfile.bio && (
                      <div>
                        <Label className="text-muted-foreground">Bio</Label>
                        <p className="text-lg">{user.caregiverProfile.bio}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Edit Mode
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email} disabled className="bg-gray-100" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email adres kan niet worden gewijzigd
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Naam</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isClient && (
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geboortedatum</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {isCaregiver && (
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefoonnummer</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adres</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isCaregiver && (
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio (optioneel)</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Opslaan..." : "Opslaan"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setError(null)
                        fetchProfile()
                      }}
                      disabled={isSaving}
                    >
                      Annuleren
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
