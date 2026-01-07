"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().email({ message: "Ongeldig email adres" }),
  password: z.string().min(1, { message: "Wachtwoord is verplicht" }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Er is een fout opgetreden. Probeer het opnieuw.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welkom terug</CardTitle>
          <CardDescription className="text-center">
            Log in op uw Zorgdossier account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {reason === 'inactivity' && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                  <p className="font-medium">Sessie verlopen</p>
                  <p className="mt-1">U bent automatisch uitgelogd vanwege inactiviteit.</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

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
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Wachtwoord</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Wachtwoord vergeten?
                      </Link>
                    </div>
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
                {isLoading ? "Inloggen..." : "Inloggen"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Nog geen account?
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/register/client">
                <Button variant="outline" className="w-full">
                  Cliënt
                </Button>
              </Link>
              <Link href="/register/caregiver">
                <Button variant="outline" className="w-full">
                  Zorgverlener
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                ← Terug naar home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
