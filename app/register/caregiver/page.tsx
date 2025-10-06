"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const caregiverRegistrationSchema = z.object({
  email: z.string().email({ message: "Ongeldig email adres" }),
  password: z.string().min(8, { message: "Wachtwoord moet minimaal 8 karakters bevatten" }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Naam is verplicht" }),
  phoneNumber: z.string().min(10, { message: "Telefoonnummer is verplicht" }),
  address: z.string().min(5, { message: "Adres is verplicht" }),
  bio: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
})

type CaregiverRegistrationFormValues = z.infer<typeof caregiverRegistrationSchema>

export default function CaregiverRegistrationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Get pre-filled email and invitation token from URL
  const prefilledEmail = searchParams.get("email")
  const invitationToken = searchParams.get("invitation")

  const form = useForm<CaregiverRegistrationFormValues>({
    resolver: zodResolver(caregiverRegistrationSchema),
    defaultValues: {
      email: prefilledEmail || "",
      password: "",
      confirmPassword: "",
      name: "",
      phoneNumber: "",
      address: "",
      bio: "",
    },
  })

  async function onSubmit(values: CaregiverRegistrationFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/register/caregiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          name: values.name,
          phoneNumber: values.phoneNumber,
          address: values.address,
          bio: values.bio || "",
          invitationToken: invitationToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Er is een fout opgetreden")
      }

      setSuccess(true)
      // Redirect to verification message after 2 seconds
      setTimeout(() => {
        router.push("/login?registered=true")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-green-600">Registratie Succesvol!</CardTitle>
            <CardDescription className="text-center">
              Een verificatie email is verzonden naar uw inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Controleer uw email en klik op de verificatielink om uw account te activeren.
              </p>
              {invitationToken && (
                <p className="text-sm text-green-600 font-medium">
                  Na verificatie kunt u de uitnodiging accepteren in uw dashboard.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                U wordt automatisch doorgestuurd naar de login pagina...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Registreer als Zorgverlener</CardTitle>
          <CardDescription className="text-center">
            {invitationToken
              ? "Maak een account aan om de uitnodiging te accepteren"
              : "Maak een account aan om zorg te verlenen en rapportages te maken"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {invitationToken && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
                  U registreert via een uitnodiging. Na verificatie kunt u de uitnodiging accepteren.
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volledige Naam</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Maria Jansen"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="naam@voorbeeld.nl"
                        {...field}
                        disabled={isLoading || !!prefilledEmail}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoonnummer</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="06 12345678"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Straatnaam 123, 1234AB Amsterdam"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (optioneel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Korte beschrijving over uzelf..."
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Beschrijf uw ervaring en specialisaties
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wachtwoord</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bevestig Wachtwoord</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Registreren..." : "Registreer Account"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Heeft u al een account?{" "}
              <Link href="/login" className="text-green-600 hover:underline">
                Inloggen
              </Link>
            </p>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-primary block"
            >
              ← Terug naar home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
